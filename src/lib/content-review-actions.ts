"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertNotAdminPreviewMode } from "./admin-preview";
import { requireRole } from "./auth";
import { contentBelongsToPlanningPeriod } from "./content-planning-export";
import {
  CONTENT_REVIEW_ASSETS_BUCKET,
  CONTENT_REVIEW_ASSET_MAX_BYTES,
  CONTENT_REVIEW_TOTAL_MAX_BYTES,
  contentReviewPublicPath,
  isContentReviewAssetMimeType,
  isValidContentReviewToken,
  type ContentReviewBuilderPayload,
} from "./content-reviews";
import { isValidContentMonth } from "./content-month";
import { getSupabase, getSupabaseAdmin } from "./supabase";
import type { ContentItem, ContentReviewDecision } from "./types";

type ReviewActionResult =
  | { ok: true; path: string; roundId: string }
  | { ok: false; message: string };

type ReviewSubmitResult =
  | { ok: true; alreadySubmitted?: boolean }
  | { ok: false; message: string };

type ReviewRevisionResult =
  | { ok: true; taskId: string }
  | { ok: false; message: string };

type ReviewLinkResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

type ReviewSubmission = {
  name: string;
  email: string;
  generalComment: string | null;
  decisions: Array<{
    blockId: string;
    decision: ContentReviewDecision;
    comment: string | null;
  }>;
};

function cleanString(value: unknown, maximum = 10_000) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, maximum) : null;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fileExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function isExpectedReviewUploadPath(path: string, clientId: string, mimeType: string) {
  const parts = path.split("/");
  if (parts.length !== 4) return false;
  const [pathClientId, directory, uploadId, fileName] = parts;
  const expectedExtension = fileExtensionForMimeType(mimeType);
  return (
    pathClientId === clientId &&
    directory === "pending" &&
    isValidUuid(uploadId ?? "") &&
    new RegExp(`^[0-9a-f-]{36}\\.${expectedExtension}$`, "i").test(fileName ?? "") &&
    isValidUuid((fileName ?? "").slice(0, -(expectedExtension.length + 1)))
  );
}

function parseBuilderPayload(rawPayload: unknown): ContentReviewBuilderPayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("A preparação da aprovação está incompleta.");
  }
  const parsed = rawPayload as Partial<ContentReviewBuilderPayload>;

  if (!parsed.clientId || !isValidUuid(parsed.clientId) || !parsed.month || !Array.isArray(parsed.blocks)) {
    throw new Error("A preparação da aprovação está incompleta.");
  }

  const blocks = parsed.blocks.map((block, blockIndex) => {
    if (!block || typeof block !== "object") throw new Error(`O bloco ${blockIndex + 1} é inválido.`);
    const title = cleanString(block.title, 240);
    const contentIds = Array.from(new Set(Array.isArray(block.contentIds) ? block.contentIds.filter((id): id is string => typeof id === "string" && id.length > 0) : []));
    const assets = Array.isArray(block.assets)
      ? block.assets.map((asset) => ({
          key: cleanString(asset?.key, 100) ?? "",
          storagePath: cleanString(asset?.storagePath, 500) ?? "",
          originalName: cleanString(asset?.originalName, 255) ?? "",
          mimeType: typeof asset?.mimeType === "string" ? asset.mimeType : "",
          size: typeof asset?.size === "number" && Number.isSafeInteger(asset.size) ? asset.size : 0,
          appliesToContentIds: Array.from(new Set(Array.isArray(asset?.appliesToContentIds) ? asset.appliesToContentIds.filter((id): id is string => typeof id === "string" && contentIds.includes(id)) : [])),
        }))
      : [];

    if (!title || !contentIds.length) throw new Error(`O bloco ${blockIndex + 1} precisa de título e conteúdos.`);
    if (assets.some((asset) => (
      !asset.key ||
      !asset.storagePath ||
      !asset.originalName ||
      !isContentReviewAssetMimeType(asset.mimeType) ||
      asset.size <= 0 ||
      asset.size > CONTENT_REVIEW_ASSET_MAX_BYTES ||
      !isExpectedReviewUploadPath(asset.storagePath, parsed.clientId!, asset.mimeType) ||
      !asset.appliesToContentIds.length
    ))) {
      throw new Error(`Revê a atribuição dos visuais no bloco “${title}”.`);
    }

    return {
      key: cleanString(block.key, 100) ?? randomUUID(),
      title,
      contentIds,
      assets: assets.map((asset) => ({
        ...asset,
        mimeType: asset.mimeType as "image/png" | "image/jpeg" | "image/webp",
      })),
    };
  });

  if (!blocks.length) throw new Error("Adiciona pelo menos um bloco à aprovação.");
  const allContentIds = blocks.flatMap((block) => block.contentIds);
  if (new Set(allContentIds).size !== allContentIds.length) {
    throw new Error("Cada conteúdo só pode aparecer uma vez na mesma aprovação.");
  }
  const allAssets = blocks.flatMap((block) => block.assets);
  if (
    new Set(allAssets.map((asset) => asset.key)).size !== allAssets.length ||
    new Set(allAssets.map((asset) => asset.storagePath)).size !== allAssets.length
  ) {
    throw new Error("A preparação contém visuais duplicados.");
  }
  if (allAssets.reduce((total, asset) => total + asset.size, 0) > CONTENT_REVIEW_TOTAL_MAX_BYTES) {
    throw new Error("O conjunto de visuais não pode exceder 28 MB por aprovação.");
  }

  return {
    clientId: parsed.clientId,
    month: parsed.month,
    recipientName: cleanString(parsed.recipientName, 180),
    recipientEmail: cleanString(parsed.recipientEmail, 320),
    approvalDeadline: cleanString(parsed.approvalDeadline, 10),
    introduction: cleanString(parsed.introduction, 4_000),
    blocks,
  };
}

