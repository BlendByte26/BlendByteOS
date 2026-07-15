"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fallbackContentPlatform } from "./content-platform";
import {
  INVEST2030_NEWSLETTER_TEMPLATE_VERSION,
  generateInvest2030NewsletterHtml,
  parseInvest2030NewsletterJson,
  parseInvest2030TaskNotes,
  safeInvest2030CtaUrl,
  validateInvest2030Newsletter,
} from "./invest2030-newsletter";
import { buildInvest2030TaskSummary } from "./invest2030-notes";
import { invest2030PublicHref, isInvest2030PublicAccessToken } from "./invest2030-public";
import { parseLinksFormData } from "./links";
import { baseChecklist } from "./onboarding";
import {
  getDesignProfile,
  isOperationalProfileKey,
  isDesignAssigneeName,
} from "./operational-profiles";
import { requireCurrentOperationalProfile, requireRole } from "./auth";
import { getSupabase, getSupabaseAdmin } from "./supabase";
import {
  clientColorKeys,
  invest2030ActionTypes,
  invest2030InformationStatuses,
  invest2030MainGoals,
  invest2030PeriodTypes,
  invest2030Requesters,
} from "./types";
import type {
  ClientColorKey,
  ClientStatus,
  ClientType,
  ContentComment,
  ContentItem,
  ContentStatus,
  Invest2030RequestFormField,
  Invest2030RequestFormState,
  Invest2030RequestFormValues,
  Invest2030NewsletterStatus,
  QuickNote,
  QuickTodo,
  QuickTodoItemType,
  QuickTodoView,
  ServiceType,
  SetupChecklistItem,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./types";

type CreateClientResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string; clientId?: string };

type QuickTodoActionResult =
  | { ok: true; todo?: QuickTodo }
  | { ok: false; message: string };

type QuickNoteActionResult =
  | { ok: true; note?: QuickNote }
  | { ok: false; message: string };

type BulkCreateContentResult =
  | { ok: true; createdCount: number }
  | { ok: false; message: string };

type ContentMutationResult = { ok: false; message: string };

type ContentCommentsResult =
  | { ok: true; comments: ContentComment[] }
  | { ok: false; message: string };

type ContentCommentMutationResult =
  | { ok: true; comment?: ContentComment }
  | { ok: false; message: string };

export type NewsletterMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function textList(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
}

function formDataStringAt(values: FormDataEntryValue[], index: number) {
  const value = values[index];
  return typeof value === "string" ? value.trim() : "";
}

function contentPlatformValue(formData: FormData) {
  const otherName = text(formData, "platform_other_name");
  const otherPlatforms =
    otherName
      ?.split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== "Sem plataforma") ?? [];
  const selected = formData
    .getAll("platform")
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      if (value === "Outra") return otherPlatforms;
      return [value];
    })
    .filter((value) => value !== "Sem plataforma");

  const uniqueValues = Array.from(new Set([...selected, ...otherPlatforms]));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
}

function contentFormatValue(formData: FormData) {
  const otherName = text(formData, "format_other_name");
  const selected = formData
    .getAll("format")
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      if (value === "Outro") return otherName ? [otherName] : [];
      return [value];
    });

  const uniqueValues = Array.from(new Set([...selected, ...(otherName ? [otherName] : [])]));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }
  return value;
}

function platforms(formData: FormData) {
  const otherName = text(formData, "platform_other_name");
  const selected = formData
    .getAll("platforms")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((item) => (item.trim() === "Outro" && otherName ? otherName : item.trim()));
  const typed =
    text(formData, "platforms")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  return Array.from(new Set([...selected, ...typed]));
}

function serviceTypesValue(formData: FormData) {
  const selected = formData
    .getAll("service_types")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((item) => item.trim());
  const fallback = text(formData, "service_type");

  return Array.from(new Set([...selected, ...(fallback ? [fallback] : [])]));
}

function setupChecklistValue(formData: FormData): SetupChecklistItem[] {
  const completed = new Set(
    formData
      .getAll("setup_checklist")
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim()),
  );

  return baseChecklist.map((label) => ({ label, done: completed.has(label) }));
}

function sanitizeChecklist(items: SetupChecklistItem[]) {
  return items
    .map((item) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      done: Boolean(item.done),
    }))
    .filter((item) => item.label.length > 0);
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function contentMonthValue(formData: FormData, publishDate: string | null) {
  if (publishDate) return publishDate.slice(0, 7);
  return requiredText(formData, "month");
}

function contentMutationErrorMessage(error: { message?: string; code?: string }) {
  if (
    error.code === "23505" ||
    error.message?.includes("content_items_seed_unique_idx")
  ) {
    return "Já existe um conteúdo para este cliente com o mesmo mês e título. Altere o título, a data de publicação ou o mês de planeamento.";
  }

  return error.message ?? "Não foi possível guardar o conteúdo.";
}

function contentMutationFailure(error: { message?: string; code?: string }): ContentMutationResult {
  return { ok: false, message: contentMutationErrorMessage(error) };
}

function initialTaskPriority(title: string): TaskPriority {
  if (
    [
      "Setup operacional do cliente",
      "Recolher materiais da marca",
      "Validar processo de aprovação",
    ].includes(title)
  ) {
    return "urgent";
  }

  if (title === "Criar primeira tarefa de reporting") return "low";

  return "normal";
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabase>>>;

async function getNextClientDisplayOrder(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("clients")
    .select("display_order")
    .not("display_order", "is", null)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao calcular ordem do cliente", { code: error.code });
    return null;
  }

  return typeof data?.display_order === "number" ? data.display_order + 1 : 1;
}

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/content");
  revalidatePath("/tasks");
  revalidatePath("/invest2030/pedidos");
  revalidatePath("/invest2030/novo-pedido");
  revalidatePath("/archive");
  revalidatePath("/team");
}