async function reviewUploadedAssets(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  payload: ContentReviewBuilderPayload,
) {
  let totalSize = 0;
  const assets = payload.blocks.flatMap((block) => block.assets);

  await Promise.all(assets.map(async (asset) => {
    const { data, error } = await supabase.storage
      .from(CONTENT_REVIEW_ASSETS_BUCKET)
      .info(asset.storagePath);
    if (error || !data) {
      throw new Error(`Não foi possível confirmar o visual “${asset.originalName}”. Volta a tentar.`);
    }
    const actualSize = data.size ?? 0;
    const actualMimeType = data.contentType ?? "";
    if (
      actualSize <= 0 ||
      actualSize !== asset.size ||
      actualSize > CONTENT_REVIEW_ASSET_MAX_BYTES ||
      actualMimeType !== asset.mimeType
    ) {
      throw new Error(`O visual “${asset.originalName}” não corresponde ao ficheiro carregado.`);
    }
    totalSize += actualSize;
  }));

  if (totalSize > CONTENT_REVIEW_TOTAL_MAX_BYTES) {
    throw new Error("O conjunto de visuais não pode exceder 28 MB por aprovação.");
  }
}

async function internalReviewContext() {
  await assertNotAdminPreviewMode();
  const profile = await requireRole(["admin", "marketing"]);
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase não está configurado.");
  return { profile, supabase };
}

export async function createContentReviewAction(rawPayload: unknown): Promise<ReviewActionResult> {
  try {
    const { profile, supabase } = await internalReviewContext();
    const payload = parseBuilderPayload(rawPayload);
    const uploadedPaths = payload.blocks.flatMap((block) => block.assets.map((asset) => asset.storagePath));
    const roundId = randomUUID();
    let roundInserted = false;

    try {
      if (!isValidContentMonth(payload.month)) throw new Error("Escolhe um mês válido.");
      await reviewUploadedAssets(supabase, payload);
      const contentIds = payload.blocks.flatMap((block) => block.contentIds);

      const [{ data: client, error: clientError }, { data: sourceItems, error: contentError }] = await Promise.all([
        supabase.from("clients").select("id, name, logo_url").eq("id", payload.clientId).maybeSingle(),
        supabase.from("content_items").select("*").eq("client_id", payload.clientId).in("id", contentIds),
      ]);

      if (clientError || !client) throw new Error("O cliente selecionado já não está disponível.");
      if (contentError) throw new Error(contentError.message);
      const items = (sourceItems ?? []) as ContentItem[];
      const itemMap = new Map(items.map((item) => [item.id, item]));
      if (itemMap.size !== contentIds.length) throw new Error("Um ou mais conteúdos já não estão disponíveis.");
      if (items.some((item) => !contentBelongsToPlanningPeriod(item, payload.month))) {
        throw new Error("A seleção contém conteúdos fora do período escolhido.");
      }
      if (items.some((item) => item.status === "published" || item.status === "archived")) {
        throw new Error("Conteúdos publicados ou arquivados não podem entrar numa nova aprovação.");
      }

      const { data: latestRound, error: latestError } = await supabase
        .from("content_review_rounds")
        .select("version")
        .eq("client_id", payload.clientId)
        .eq("month", payload.month)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw new Error(latestError.message);

      const token = randomBytes(32).toString("hex");
      const version = (latestRound?.version ?? 0) + 1;
      const { error: roundError } = await supabase.from("content_review_rounds").insert({
        id: roundId,
        client_id: payload.clientId,
        month: payload.month,
        version,
        status: "open",
        access_token_hash: tokenHash(token),
        client_name: client.name,
        client_logo_url: client.logo_url,
        recipient_name: payload.recipientName,
        recipient_email: payload.recipientEmail,
        approval_deadline: payload.approvalDeadline,
        introduction: payload.introduction,
        owner_profile_key: profile.key as "guilherme" | "sofia",
        owner_name: profile.name,
      });
      if (roundError) throw new Error(roundError.message);
      roundInserted = true;

      for (const [blockIndex, block] of payload.blocks.entries()) {
        const blockId = randomUUID();
        const { error: blockError } = await supabase.from("content_review_blocks").insert({
          id: blockId,
          round_id: roundId,
          title: block.title,
          position: blockIndex,
        });
        if (blockError) throw new Error(blockError.message);

        const blockItemIds = new Map<string, string>();
        const blockItems = block.contentIds.map((contentId, position) => {
          const item = itemMap.get(contentId)!;
          const id = randomUUID();
          blockItemIds.set(contentId, id);
          return {
            id,
            block_id: blockId,
            content_item_id: item.id,
            position,
            publish_date: item.publish_date,
            publish_time: item.publish_time,
            platform: item.platform,
            format: item.format,
            title: item.title,
            copy_text: item.copy_text,
            description: item.description,
            content_updated_at: item.updated_at || null,
          };
        });
        const { error: itemsError } = await supabase.from("content_review_block_items").insert(blockItems);
        if (itemsError) throw new Error(itemsError.message);

        for (const [assetIndex, asset] of block.assets.entries()) {
          const assetId = randomUUID();
          const { error: assetError } = await supabase.from("content_review_assets").insert({
            id: assetId,
            block_id: blockId,
            storage_path: asset.storagePath,
            original_name: asset.originalName,
            mime_type: asset.mimeType,
            position: assetIndex,
          });
          if (assetError) throw new Error(assetError.message);

          const links = asset.appliesToContentIds.map((contentId) => ({
            asset_id: assetId,
            block_item_id: blockItemIds.get(contentId)!,
          }));
          const { error: linksError } = await supabase.from("content_review_asset_items").insert(links);
          if (linksError) throw new Error(linksError.message);
        }
      }

      const { error: contentUpdateError } = await supabase
        .from("content_items")
        .update({ needs_client_approval: true, approval_status: "awaiting_client" })
        .in("id", contentIds);
      if (contentUpdateError) throw new Error(contentUpdateError.message);

      const { error: supersedeError } = await supabase
        .from("content_review_rounds")
        .update({ status: "superseded" })
        .eq("client_id", payload.clientId)
        .eq("month", payload.month)
        .neq("id", roundId)
        .is("archived_at", null)
        .in("status", ["draft", "open", "submitted", "changes_requested"]);
      if (supersedeError) throw new Error(supersedeError.message);

      revalidatePath("/approvals");
      return { ok: true, path: contentReviewPublicPath(token), roundId };
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from(CONTENT_REVIEW_ASSETS_BUCKET).remove(uploadedPaths);
      if (roundInserted) await supabase.from("content_review_rounds").delete().eq("id", roundId);
      throw error;
    }
  } catch (error) {
    console.error("Erro ao criar aprovação de conteúdos", error);
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível criar a aprovação." };
  }
}

function parseSubmission(formData: FormData): ReviewSubmission {
  const raw = formData.get("submission");
  if (typeof raw !== "string") throw new Error("A resposta está incompleta.");
  const candidate = JSON.parse(raw) as Partial<ReviewSubmission>;
  const name = cleanString(candidate.name, 180);
  const email = cleanString(candidate.email, 320);
  if (!name || !email || !email.includes("@")) throw new Error("Indica o nome e um email válido.");
  if (!Array.isArray(candidate.decisions)) throw new Error("A resposta está incompleta.");

  return {
    name,
    email,
    generalComment: cleanString(candidate.generalComment, 4_000),
    decisions: candidate.decisions.map((entry) => ({
      blockId: cleanString(entry?.blockId, 80) ?? "",
      decision: entry?.decision === "approved" ? "approved" : entry?.decision === "changes_requested" ? "changes_requested" : "pending",
      comment: cleanString(entry?.comment, 4_000),
    })),
  };
}