function demoRedirect(path: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}demo=1`);
}

async function supabaseOrRedirect(path: string) {
  const supabase = await getSupabase();
  if (!supabase) demoRedirect(path);
  return supabase;
}

async function supabaseOrError() {
  const supabase = await getSupabase();
  if (!supabase) {
    throw new Error("Modo demo: configure o Supabase para gravar alterações.");
  }
  return supabase;
}

async function requireGuilhermeOperationalProfile() {
  await requireRole(["admin"]);
}

async function currentOperationalProfile() {
  return requireCurrentOperationalProfile();
}

function mentionedProfileKeys(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("mentioned_profile_keys")
        .filter((value): value is string => typeof value === "string")
        .filter(isOperationalProfileKey),
    ),
  );
}

function clientColorKeyValue(formData: FormData): ClientColorKey {
  const value = text(formData, "color_key");
  return clientColorKeys.includes(value as ClientColorKey) ? (value as ClientColorKey) : "slate";
}

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  await requireRole(["admin"]);
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Supabase não está configurado. Não foi possível criar o cliente.",
    };
  }

  try {
    const payload = {
      name: requiredText(formData, "name"),
      client_code: text(formData, "client_code"),
      short_name: text(formData, "short_name"),
      display_order: await getNextClientDisplayOrder(supabase),
      logo_url: text(formData, "logo_url"),
      color_key: clientColorKeyValue(formData),
      type: requiredText(formData, "type") as ClientType,
      status: requiredText(formData, "status") as ClientStatus,
      owner_name: text(formData, "owner_name"),
      service_type: (serviceTypesValue(formData)[0] ?? null) as ServiceType | null,
      service_types: serviceTypesValue(formData),
      monthly_value: numberValue(formData, "monthly_value"),
      contract_value: text(formData, "contract_value"),
      start_date: text(formData, "start_date"),
      contract_duration: text(formData, "contract_duration"),
      platforms: platforms(formData),
      website_url: text(formData, "website_url"),
      instagram_url: text(formData, "instagram_url"),
      facebook_url: text(formData, "facebook_url"),
      linkedin_url: text(formData, "linkedin_url"),
      tiktok_url: text(formData, "tiktok_url"),
      youtube_url: text(formData, "youtube_url"),
      metricool_url: text(formData, "metricool_url"),
      crm_newsletter_url: text(formData, "crm_newsletter_url"),
      platform_other_url: text(formData, "platform_other_url"),
      drive_url: text(formData, "drive_url"),
      figma_url: text(formData, "figma_url"),
      meta_url: text(formData, "meta_url"),
      google_drive_url: text(formData, "google_drive_url"),
      onedrive_url: text(formData, "onedrive_url"),
      figma_project_url: text(formData, "figma_project_url"),
      content_calendar_url: text(formData, "content_calendar_url"),
      final_deliverables_url: text(formData, "final_deliverables_url"),
      proposal_url: text(formData, "proposal_url"),
      contract_url: text(formData, "contract_url"),
      adjudication_url: text(formData, "adjudication_url"),
      budget_url: text(formData, "budget_url"),
      other_documents_url: text(formData, "other_documents_url"),
      brand_assets_url: text(formData, "brand_assets_url"),
      setup_checklist: setupChecklistValue(formData),
      reporting_url: text(formData, "reporting_url"),
      initial_briefing_url: text(formData, "initial_briefing_url"),
      conditions_url: text(formData, "conditions_url"),
      linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
      notes: text(formData, "notes"),
    };
    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id, service_type, owner_name")
      .single();

    if (error) {
      console.error("Erro ao criar cliente", { code: error.code });
      return { ok: false, message: error.message };
    }

    if (checked(formData, "generate_initial_tasks") && data?.id) {
      const taskTitles = formData
        .getAll("setup_tasks")
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      if (taskTitles.length) {
        const { error: taskError } = await supabase.from("tasks").insert(
          taskTitles.map((title) => ({
            client_id: data.id,
            title,
            type: "operations" as TaskType,
            status: "todo" as TaskStatus,
            priority: initialTaskPriority(title),
            assignee_name: data.owner_name,
            due_date: null,
            related_url:
              payload.google_drive_url ??
              payload.onedrive_url ??
              payload.figma_project_url ??
              null,
            is_blocked: false,
            blocker_reason: null,
            notes: "Gerada no fluxo Novo Cliente.",
          })),
        );

        if (taskError) {
          console.error("Erro ao criar tarefas iniciais", {
            clientId: data.id,
            code: taskError.code,
          });
          refreshAll();
          return {
            ok: false,
            clientId: data.id,
            message: "Cliente criado, mas houve erro ao criar tarefas iniciais.",
          };
        }
      }
    }

    refreshAll();
    return { ok: true, clientId: data.id };
  } catch (error) {
    console.error("Erro inesperado ao criar cliente", {
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível criar o cliente.",
    };
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await supabaseOrRedirect(`/clients/${id}`);
  const { error } = await supabase
    .from("clients")
    .update({
      name: requiredText(formData, "name"),
      client_code: text(formData, "client_code"),
      short_name: text(formData, "short_name"),
      display_order: numberValue(formData, "display_order"),
      logo_url: text(formData, "logo_url"),
      color_key: clientColorKeyValue(formData),
      type: requiredText(formData, "type") as ClientType,
      status: requiredText(formData, "status") as ClientStatus,
      owner_name: text(formData, "owner_name"),
      service_type: (serviceTypesValue(formData)[0] ?? null) as ServiceType | null,
      service_types: serviceTypesValue(formData),
      monthly_value: numberValue(formData, "monthly_value"),
      contract_value: text(formData, "contract_value"),
      start_date: text(formData, "start_date"),
      contract_duration: text(formData, "contract_duration"),
      platforms: platforms(formData),
      website_url: text(formData, "website_url"),
      instagram_url: text(formData, "instagram_url"),
      facebook_url: text(formData, "facebook_url"),
      linkedin_url: text(formData, "linkedin_url"),
      tiktok_url: text(formData, "tiktok_url"),
      youtube_url: text(formData, "youtube_url"),
      metricool_url: text(formData, "metricool_url"),
      crm_newsletter_url: text(formData, "crm_newsletter_url"),
      platform_other_url: text(formData, "platform_other_url"),
      drive_url: text(formData, "drive_url"),
      figma_url: text(formData, "figma_url"),
      meta_url: text(formData, "meta_url"),
      google_drive_url: text(formData, "google_drive_url"),
      onedrive_url: text(formData, "onedrive_url"),
      figma_project_url: text(formData, "figma_project_url"),
      content_calendar_url: text(formData, "content_calendar_url"),
      final_deliverables_url: text(formData, "final_deliverables_url"),
      proposal_url: text(formData, "proposal_url"),
      contract_url: text(formData, "contract_url"),
      adjudication_url: text(formData, "adjudication_url"),
      budget_url: text(formData, "budget_url"),
      other_documents_url: text(formData, "other_documents_url"),
      brand_assets_url: text(formData, "brand_assets_url"),
      reporting_url: text(formData, "reporting_url"),
      initial_briefing_url: text(formData, "initial_briefing_url"),
      conditions_url: text(formData, "conditions_url"),
      linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
      notes: text(formData, "notes"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function updateClientSetupChecklistAction(
  id: string,
  checklist: SetupChecklistItem[],
) {
  await requireRole(["admin"]);
  const supabase = await supabaseOrError();
  const payload = sanitizeChecklist(checklist);
  const { error } = await supabase
    .from("clients")
    .update({ setup_checklist: payload })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return payload;
}

export async function createDefaultClientChecklistAction(id: string) {
  return updateClientSetupChecklistAction(
    id,
    baseChecklist.map((label) => ({ label, done: false })),
  );
}

export async function updateClientLinksAction(id: string, formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await supabaseOrError();
  const payload = {
    google_drive_url: text(formData, "google_drive_url"),
    onedrive_url: text(formData, "onedrive_url"),
    figma_project_url: text(formData, "figma_project_url"),
    final_deliverables_url: text(formData, "final_deliverables_url"),
    content_calendar_url: text(formData, "content_calendar_url"),
    reporting_url: text(formData, "reporting_url"),
    proposal_url: text(formData, "proposal_url"),
    contract_url: text(formData, "contract_url"),
    adjudication_url: text(formData, "adjudication_url"),
    brand_assets_url: text(formData, "brand_assets_url"),
    initial_briefing_url: text(formData, "initial_briefing_url"),
    conditions_url: text(formData, "conditions_url"),
    website_url: text(formData, "website_url"),
    instagram_url: text(formData, "instagram_url"),
    facebook_url: text(formData, "facebook_url"),
    linkedin_url: text(formData, "linkedin_url"),
    tiktok_url: text(formData, "tiktok_url"),
    youtube_url: text(formData, "youtube_url"),
    meta_url: text(formData, "meta_url"),
    linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
    crm_newsletter_url: text(formData, "crm_newsletter_url"),
  };
  const { error } = await supabase.from("clients").update(payload).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return payload;
}

export async function deleteClientAction(id: string) {
  await requireRole(["admin"]);
  const supabase = await supabaseOrRedirect("/clients");
  const [{ count: contentCount, error: contentError }, { count: taskCount, error: taskError }] =
    await Promise.all([
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id),
    ]);

  if (contentError) throw new Error(contentError.message);
  if (taskError) throw new Error(taskError.message);
  if ((contentCount ?? 0) > 0 || (taskCount ?? 0) > 0) {
    throw new Error(
      "Este cliente tem conteúdos ou tarefas associados. Arquive/limpe esses itens antes de apagar definitivamente.",
    );
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/clients");
}

function contentPayload(formData: FormData) {
  const publishDate = text(formData, "publish_date");
  const payload = {
    client_id: requiredText(formData, "client_id"),
    month: contentMonthValue(formData, publishDate),
    publish_date: publishDate,
    publish_time: text(formData, "publish_time"),
    design_due_date: text(formData, "design_due_date"),
    copy_due_date: text(formData, "copy_due_date"),
    approval_due_date: text(formData, "approval_due_date"),
    publishing_due_date: text(formData, "publishing_due_date"),
    design_status: text(formData, "design_status"),
    copy_status: text(formData, "copy_status"),
    approval_status: text(formData, "approval_status"),
    publishing_status: text(formData, "publishing_status"),
    needs_design: formData.has("needs_design") ? checked(formData, "needs_design") : true,
    needs_copy: formData.has("needs_copy") ? checked(formData, "needs_copy") : true,
    needs_client_approval: checked(formData, "needs_client_approval"),
    platform: contentPlatformValue(formData) ?? fallbackContentPlatform,
    format: contentFormatValue(formData),
    title: requiredText(formData, "title"),
    creative_brief: text(formData, "creative_brief"),
    copy_text: text(formData, "copy_text"),
    description: text(formData, "description"),
    status: requiredText(formData, "status") as ContentStatus,
    assignee_name: textList(formData, "assignee_name"),
    media_url: text(formData, "media_url"),
    brief_url: text(formData, "brief_url"),
    media_folder_url: text(formData, "media_folder_url"),
    figma_url: text(formData, "figma_url"),
    export_url: text(formData, "export_url"),
    delivery_url: text(formData, "delivery_url"),
    inspiration_url: text(formData, "inspiration_url"),
    published_url: text(formData, "published_url"),
    internal_review_notes: text(formData, "internal_review_notes"),
    client_feedback: text(formData, "client_feedback"),
    is_blocked: checked(formData, "is_blocked"),
    blocker_reason: text(formData, "blocker_reason"),
    recording_date: text(formData, "recording_date"),
    notes: text(formData, "notes"),
  };

  return payload;
}

type ContentPayload = ReturnType<typeof contentPayload>;
type ContentInsertPayload = Omit<ContentItem, "id" | "created_at" | "updated_at" | "clients">;

function contentPayloadWithoutPublishTime(payload: ContentPayload) {
  const fallbackPayload: Partial<ContentPayload> = { ...payload };
  delete fallbackPayload.publish_time;
  return fallbackPayload as ContentPayload;
}

function contentInsertPayloadWithoutPublishTime(payload: ContentInsertPayload) {
  const fallbackPayload: Partial<ContentInsertPayload> = { ...payload };
  delete fallbackPayload.publish_time;
  return fallbackPayload as ContentInsertPayload;
}

function isMissingPublishTimeColumnError(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      error.code === "PGRST204" &&
      error.message?.includes("'publish_time' column"),
  );
}

export async function createContentAction(formData: FormData): Promise<ContentMutationResult | void> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrRedirect("/content");
  const payload = contentPayload(formData);
  const { error } = await supabase.from("content_items").insert(payload);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase.from("content_items").insert(contentPayloadWithoutPublishTime(payload));
    if (fallback.error) return contentMutationFailure(fallback.error);
  } else if (error) {
    return contentMutationFailure(error);
  }
  refreshAll();
  redirect("/content");
}

export async function bulkCreateContentAction(formData: FormData): Promise<BulkCreateContentResult> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para criar conteúdos." };
  }

  const clientId = requiredText(formData, "client_id");
  const month = requiredText(formData, "month");
  const status = requiredText(formData, "status") as ContentStatus;
  const defaultPlatform = text(formData, "default_platform") ?? fallbackContentPlatform;
  const defaultFormat = text(formData, "default_format");
  const publishDates = formData.getAll("row_publish_date");
  const publishTimes = formData.getAll("row_publish_time");
  const platforms = formData.getAll("row_platform");
  const formats = formData.getAll("row_format");
  const titles = formData.getAll("row_title");
  const assignees = formData.getAll("row_assignee_name");

  const rowCount = Math.max(
    publishDates.length,
    publishTimes.length,
    platforms.length,
    formats.length,
    titles.length,
    assignees.length,
  );

  const payloads: ContentInsertPayload[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const title = formDataStringAt(titles, index);
    const publishDate = formDataStringAt(publishDates, index);

    if (!title && !publishDate) continue;

    if (!title) {
      return { ok: false, message: `A linha ${index + 1} precisa de título.` };
    }

    if (!publishDate) {
      return { ok: false, message: `A linha ${index + 1} precisa de data de publicação.` };
    }

    const publishTime = formDataStringAt(publishTimes, index);
    const platform = formDataStringAt(platforms, index);
    const format = formDataStringAt(formats, index);
    const assignee = formDataStringAt(assignees, index);

    payloads.push({
      client_id: clientId,
      month: publishDate.slice(0, 7) || month,
      publish_date: publishDate,
      publish_time: publishTime || null,
      design_due_date: null,
      copy_due_date: null,
      approval_due_date: null,
      publishing_due_date: null,
      design_status: null,
      copy_status: null,
      approval_status: null,
      publishing_status: null,
      needs_design: true,
      needs_copy: true,
      needs_client_approval: false,
      platform: platform || defaultPlatform,
      format: format || defaultFormat,
      title,
      creative_brief: null,
      copy_text: null,
      description: null,
      status,
      assignee_name: assignee || null,
      media_url: null,
      brief_url: null,
      media_folder_url: null,
      figma_url: null,
      export_url: null,
      delivery_url: null,
      inspiration_url: null,
      published_url: null,
      internal_review_notes: null,
      client_feedback: null,
      is_blocked: false,
      blocker_reason: null,
      recording_date: null,
      notes: null,
    });
  }

  if (!payloads.length) {
    return { ok: false, message: "Adicione pelo menos uma linha com data e título." };
  }

  const { error } = await supabase.from("content_items").insert(payloads);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .insert(payloads.map(contentInsertPayloadWithoutPublishTime));
    if (fallback.error) return { ok: false, message: contentMutationErrorMessage(fallback.error) };
  } else if (error) {
    return { ok: false, message: contentMutationErrorMessage(error) };
  }

  refreshAll();
  return { ok: true, createdCount: payloads.length };
}

export async function listContentCommentsAction(contentId: string): Promise<ContentCommentsResult> {
  const supabase = await getSupabase();

  if (!supabase) {
    return { ok: true, comments: [] };
  }

  const { data, error } = await supabase
    .from("content_comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, comments: data as ContentComment[] };
}

export async function createContentCommentAction(formData: FormData): Promise<ContentCommentMutationResult> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para comentar." };
  }

  const profile = await currentOperationalProfile();
  const contentId = text(formData, "content_id");
  const body = text(formData, "body");

  if (!contentId) {
    return { ok: false, message: "Conteúdo em falta para comentar." };
  }

  if (!body) {
    return { ok: false, message: "Escreva um comentário antes de enviar." };
  }

  const { data, error } = await supabase
    .from("content_comments")
    .insert({
      content_id: contentId,
      author_profile_key: profile.key,
      author_name: profile.name,
      body,
      mentioned_profile_keys: mentionedProfileKeys(formData),
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/content");
  revalidatePath(`/content/${contentId}/edit`);
  return { ok: true, comment: data as ContentComment };
}

export async function deleteContentCommentAction(commentId: string): Promise<ContentCommentMutationResult> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para apagar comentários." };
  }

  const profile = await currentOperationalProfile();
  const { data: comment, error: readError } = await supabase
    .from("content_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!comment) return { ok: false, message: "Comentário não encontrado." };

  const canDelete =
    profile.key === "guilherme" || comment.author_profile_key === profile.key;

  if (!canDelete) {
    return { ok: false, message: "Só o autor ou o Guilherme podem apagar este comentário." };
  }

  const { error } = await supabase.from("content_comments").delete().eq("id", commentId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/content");
  revalidatePath(`/content/${comment.content_id}/edit`);
  return { ok: true };
}

async function updateContent(id: string, formData: FormData): Promise<ContentMutationResult | void> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const payload = contentPayload(formData);
  const { error } = await supabase
    .from("content_items")
    .update(payload)
    .eq("id", id);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .update(contentPayloadWithoutPublishTime(payload))
      .eq("id", id);
    if (fallback.error) return contentMutationFailure(fallback.error);
  } else if (error) {
    return contentMutationFailure(error);
  }
  refreshAll();
}

export async function updateContentInlineAction(id: string, formData: FormData) {
  return updateContent(id, formData);
}

export async function updateContentAction(id: string, formData: FormData): Promise<ContentMutationResult | void> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrRedirect("/content");
  const payload = contentPayload(formData);
  const { error } = await supabase
    .from("content_items")
    .update(payload)
    .eq("id", id);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .update(contentPayloadWithoutPublishTime(payload))
      .eq("id", id);
    if (fallback.error) return contentMutationFailure(fallback.error);
  } else if (error) {
    return contentMutationFailure(error);
  }
  refreshAll();
  redirect("/content");
}

export async function updateContentStatusAction(id: string, formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase
    .from("content_items")
    .update({ status: requiredText(formData, "status") as ContentStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function archiveContentInlineAction(id: string) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase
    .from("content_items")
    .update({ status: "archived" as ContentStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

async function deleteContent(id: string) {
  await requireRole(["admin", "marketing"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase.from("content_items").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteContentInlineAction(id: string) {
  await deleteContent(id);
}

export async function deleteContentAction(id: string) {
  await requireRole(["admin", "marketing"]);
  const supabase = await supabaseOrRedirect("/content");
  const { error } = await supabase.from("content_items").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/content");
}

function taskPayload(formData: FormData) {
  return {
    client_id: text(formData, "client_id"),
    title: requiredText(formData, "title"),
    type: (text(formData, "type") ?? "operations") as TaskType,
    status: requiredText(formData, "status") as TaskStatus,
    priority: requiredText(formData, "priority") as TaskPriority,
    assignee_name: text(formData, "assignee_name"),
    due_date: text(formData, "due_date"),
    related_url: text(formData, "related_url"),
    links: parseLinksFormData(formData),
    is_blocked: checked(formData, "is_blocked"),
    blocker_reason: text(formData, "blocker_reason"),
    notes: text(formData, "notes"),
  };
}

function handoffDateLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function appendDesignHandoffNote(
  notes: string | null,
  profileName: string,
  designerName: string,
  date: Date,
) {
  const existingNotes = notes?.trimEnd() ?? "";
  const handoffNote = `Enviado para Design por ${profileName} para ${designerName} em ${handoffDateLabel(date)}.`;
  return existingNotes ? `${existingNotes}\n${handoffNote}` : handoffNote;
}

function assigneeIncludesDesign(assigneeName: string | null) {
  return isDesignAssigneeName(assigneeName);
}

export async function createTaskAction(formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").insert(taskPayload(formData));

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

async function updateTask(id: string, formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase.from("tasks").update(taskPayload(formData)).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateTaskInlineAction(id: string, formData: FormData) {
  await updateTask(id, formData);
}

export async function updateTaskStatusInlineAction(id: string, formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase
    .from("tasks")
    .update({ status: requiredText(formData, "status") as TaskStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

async function sendTaskToDesign(id: string, designerProfileKey?: string | null) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const profile = await currentOperationalProfile();
  const designer = getDesignProfile(designerProfileKey);
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("*, clients(*)")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!task) throw new Error("Tarefa não encontrada.");
  if (task.status === "archived") {
    throw new Error("Tarefas arquivadas não podem ser enviadas para Design.");
  }
  if (assigneeIncludesDesign(task.assignee_name)) return task as Task;

  const priority = task.priority && String(task.priority).trim() ? task.priority : "normal";
  const { data, error } = await supabase
    .from("tasks")
    .update({
      assignee_name: designer.name,
      status: "todo" as TaskStatus,
      priority: priority as TaskPriority,
      notes: appendDesignHandoffNote(task.notes, profile.name, designer.name, new Date()),
    })
    .eq("id", id)
    .select("*, clients(*)")
    .single();

  if (error) throw new Error(error.message);
  refreshAll();
  return data as Task;
}

export async function sendTaskToDesignInlineAction(id: string, designerProfileKey?: string) {
  return sendTaskToDesign(id, designerProfileKey);
}

export async function archiveTaskInlineAction(id: string) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase.from("tasks").update({ status: "archived" }).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateTaskAction(id: string, formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").update(taskPayload(formData)).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

export async function sendTaskToDesignAction(id: string, formData?: FormData) {
  await sendTaskToDesign(id, formData ? text(formData, "designer_profile_key") : null);
  redirect("/tasks");
}

async function deleteTask(id: string) {
  await requireRole(["admin", "marketing"]);
  const supabase = await supabaseOrError();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteTaskInlineAction(id: string) {
  await deleteTask(id);
}

export async function deleteTaskAction(id: string) {
  await requireRole(["admin", "marketing"]);
  const supabase = await supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

function refreshNewsletterTask(taskId: string) {
  refreshAll();
  revalidatePath(`/tasks/${taskId}/edit`);
  revalidatePath(`/tasks/${taskId}/newsletter`);
}

async function readTaskForNewsletter(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, client_id, notes, clients(id, name, client_code, short_name)")
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Tarefa não encontrada.");
  return data as Pick<Task, "id" | "notes" | "clients">;
}

export async function saveInvest2030NewsletterDraftAction(
  taskId: string,
  _previousState: NewsletterMutationResult,
  formData: FormData,
): Promise<NewsletterMutationResult> {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const profile = await currentOperationalProfile();
  const task = await readTaskForNewsletter(supabase, taskId);
  const parsed = parseInvest2030TaskNotes(task.notes);
  const rawContent = text(formData, "content_json");

  if (!rawContent) {
    return { ok: false, message: "Conteúdo da newsletter em falta." };
  }

  const parsedContent = parseInvest2030NewsletterJson(rawContent);
  if (!parsedContent.content) {
    return { ok: false, message: parsedContent.errors.join(" ") };
  }

  const finalCta = safeInvest2030CtaUrl(parsedContent.content.cta_url);
  const content = { ...parsedContent.content, cta_url: finalCta.url };
  const generatedHtml = generateInvest2030NewsletterHtml(content);
  const validation = validateInvest2030Newsletter(content, parsed);
  const status: Invest2030NewsletterStatus = validation.blockers.length ? "draft" : "ready_to_export";

  const { data: existing, error: existingError } = await supabase
    .from("invest2030_newsletters")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const payload = {
    task_id: taskId,
    template_version: INVEST2030_NEWSLETTER_TEMPLATE_VERSION,
    parsed_request_json: parsed,
    content_json: content,
    generated_html: generatedHtml,
    status,
    updated_by: profile.name,
  };

  const query = existing?.id
    ? supabase.from("invest2030_newsletters").update(payload).eq("id", existing.id)
    : supabase.from("invest2030_newsletters").insert({ ...payload, created_by: profile.name });

  const { error } = await query;
  if (error) return { ok: false, message: error.message };

  refreshNewsletterTask(taskId);
  return {
    ok: true,
    message: status === "ready_to_export" ? "Rascunho guardado. A newsletter está pronta para exportar." : "Rascunho guardado.",
  };
}

export async function saveInvest2030NewsletterFormAction(taskId: string, formData: FormData) {
  const result = await saveInvest2030NewsletterDraftAction(
    taskId,
    { ok: true, message: "" },
    formData,
  );
  if (!result.ok) throw new Error(result.message);
}

export async function markInvest2030NewsletterScheduledAction(taskId: string, formData: FormData) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const profile = await currentOperationalProfile();
  const sendDate = requiredText(formData, "scheduled_date");
  const sendTime = requiredText(formData, "scheduled_time");
  const note = text(formData, "scheduled_note");
  const scheduledAt = new Date(`${sendDate}T${sendTime}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data ou hora de envio inválida.");
  }

  const { error } = await supabase
    .from("invest2030_newsletters")
    .update({
      status: "scheduled" as Invest2030NewsletterStatus,
      scheduled_at: scheduledAt.toISOString(),
      scheduled_note: note,
      scheduled_by: profile.name,
      scheduled_recorded_at: new Date().toISOString(),
      updated_by: profile.name,
    })
    .eq("task_id", taskId);

  if (error) throw new Error(error.message);
  refreshNewsletterTask(taskId);
}