export async function submitContentReviewAction(token: string, formData: FormData): Promise<ReviewSubmitResult> {
  try {
    if (!isValidContentReviewToken(token)) throw new Error("O link de aprovação é inválido.");
    const submission = parseSubmission(formData);
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("O serviço de aprovação ainda não está configurado.");

    const { data: round, error: roundError } = await admin
      .from("content_review_rounds")
      .select("*")
      .eq("access_token_hash", tokenHash(token))
      .maybeSingle();
    if (roundError || !round) throw new Error("Esta aprovação não está disponível.");
    if (round.archived_at) throw new Error("Esta aprovação foi arquivada e já não aceita respostas.");
    if (["approved", "changes_requested"].includes(round.status)) return { ok: true, alreadySubmitted: true };
    if (round.status !== "open") throw new Error("Esta aprovação já não aceita respostas.");

    const { data: blocks, error: blocksError } = await admin
      .from("content_review_blocks")
      .select("*")
      .eq("round_id", round.id)
      .order("position");
    if (blocksError) throw new Error(blocksError.message);
    const blockIds = (blocks ?? []).map((block) => block.id);
    const responseIds = submission.decisions.map((entry) => entry.blockId);
    if (blockIds.length !== responseIds.length || blockIds.some((id) => !responseIds.includes(id))) {
      throw new Error("É necessária uma decisão para todos os blocos.");
    }
    if (submission.decisions.some((entry) => entry.decision === "pending")) {
      throw new Error("É necessária uma decisão para todos os blocos.");
    }
    if (submission.decisions.some((entry) => entry.decision === "changes_requested" && !entry.comment)) {
      throw new Error("Explica as alterações necessárias nos blocos assinalados.");
    }

    const submittedAt = new Date().toISOString();
    for (const decision of submission.decisions) {
      const comment = [decision.comment, submission.generalComment ? `Comentário geral: ${submission.generalComment}` : null]
        .filter(Boolean)
        .join("\n\n") || null;
      const { error } = await admin
        .from("content_review_blocks")
        .update({
          decision: decision.decision,
          client_comment: comment,
          feedback_submitted_at: submittedAt,
        })
        .eq("id", decision.blockId)
        .eq("round_id", round.id);
      if (error) throw new Error(error.message);

      const { data: blockItems, error: itemsError } = await admin
        .from("content_review_block_items")
        .select("content_item_id")
        .eq("block_id", decision.blockId)
        .not("content_item_id", "is", null);
      if (itemsError) throw new Error(itemsError.message);
      const ids = (blockItems ?? []).flatMap((item) => item.content_item_id ? [item.content_item_id] : []);
      if (ids.length) {
        const update = decision.decision === "approved"
          ? { approval_status: "approved", needs_client_approval: true }
          : { approval_status: "changes_requested", needs_client_approval: true, client_feedback: decision.comment };
        const { error: contentError } = await admin.from("content_items").update(update).in("id", ids);
        if (contentError) throw new Error(contentError.message);
      }
    }

    const finalStatus = submission.decisions.some((entry) => entry.decision === "changes_requested")
      ? "changes_requested"
      : "approved";
    const { error: finalError } = await admin
      .from("content_review_rounds")
      .update({
        status: finalStatus,
        submitted_by_name: submission.name,
        submitted_by_email: submission.email,
        submitted_at: submittedAt,
      })
      .eq("id", round.id);
    if (finalError) throw new Error(finalError.message);

    revalidatePath("/content");
    revalidatePath("/approvals");
    revalidatePath(contentReviewPublicPath(token));
    return { ok: true };
  } catch (error) {
    console.error("Erro ao submeter aprovação de conteúdos", error);
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível guardar a resposta." };
  }
}