export async function markInvest2030NewsletterExportedAction(taskId: string) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const profile = await currentOperationalProfile();
  const { error } = await supabase
    .from("invest2030_newsletters")
    .update({
      status: "exported" as Invest2030NewsletterStatus,
      updated_by: profile.name,
    })
    .eq("task_id", taskId);

  if (error) throw new Error(error.message);
  refreshNewsletterTask(taskId);
}

export async function markInvest2030NewsletterSentAction(taskId: string) {
  await requireRole(["admin", "marketing", "design"]);
  const supabase = await supabaseOrError();
  const profile = await currentOperationalProfile();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("invest2030_newsletters")
    .update({
      status: "sent" as Invest2030NewsletterStatus,
      sent_at: now,
      sent_by: profile.name,
      sent_recorded_at: now,
      updated_by: profile.name,
    })
    .eq("task_id", taskId);

  if (error) throw new Error(error.message);
  refreshNewsletterTask(taskId);
}

function requiredOption<T extends readonly string[]>(formData: FormData, key: string, options: T) {
  const value = requiredText(formData, key);
  if (!options.includes(value)) {
    throw new Error(`Opção inválida: ${key}`);
  }
  return value as T[number];
}

function isKnownOption(value: string, options: readonly string[]) {
  return options.includes(value);
}

function parseIsoDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function formatPtDate(value: string) {
  const date = parseIsoDateValue(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatPtMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return value;
  return new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12))).replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase("pt-PT"));
}

function invest2030PeriodPayload(formData: FormData) {
  const periodType = requiredOption(formData, "period_type", invest2030PeriodTypes);

  if (periodType === "Dia específico") {
    const date = requiredText(formData, "period_date");
    if (!parseIsoDateValue(date)) throw new Error("Data inválida.");
    return {
      periodType,
      periodStart: date,
      periodEnd: date,
      periodLabel: `Dia específico — ${formatPtDate(date)}`,
      dueDate: date,
    };
  }

  if (periodType === "Mês") {
    const month = requiredText(formData, "period_month");
    const [year, monthIndex] = month.split("-").map(Number);
    if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) throw new Error("Mês inválido.");
    const start = `${year}-${String(monthIndex).padStart(2, "0")}-01`;
    const endDate = new Date(Date.UTC(year, monthIndex, 0, 12));
    const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;

    return {
      periodType,
      periodStart: start,
      periodEnd: end,
      periodLabel: `Mês — ${formatPtMonth(month)}`,
      dueDate: start,
    };
  }

  const start = requiredText(formData, "period_start");
  const end = requiredText(formData, "period_end");
  const parsedStart = parseIsoDateValue(start);
  const parsedEnd = parseIsoDateValue(end);
  if (!parsedStart || !parsedEnd) throw new Error("Período inválido.");
  if (parsedEnd < parsedStart) throw new Error("A data de fim deve ser igual ou posterior à data de início.");

  return {
    periodType,
    periodStart: start,
    periodEnd: end,
    periodLabel: `${periodType} — ${formatPtDate(start)} a ${formatPtDate(end)}`,
    dueDate: start,
  };
}