export async function startContentReviewRevisionAction(blockId: string): Promise<ReviewRevisionResult> {
  try {
    const { supabase } = await internalReviewContext();
    const { data: block, error: blockError } = await supabase
      .from("content_review_blocks")
      .select("*")
      .eq("id", blockId)
      .maybeSingle();
    if (blockError || !block) throw new Error("O bloco de feedback não está disponível.");
    if (block.decision !== "changes_requested") throw new Error("Este bloco não tem alterações pedidas.");
    if (block.revision_task_id) return { ok: true, taskId: block.revision_task_id };

    const [{ data: round, error: roundError }, { data: blockItems, error: itemsError }] = await Promise.all([
      supabase.from("content_review_rounds").select("*").eq("id", block.round_id).maybeSingle(),
      supabase.from("content_review_block_items").select("*").eq("block_id", block.id).order("position"),
    ]);
    if (roundError || !round) throw new Error("A ronda de aprovação não está disponível.");
    if (itemsError) throw new Error(itemsError.message);
    const contentIds = (blockItems ?? []).flatMap((item) => item.content_item_id ? [item.content_item_id] : []);
    if (!contentIds.length) throw new Error("Os conteúdos originais já não estão disponíveis.");
    const dueDate = (blockItems ?? []).flatMap((item) => item.publish_date ? [item.publish_date] : []).sort()[0] ?? null;
    const relatedUrl = `/approvals/${round.id}`;
    const noteLines = [
      `Feedback do cliente na aprovação v${round.version} de ${round.month}.`,
      block.client_comment ? `\n${block.client_comment}` : null,
      `\nConteúdos relacionados: ${(blockItems ?? []).map((item) => item.title).join(", ")}.`,
    ].filter(Boolean);

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        client_id: round.client_id,
        title: `Revisão: ${block.title}`,
        type: "operations",
        status: "pending",
        priority: "normal",
        assignee_name: round.owner_name,
        due_date: dueDate,
        related_url: relatedUrl,
        links: [{ label: "Abrir feedback do cliente", url: relatedUrl }],
        is_blocked: false,
        blocker_reason: null,
        notes: noteLines.join("\n"),
      })
      .select("id")
      .single();
    if (taskError || !task) throw new Error(taskError?.message ?? "Não foi possível criar a tarefa de revisão.");

    const { error: contentError } = await supabase
      .from("content_items")
      .update({
        status: "in_progress",
        approval_status: "revision_in_progress",
        needs_client_approval: true,
        client_feedback: block.client_comment,
      })
      .in("id", contentIds);
    if (contentError) {
      await supabase.from("tasks").delete().eq("id", task.id);
      throw new Error(contentError.message);
    }

    const { error: updateError } = await supabase
      .from("content_review_blocks")
      .update({ revision_task_id: task.id, revision_started_at: new Date().toISOString() })
      .eq("id", block.id);
    if (updateError) {
      await supabase.from("tasks").delete().eq("id", task.id);
      throw new Error(updateError.message);
    }

    revalidatePath("/content");
    revalidatePath("/tasks");
    revalidatePath(`/approvals/${round.id}`);
    return { ok: true, taskId: task.id };
  } catch (error) {
    console.error("Erro ao iniciar revisão de conteúdos", error);
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível iniciar a revisão." };
  }
}

export async function rotateContentReviewLinkAction(roundId: string): Promise<ReviewLinkResult> {
  try {
    const { supabase } = await internalReviewContext();
    const cleanRoundId = cleanString(roundId, 80);
    if (!cleanRoundId) throw new Error("A aprovação não está disponível.");

    const { data: round, error: roundError } = await supabase
      .from("content_review_rounds")
      .select("id, status, archived_at")
      .eq("id", cleanRoundId)
      .maybeSingle();
    if (roundError || !round) throw new Error("A aprovação não está disponível.");
    if (round.archived_at) throw new Error("Uma aprovação arquivada não pode receber um novo link.");
    if (round.status !== "open") throw new Error("Só é possível gerar um novo link enquanto a aprovação aguarda resposta.");

    const token = randomBytes(32).toString("hex");
    const { error: updateError } = await supabase
      .from("content_review_rounds")
      .update({ access_token_hash: tokenHash(token) })
      .eq("id", round.id)
      .eq("status", "open");
    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/approvals/${round.id}`);
    return { ok: true, path: contentReviewPublicPath(token) };
  } catch (error) {
    console.error("Erro ao renovar link de aprovação", error);
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível gerar um novo link." };
  }
}

export async function archiveContentReviewAction(roundId: string): Promise<void> {
  const { profile, supabase } = await internalReviewContext();
  const cleanRoundId = cleanString(roundId, 80);
  if (!cleanRoundId) throw new Error("A aprovação não está disponível.");
  if (profile.key !== "guilherme" && profile.key !== "sofia") {
    throw new Error("Não tem permissão para arquivar aprovações.");
  }

  const { data, error } = await supabase
    .from("content_review_rounds")
    .update({
      archived_at: new Date().toISOString(),
      archived_by_profile_key: profile.key,
      archived_by_name: profile.name,
    })
    .eq("id", cleanRoundId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao arquivar aprovação de conteúdos", { code: error.code });
    throw new Error("Não foi possível arquivar a aprovação.");
  }
  if (!data) throw new Error("Esta aprovação já estava arquivada ou deixou de estar disponível.");

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${cleanRoundId}`);
}