function invest2030FormValues(formData: FormData): Invest2030RequestFormValues {
  return {
    campaign_name: text(formData, "campaign_name") ?? "",
    action_type: formData
      .getAll("action_type")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
    requested_by: text(formData, "requested_by") ?? "",
    period_type: text(formData, "period_type") ?? "",
    period_date: text(formData, "period_date") ?? "",
    period_start: text(formData, "period_start") ?? "",
    period_end: text(formData, "period_end") ?? "",
    period_month: text(formData, "period_month") ?? "",
    main_goal: text(formData, "main_goal") ?? "",
    target_audience: text(formData, "target_audience") ?? "",
    main_cta: text(formData, "main_cta") ?? "",
    main_link: text(formData, "main_link") ?? "",
    main_message: text(formData, "main_message") ?? "",
    mandatory_info: text(formData, "mandatory_info") ?? "",
    information_status: text(formData, "information_status") ?? "",
    notes: text(formData, "notes") ?? "",
  };
}

function invest2030ValidationError(
  values: Invest2030RequestFormValues,
  fieldErrors: Partial<Record<Invest2030RequestFormField, string>>,
  submissionKey: string,
  message = "Há campos em falta ou inválidos. Revê os campos assinalados.",
): Invest2030RequestFormState {
  return {
    status: "error",
    message,
    fieldErrors,
    values,
    submissionKey,
  };
}

function validateInvest2030FormValues(values: Invest2030RequestFormValues) {
  const fieldErrors: Partial<Record<Invest2030RequestFormField, string>> = {};

  if (!values.campaign_name) fieldErrors.campaign_name = "Escreve o nome da campanha.";
  if (!values.action_type.length) {
    fieldErrors.action_type = "Escolhe pelo menos um tipo de ação.";
  } else if (values.action_type.some((value) => !isKnownOption(value, invest2030ActionTypes))) {
    fieldErrors.action_type = "Há um tipo de ação inválido.";
  }
  if (!isKnownOption(values.requested_by, invest2030Requesters)) fieldErrors.requested_by = "Escolhe quem está a pedir.";
  if (!isKnownOption(values.period_type, invest2030PeriodTypes)) fieldErrors.period_type = "Escolhe o tipo de período.";
  if (!isKnownOption(values.main_goal, invest2030MainGoals)) fieldErrors.main_goal = "Escolhe o objetivo principal.";
  if (!values.target_audience) fieldErrors.target_audience = "Descreve o público-alvo.";
  if (!values.main_cta) fieldErrors.main_cta = "Escreve o texto do botão principal.";
  if (!values.main_message) fieldErrors.main_message = "Escreve a mensagem principal.";
  if (!values.mandatory_info) fieldErrors.mandatory_info = "Indica a informação obrigatória a mencionar.";
  if (!isKnownOption(values.information_status, invest2030InformationStatuses)) {
    fieldErrors.information_status = "Escolhe o estado da informação.";
  }

  if (values.period_type === "Dia específico") {
    if (!values.period_date || !parseIsoDateValue(values.period_date)) {
      fieldErrors.period_date = "Escolhe uma data válida.";
    }
  }

  if (values.period_type === "Mês") {
    const [year, month] = values.period_month.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      fieldErrors.period_month = "Escolhe um mês válido.";
    }
  }

  if (values.period_type === "Semana" || values.period_type === "Período personalizado") {
    const start = parseIsoDateValue(values.period_start);
    const end = parseIsoDateValue(values.period_end);

    if (!start) fieldErrors.period_start = "Escolhe uma data de início válida.";
    if (!end) fieldErrors.period_end = "Escolhe uma data de fim válida.";
    if (start && end && end < start) fieldErrors.period_end = "A data de fim deve ser igual ou posterior à data de início.";
  }

  return fieldErrors;
}

async function findInvest2030ClientId(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .or("name.eq.Invest2030,client_code.eq.02_I2030,short_name.eq.I2030")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Cliente Invest2030 não encontrado.");
  return data.id as string;
}

async function sofiaAssignee(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("team_members")
    .select("name")
    .eq("name", "Sofia")
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Erro ao procurar responsável Sofia", { code: error.code, message: error.message });
    return null;
  }

  if (!data?.name) {
    console.error("Responsável Sofia não encontrada ou inativa para pedido Invest2030.");
  }

  return data?.name ?? null;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

async function findInvest2030RequestBySubmissionKey(supabase: SupabaseClient, submissionKey: string) {
  const { data, error } = await supabase
    .from("invest2030_requests")
    .select("id, task_id")
    .eq("submission_key", submissionKey)
    .maybeSingle();

  if (error) {
    console.error("Erro ao procurar submissão Invest2030 existente", {
      submissionKey,
      code: error.code,
      message: error.message,
    });
  }

  return data ?? null;
}

async function deleteInvest2030RequestDraft(supabase: SupabaseClient, requestId: string, context: Record<string, unknown>) {
  const { error } = await supabase.from("invest2030_requests").delete().eq("id", requestId);
  if (error) {
    console.error("Erro ao limpar pedido Invest2030 incompleto", {
      ...context,
      requestId,
      code: error.code,
      message: error.message,
    });
  }
}

async function deleteInvest2030TaskDraft(supabase: SupabaseClient, taskId: string, context: Record<string, unknown>) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.error("Erro ao limpar task Invest2030 incompleta", {
      ...context,
      taskId,
      code: error.code,
      message: error.message,
    });
  }
}

export async function createInvest2030RequestAction(
  _previousState: Invest2030RequestFormState,
  formData: FormData,
): Promise<Invest2030RequestFormState> {
  const accessToken = text(formData, "access");
  const honeypot = text(formData, "company_website");
  if (!isInvest2030PublicAccessToken(accessToken) || honeypot) {
    redirect("/invest2030/novo-pedido");
  }
  const validAccessToken = accessToken ?? "";
  const formFailureHref = (error: string) =>
    invest2030PublicHref("/invest2030/novo-pedido", validAccessToken, { error });
  const duplicateHref = () =>
    `/invest2030/pedidos?access=${encodeURIComponent(validAccessToken)}&duplicate=1`;

  const publicSupabase = await supabaseOrRedirect(`/invest2030/novo-pedido?access=${encodeURIComponent(validAccessToken)}`);
  const supabase = getSupabaseAdmin() ?? publicSupabase;
  const values = invest2030FormValues(formData);
  const rawSubmissionKey = text(formData, "submission_key");
  const submissionKey = isUuid(rawSubmissionKey) ? rawSubmissionKey : randomUUID();
  const fieldErrors = validateInvest2030FormValues(values);

  if (Object.keys(fieldErrors).length) {
    console.error("Erro ao validar formulário Invest2030", { fields: Object.keys(fieldErrors) });
    return invest2030ValidationError(values, fieldErrors, submissionKey);
  }

  if (!isUuid(rawSubmissionKey)) {
    console.error("Chave de submissão Invest2030 ausente ou inválida", { submissionKey: rawSubmissionKey });
    return invest2030ValidationError(
      values,
      {},
      submissionKey,
      "Não conseguimos validar esta submissão. Revê o pedido e tenta novamente.",
    );
  }

  let campaignName: string;
  let actionType: string;
  let requestedBy: string;
  let mainGoal: string;
  let targetAudience: string;
  let mainCta: string;
  let mainLink: string | null;
  let mainMessage: string;
  let mandatoryInfo: string;
  let informationStatus: string;
  let notes: string | null;
  let period: ReturnType<typeof invest2030PeriodPayload>;

  try {
    campaignName = values.campaign_name;
    actionType = values.action_type.join(", ");
    requestedBy = values.requested_by;
    mainGoal = values.main_goal;
    targetAudience = values.target_audience;
    mainCta = values.main_cta;
    mainLink = values.main_link || null;
    mainMessage = values.main_message;
    mandatoryInfo = values.mandatory_info;
    informationStatus = values.information_status;
    notes = values.notes || null;
    period = invest2030PeriodPayload(formData);
  } catch (error) {
    console.error("Erro ao validar formulário Invest2030", error);
    return invest2030ValidationError(values, {
      period_type: "Revê o período do pedido.",
    }, submissionKey);
  }

  const needsAttention = informationStatus !== "Informação completa";

  const existingRequest = await findInvest2030RequestBySubmissionKey(supabase, submissionKey);
  if (existingRequest) {
    refreshAll();
    redirect(duplicateHref());
  }

  const requestPayload = {
    submission_key: submissionKey,
    task_id: null,
    campaign_name: campaignName,
    action_type: actionType,
    requested_by: requestedBy,
    period_type: period.periodType,
    period_start: period.periodStart,
    period_end: period.periodEnd,
    period_label: period.periodLabel,
    main_goal: mainGoal,
    target_audience: targetAudience,
    main_cta: mainCta,
    main_link: mainLink,
    main_message: mainMessage,
    mandatory_info: mandatoryInfo,
    information_status: informationStatus,
    notes,
  };

  const { data: request, error: requestError } = await supabase
    .from("invest2030_requests")
    .insert(requestPayload)
    .select("id")
    .single();

  if (requestError) {
    if (requestError.code === "23505") {
      refreshAll();
      redirect(duplicateHref());
    }

    console.error("Erro ao gravar histórico Invest2030", {
      submissionKey,
      campaignName,
      actionType,
      requestedBy,
      code: requestError.code,
      message: requestError.message,
    });
    redirect(formFailureHref("history-error"));
  }

  const requestId = request.id as string;
  let taskId: string;
  const logContext = {
    requestId,
    submissionKey,
    campaignName,
    actionType,
    requestedBy,
  };

  try {
    const [clientId, assigneeName] = await Promise.all([
      findInvest2030ClientId(supabase),
      sofiaAssignee(supabase),
    ]);

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        client_id: clientId,
        title: `[Invest2030] ${actionType} — ${campaignName}`,
        type: "operations" as TaskType,
        status: "todo" as TaskStatus,
        priority: needsAttention ? ("urgent" as TaskPriority) : ("normal" as TaskPriority),
        assignee_name: assigneeName,
        due_date: period.dueDate,
        related_url: mainLink && mainLink.toLowerCase() !== "a criar" ? mainLink : null,
        is_blocked: needsAttention,
        blocker_reason: needsAttention ? informationStatus : null,
        notes: buildInvest2030TaskSummary({
          campaignName,
          actionType,
          requestedBy,
          periodLabel: period.periodLabel,
          mainGoal,
          targetAudience,
          mainCta,
          mainLink,
          mainMessage,
          mandatoryInfo,
          informationStatus,
          notes,
        }),
      })
      .select("id")
      .single();

    if (taskError) throw taskError;
    taskId = task.id;
  } catch (error) {
    await deleteInvest2030RequestDraft(supabase, requestId, logContext);
    console.error("Erro ao criar task Invest2030", {
      ...logContext,
      error,
    });
    redirect(formFailureHref("task-error"));
  }

  const { error: taskLinkError } = await supabase
    .from("invest2030_requests")
    .update({ task_id: taskId })
    .eq("id", requestId);

  if (taskLinkError) {
    await deleteInvest2030TaskDraft(supabase, taskId, logContext);
    await deleteInvest2030RequestDraft(supabase, requestId, logContext);
    console.error("Erro ao ligar task ao histórico Invest2030", {
      ...logContext,
      taskId,
      code: taskLinkError.code,
      message: taskLinkError.message,
    });
    redirect(formFailureHref("history-error"));
  }

  refreshAll();
  redirect(`/invest2030/pedidos?access=${encodeURIComponent(validAccessToken)}&created=1`);
}

function quickTodoViewValue(formData: FormData): QuickTodoView {
  const value = text(formData, "view");
  return value === "design" ? "design" : "marketing";
}

async function quickProfileKeyValue() {
  const profile = await currentOperationalProfile();
  return profile.key;
}

function quickTodoItemTypeValue(formData: FormData): QuickTodoItemType {
  return text(formData, "item_type") === "reminder" ? "reminder" : "todo";
}

export async function createQuickTodoAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = await quickProfileKeyValue();
  const itemType = quickTodoItemTypeValue(formData);
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .insert({
      view,
      profile_key: profileKey,
      text: requiredText(formData, "text"),
      item_type: itemType,
      done: false,
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function toggleQuickTodoAction(id: string, formData: FormData) {
  const profileKey = await quickProfileKeyValue();
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .update({ done: checked(formData, "done") })
    .eq("id", id)
    .eq("profile_key", profileKey)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function updateQuickTodoAction(id: string, formData: FormData) {
  const profileKey = await quickProfileKeyValue();
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .update({ text: requiredText(formData, "text") })
    .eq("id", id)
    .eq("profile_key", profileKey)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function deleteQuickTodoAction(id: string, _formData: FormData) {
  void _formData;
  const profileKey = await quickProfileKeyValue();
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { error } = await supabase
    .from("quick_todos")
    .delete()
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function createQuickNoteAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = await quickProfileKeyValue();
  const supabase = await supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase.from("quick_notes").insert({
    view,
    profile_key: profileKey,
    text: requiredText(formData, "text"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function saveQuickNoteAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = await quickProfileKeyValue();
  const noteId = text(formData, "note_id");
  const noteText = String(formData.get("text") ?? "");
  const trimmedNoteText = noteText.trim();
  const supabase = await getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickNoteActionResult;
  }

  if (!noteId && !trimmedNoteText) {
    return { ok: true } satisfies QuickNoteActionResult;
  }

  if (noteId && !trimmedNoteText) {
    const { error } = await supabase
      .from("quick_notes")
      .delete()
      .eq("id", noteId)
      .eq("profile_key", profileKey);

    if (error) return { ok: false, message: error.message };
    revalidatePath("/");
    return { ok: true } satisfies QuickNoteActionResult;
  }

  const query = noteId
    ? supabase
        .from("quick_notes")
        .update({ text: trimmedNoteText })
        .eq("id", noteId)
        .eq("profile_key", profileKey)
    : supabase.from("quick_notes").insert({
        view,
        profile_key: profileKey,
        text: trimmedNoteText,
      });

  const { data, error } = await query.select("*").single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, note: data };
}

export async function updateQuickNoteAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = await quickProfileKeyValue();
  const supabase = await supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_notes")
    .update({ text: requiredText(formData, "text") })
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function deleteQuickNoteAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = await quickProfileKeyValue();
  const supabase = await supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_notes")
    .delete()
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

function teamMemberPayload(formData: FormData) {
  return {
    name: requiredText(formData, "name"),
    role: text(formData, "role"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    links: parseLinksFormData(formData),
    active: true,
  };
}

export async function createTeamMemberAction(formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = await supabaseOrRedirect("/team");
  const { error } = await supabase.from("team_members").insert(teamMemberPayload(formData));

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

function companyContactPayload(formData: FormData) {
  return {
    label: requiredText(formData, "label"),
    email: requiredText(formData, "email"),
    phone: text(formData, "phone"),
    links: parseLinksFormData(formData),
  };
}

export async function createCompanyContactAction(formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = await supabaseOrRedirect("/team");
  const { error } = await supabase.from("company_contacts").insert(companyContactPayload(formData));

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function updateCompanyContactAction(id: string, formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = await supabaseOrRedirect("/team");
  const { error } = await supabase
    .from("company_contacts")
    .update(companyContactPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function deleteCompanyContactAction(id: string, formData?: FormData) {
  void formData;
  await requireGuilhermeOperationalProfile();
  const supabase = await supabaseOrRedirect("/team");
  const { error } = await supabase.from("company_contacts").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = await supabaseOrRedirect("/team");
  const { error } = await supabase
    .from("team_members")
    .update(teamMemberPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}
