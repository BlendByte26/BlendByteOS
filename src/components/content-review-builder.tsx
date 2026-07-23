"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  ImagePlus,
  Layers3,
  Link2,
  Plus,
  Send,
  Split,
  Trash2,
  X,
} from "lucide-react";
import { ContentReviewPresentation } from "@/components/content-review-presentation";
import { DatePicker, MonthPicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { createContentReviewAction } from "@/lib/content-review-actions";
import {
  CONTENT_REVIEW_ASSET_MAX_BYTES,
  CONTENT_REVIEW_TOTAL_MAX_BYTES,
  contentReviewEmailSuggestion,
  contentReviewSourceItems,
  defaultContentReviewIntroduction,
  isContentReviewAssetMimeType,
  type ContentReviewView,
} from "@/lib/content-reviews";
import { formatContentMonthLabel } from "@/lib/content-month";
import { displayContentPlatform } from "@/lib/content-platform";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { Client, ContentItem } from "@/lib/types";

type LocalAsset = {
  key: string;
  file: File;
  url: string;
  appliesToContentIds: string[];
};

type LocalBlock = {
  key: string;
  title: string;
  contentIds: string[];
  assets: LocalAsset[];
  noVisualConfirmed: boolean;
};

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const textareaClass = "bb-textarea min-h-24 text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid min-w-0 gap-2 text-sm font-bold text-[var(--bb-charcoal)]";

function makeKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultBlocks(items: ContentItem[]): LocalBlock[] {
  return items.map((item) => ({
    key: makeKey("block"),
    title: cleanPrefixedTitle(item.title, item.clients),
    contentIds: [item.id],
    assets: [],
    noVisualConfirmed: false,
  }));
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function copyText(value: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function buildPreview({
  client,
  month,
  recipientName,
  recipientEmail,
  approvalDeadline,
  introduction,
  ownerName,
  blocks,
  itemMap,
}: {
  client: Client;
  month: string;
  recipientName: string;
  recipientEmail: string;
  approvalDeadline: string;
  introduction: string;
  ownerName: string;
  blocks: LocalBlock[];
  itemMap: Map<string, ContentItem>;
}): ContentReviewView {
  const now = new Date().toISOString();
  return {
    id: "preview",
    client_id: client.id,
    month,
    version: 1,
    status: "draft",
    access_token_hash: "",
    client_name: client.name,
    client_logo_url: client.logo_url,
    recipient_name: recipientName || null,
    recipient_email: recipientEmail || null,
    approval_deadline: approvalDeadline || null,
    introduction: introduction || null,
    owner_profile_key: ownerName === "Sofia" ? "sofia" : "guilherme",
    owner_name: ownerName,
    submitted_by_name: null,
    submitted_by_email: null,
    published_at: now,
    submitted_at: null,
    archived_at: null,
    archived_by_profile_key: null,
    archived_by_name: null,
    created_at: now,
    updated_at: now,
    blocks: blocks.map((block, blockIndex) => {
      const itemIds = new Map(block.contentIds.map((contentId) => [contentId, `preview-item-${contentId}`]));
      return {
        id: block.key,
        round_id: "preview",
        title: block.title,
        position: blockIndex,
        decision: "pending",
        client_comment: null,
        feedback_submitted_at: null,
        revision_task_id: null,
        revision_started_at: null,
        created_at: now,
        updated_at: now,
        items: block.contentIds.flatMap((contentId, position) => {
          const item = itemMap.get(contentId);
          return item ? [{
            id: itemIds.get(contentId)!,
            block_id: block.key,
            content_item_id: item.id,
            position,
            publish_date: item.publish_date,
            publish_time: item.publish_time,
            platform: item.platform,
            format: item.format,
            title: cleanPrefixedTitle(item.title, item.clients),
            copy_text: item.copy_text,
            description: item.description,
            content_updated_at: item.updated_at,
            created_at: now,
            updated_at: now,
          }] : [];
        }),
        assets: block.assets.map((asset, position) => ({
          id: asset.key,
          block_id: block.key,
          storage_path: "",
          original_name: asset.file.name,
          mime_type: asset.file.type as "image/png" | "image/jpeg" | "image/webp",
          position,
          created_at: now,
          updated_at: now,
          url: asset.url,
          applies_to_item_ids: asset.appliesToContentIds.map((id) => itemIds.get(id)!).filter(Boolean),
        })),
      };
    }),
  };
}

export function ContentReviewBuilder({
  clients,
  items,
  defaultClientId = "",
  defaultMonth,
  ownerName,
  canPersist,
}: {
  clients: Client[];
  items: ContentItem[];
  defaultClientId?: string;
  defaultMonth: string;
  ownerName: string;
  canPersist: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || "");
  const [month, setMonth] = useState(defaultMonth);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [approvalDeadline, setApprovalDeadline] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [blocks, setBlocks] = useState<LocalBlock[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<{ path: string; roundId: string } | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const assetUrlsRef = useRef(new Set<string>());

  const sourceItems = useMemo(() => contentReviewSourceItems(items, clientId, month), [clientId, items, month]);
  const itemMap = useMemo(() => new Map(sourceItems.map((item) => [item.id, item])), [sourceItems]);
  const client = clients.find((candidate) => candidate.id === clientId) ?? null;
  const includedIds = blocks.flatMap((block) => block.contentIds);
  const excludedItems = sourceItems.filter((item) => !includedIds.includes(item.id));
  const absoluteLink = created && typeof window !== "undefined" ? `${window.location.origin}${created.path}` : "";

  useEffect(() => {
    const assetUrls = assetUrlsRef.current;
    return () => {
      assetUrls.forEach((url) => URL.revokeObjectURL(url));
      assetUrls.clear();
    };
  }, []);

  function createAssetUrl(file: File) {
    const url = URL.createObjectURL(file);
    assetUrlsRef.current.add(url);
    return url;
  }

  function revokeAssetUrl(url: string) {
    URL.revokeObjectURL(url);
    assetUrlsRef.current.delete(url);
  }

  function revokeBlockAssets(blocksToRevoke: LocalBlock[]) {
    blocksToRevoke.forEach((block) => block.assets.forEach((asset) => revokeAssetUrl(asset.url)));
  }

  function reset(nextClientId = clientId, nextMonth = month) {
    const nextItems = contentReviewSourceItems(items, nextClientId, nextMonth);
    const nextClient = clients.find((candidate) => candidate.id === nextClientId);
    revokeBlockAssets(blocks);
    setBlocks(defaultBlocks(nextItems));
    setSelectedIds([]);
    setCreated(null);
    setEmailSubject("");
    setEmailBody("");
    setMessage(null);
    setRecipientName(nextClient?.contact_name ?? "");
    setRecipientEmail(nextClient?.contact_email ?? "");
    setIntroduction(nextClient ? defaultContentReviewIntroduction(nextClient, formatContentMonthLabel(nextMonth)) : "");
  }

  function openBuilder() {
    const nextClientId = defaultClientId || clients[0]?.id || "";
    setClientId(nextClientId);
    setMonth(defaultMonth);
    setPreview(false);
    reset(nextClientId, defaultMonth);
    setOpen(true);
  }

  function closeBuilder() {
    setOpen(false);
    revokeBlockAssets(blocks);
    setBlocks([]);
    if (created) router.refresh();
  }

  function changeClient(nextClientId: string) {
    setClientId(nextClientId);
    reset(nextClientId, month);
  }

  function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    reset(clientId, nextMonth);
  }

  function updateBlock(key: string, patch: Partial<LocalBlock>) {
    setBlocks((current) => current.map((block) => block.key === key ? { ...block, ...patch } : block));
  }

  function groupSelection() {
    if (selectedIds.length < 2) {
      setMessage("Seleciona pelo menos dois conteúdos para os apresentar no mesmo bloco.");
      return;
    }
    const affected = blocks.filter((block) => block.contentIds.some((id) => selectedIds.includes(id)));
    const unaffected = blocks.filter((block) => !block.contentIds.some((id) => selectedIds.includes(id)));
    const firstIndex = Math.min(...affected.map((block) => blocks.indexOf(block)));
    const contentIds = affected.flatMap((block) => block.contentIds);
    revokeBlockAssets(affected);
    const firstItem = itemMap.get(contentIds[0] ?? "");
    const grouped: LocalBlock = {
      key: makeKey("block"),
      title: firstItem ? cleanPrefixedTitle(firstItem.title, firstItem.clients) : "Bloco de conteúdos",
      contentIds,
      assets: [],
      noVisualConfirmed: false,
    };
    const next = [...unaffected];
    next.splice(Math.min(firstIndex, next.length), 0, grouped);
    setBlocks(next);
    setSelectedIds([]);
    setMessage("Conteúdos agrupados. Adiciona agora o visual comum e ajusta o título do bloco.");
  }

  function splitBlock(block: LocalBlock) {
    revokeBlockAssets([block]);
    const replacements = block.contentIds.flatMap((contentId) => {
      const item = itemMap.get(contentId);
      return item ? defaultBlocks([item]) : [];
    });
    setBlocks((current) => current.flatMap((candidate) => candidate.key === block.key ? replacements : [candidate]));
  }

  function removeBlock(block: LocalBlock) {
    revokeBlockAssets([block]);
    setBlocks((current) => current.filter((candidate) => candidate.key !== block.key));
    setSelectedIds((current) => current.filter((id) => !block.contentIds.includes(id)));
  }

  function addExcluded(item: ContentItem) {
    setBlocks((current) => [...current, ...defaultBlocks([item])]);
  }

  function moveBlock(key: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.key === key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [block] = next.splice(index, 1);
      next.splice(nextIndex, 0, block!);
      return next;
    });
  }

  function addAssets(block: LocalBlock, files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const invalidType = selectedFiles.find((file) => !isContentReviewAssetMimeType(file.type));
    if (invalidType) {
      setMessage(`O ficheiro “${invalidType.name}” deve ser PNG, JPG ou WebP.`);
      return;
    }
    const oversized = selectedFiles.find((file) => file.size > CONTENT_REVIEW_ASSET_MAX_BYTES);
    if (oversized) {
      setMessage(`O ficheiro “${oversized.name}” não pode exceder 8 MB.`);
      return;
    }
    const currentTotalSize = blocks.reduce(
      (total, currentBlock) => total + currentBlock.assets.reduce((blockTotal, asset) => blockTotal + asset.file.size, 0),
      0,
    );
    const selectedTotalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
    if (currentTotalSize + selectedTotalSize > CONTENT_REVIEW_TOTAL_MAX_BYTES) {
      setMessage("O conjunto de visuais não pode exceder 28 MB por aprovação.");
      return;
    }
    const nextAssets = selectedFiles.map((file) => ({
      key: makeKey("asset"),
      file,
      url: createAssetUrl(file),
      appliesToContentIds: [...block.contentIds],
    }));
    setMessage(null);
    updateBlock(block.key, { assets: [...block.assets, ...nextAssets], noVisualConfirmed: false });
  }

  function removeAsset(block: LocalBlock, asset: LocalAsset) {
    revokeAssetUrl(asset.url);
    updateBlock(block.key, { assets: block.assets.filter((candidate) => candidate.key !== asset.key) });
  }

  function toggleAssetScope(block: LocalBlock, asset: LocalAsset, contentId: string) {
    const appliesToContentIds = asset.appliesToContentIds.includes(contentId)
      ? asset.appliesToContentIds.filter((id) => id !== contentId)
      : [...asset.appliesToContentIds, contentId];
    updateBlock(block.key, {
      assets: block.assets.map((candidate) => candidate.key === asset.key ? { ...candidate, appliesToContentIds } : candidate),
    });
  }

  function validationMessage() {
    if (!client || !month || !blocks.length) return "Escolhe cliente, mês e pelo menos um conteúdo.";
    if (blocks.some((block) => !block.title.trim())) return "Todos os blocos precisam de título.";
    if (blocks.some((block) => !block.assets.length && !block.noVisualConfirmed)) return "Adiciona os visuais ou confirma explicitamente os blocos sem visual.";
    if (blocks.some((block) => block.assets.some((asset) => !asset.appliesToContentIds.length))) return "Cada visual deve estar associado a pelo menos um conteúdo.";
    return null;
  }

  function showPreview() {
    const error = validationMessage();
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setPreview(true);
  }

  function createReview() {
    const error = validationMessage();
    if (error) {
      setMessage(error);
      return;
    }
    if (!canPersist) {
      setMessage("A pré-visualização funciona em modo local, mas é preciso ligar a base de dados e aplicar a migração para gerar o link.");
      return;
    }
    const formData = new FormData();
    formData.set("payload", JSON.stringify({
      clientId,
      month,
      recipientName: recipientName.trim() || null,
      recipientEmail: recipientEmail.trim() || null,
      approvalDeadline: approvalDeadline || null,
      introduction: introduction.trim() || null,
      blocks: blocks.map((block) => ({
        key: block.key,
        title: block.title.trim(),
        contentIds: block.contentIds,
        assets: block.assets.map((asset) => ({ key: asset.key, appliesToContentIds: asset.appliesToContentIds })),
      })),
    }));
    blocks.forEach((block) => block.assets.forEach((asset) => formData.set(`asset:${asset.key}`, asset.file)));
    startTransition(async () => {
      const result = await createContentReviewAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCreated({ path: result.path, roundId: result.roundId });
      const link = `${window.location.origin}${result.path}`;
      const email = contentReviewEmailSuggestion({
        clientName: client!.name,
        month,
        recipientName,
        approvalDeadline,
        ownerName,
        link,
      });
      setEmailSubject(email.subject);
      setEmailBody(email.body);
      setMessage(null);
    });
  }

  const previewReview = client ? buildPreview({ client, month, recipientName, recipientEmail, approvalDeadline, introduction, ownerName, blocks, itemMap }) : null;

  return (
    <>
      <button type="button" onClick={openBuilder} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]">
        <Link2 className="size-4" aria-hidden="true" />
        Preparar aprovação
      </button>
      {open ? createPortal(
        <div className="fixed inset-0 z-[200] overflow-hidden bg-black/55 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-label="Preparar aprovação do cliente">
          <div className={`mx-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-white/50 bg-[#f3f3ef] shadow-[0_30px_100px_rgba(0,0,0,0.3)] md:max-h-[calc(100dvh-3rem)] ${preview && !created ? "max-w-6xl" : "max-w-5xl"}`}>
            <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-[28px] border-b border-[var(--bb-border)] bg-[#f3f3ef] px-4 py-3 md:px-6">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--bb-muted)]">Aprovação do cliente</div>
                <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">{created ? "Link pronto a partilhar" : preview ? "Pré-visualização final" : "Preparar planeamento"}</h2>
              </div>
              <div className="flex items-center gap-2">
                {preview && !created ? <button type="button" onClick={() => setPreview(false)} className="min-h-10 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold">Voltar à preparação</button> : null}
                <button type="button" onClick={closeBuilder} aria-label="Fechar" className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white"><X className="size-4" /></button>
              </div>
            </div>

            {created ? (
              <div className="grid gap-5 p-4 md:p-6">
                <section className="rounded-[22px] border border-[#8fc7a1] bg-[#edf8ef] p-5 md:p-6">
                  <div className="flex items-center gap-2 text-lg font-extrabold text-[#2f7650]"><Check className="size-5" />Link criado e pronto a partilhar</div>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--bb-charcoal)]">A página do cliente já está disponível. Copia este link agora ou abre-o num novo separador para fazer uma última confirmação.</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input readOnly value={absoluteLink} aria-label="Link da aprovação do cliente" className={inputClass} />
                    <button type="button" onClick={() => void copyText(absoluteLink).then(() => setMessage("Link copiado."))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white"><Copy className="size-4" />Copiar link</button>
                    <a href={created.path} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"><Eye className="size-4" />Abrir página</a>
                  </div>
                </section>
                <section className="rounded-[22px] border border-[var(--bb-border)] bg-white/80 p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Email sugerido</h3>
                      <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">Pode adaptar o assunto e a mensagem antes de copiar.</p>
                    </div>
                    {recipientEmail ? <span className="rounded-full bg-[var(--bb-primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--bb-charcoal)]">Para: {recipientEmail}</span> : null}
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className={labelClass}>Assunto
                      <input value={emailSubject} onChange={(event) => setEmailSubject(event.currentTarget.value)} className={inputClass} />
                    </label>
                    <label className={labelClass}>Mensagem
                      <textarea value={emailBody} onChange={(event) => setEmailBody(event.currentTarget.value)} rows={12} className={`${textareaClass} min-h-72`} />
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={() => void copyText(`Assunto: ${emailSubject}\n\n${emailBody}`).then(() => setMessage("Email copiado."))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white"><Copy className="size-4" />Copiar email</button>
                  </div>
                </section>
                {message ? <div role="status" className="rounded-2xl border border-[#8fc7a1] bg-[#edf8ef] px-4 py-3 text-sm font-bold text-[#2f7650]">{message}</div> : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Link href={`/approvals/${created.roundId}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white px-5 text-sm font-extrabold">Ver aprovação</Link>
                  <button type="button" onClick={closeBuilder} className="min-h-11 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white">Fechar e voltar aos conteúdos</button>
                </div>
              </div>
            ) : preview && previewReview ? (
              <div className="grid gap-5 p-4 md:p-6">
                <div className="rounded-2xl border border-[rgba(83,183,223,0.32)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">Esta é a página que o cliente verá. A tabela-resumo surge primeiro e a aprovação acontece depois, bloco a bloco.</div>
                <ContentReviewPresentation review={previewReview} />
                {message ? <div role="status" className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">{message}</div> : null}
                <div className="flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/90 p-3">
                  <button type="button" onClick={() => setPreview(false)} className="min-h-11 rounded-full border border-[var(--bb-border)] px-5 text-sm font-extrabold">Corrigir preparação</button>
                  <button type="button" onClick={createReview} disabled={isPending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white disabled:opacity-50"><Send className="size-4" />{isPending ? "A criar..." : "Criar link para o cliente"}</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 p-4 md:p-6">
                <section className="grid gap-4 rounded-[22px] border border-[var(--bb-border)] bg-white/75 p-4 md:grid-cols-2">
                  <div className={labelClass}><span>Cliente</span>
                    <SelectField name="content_review_client" value={clientId} onValueChange={changeClient} ariaLabel="Cliente da aprovação" options={clients.map((item) => ({ value: item.id, label: item.name }))} />
                  </div>
                  <div className={labelClass}><span>Mês</span>
                    <MonthPicker name="content_review_month" value={month} onValueChange={changeMonth} ariaLabel="Mês do planeamento" />
                  </div>
                  <label className={labelClass}>Contacto do cliente
                    <input value={recipientName} onChange={(event) => setRecipientName(event.currentTarget.value)} className={inputClass} placeholder="Nome" />
                  </label>
                  <label className={labelClass}>Email do cliente
                    <input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.currentTarget.value)} className={inputClass} placeholder="email@cliente.pt" />
                  </label>
                  <div className={labelClass}><span>Data limite</span>
                    <DatePicker name="content_review_deadline" value={approvalDeadline} onValueChange={setApprovalDeadline} initialMonth={month} ariaLabel="Data limite de resposta" />
                  </div>
                  <label className={`${labelClass} md:col-span-2`}>Introdução
                    <textarea value={introduction} onChange={(event) => setIntroduction(event.currentTarget.value)} className={textareaClass} />
                  </label>
                </section>

                {sourceItems.length ? (
                  <section className="grid gap-3 rounded-[22px] border border-[var(--bb-border)] bg-white/75 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="font-extrabold">Agrupar conteúdos com o mesmo visual</h3><p className="mt-1 text-xs font-bold text-[var(--bb-muted)]">Seleciona variantes — por exemplo Instagram, LinkedIn e Story — e junta-as num único bloco.</p></div>
                      <button type="button" onClick={groupSelection} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"><Layers3 className="size-4" />Agrupar seleção ({selectedIds.length})</button>
                    </div>
                    <div className="flex flex-wrap gap-2">{sourceItems.filter((item) => includedIds.includes(item.id)).map((item) => {
                      const selected = selectedIds.includes(item.id);
                      return <button key={item.id} type="button" onClick={() => setSelectedIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`rounded-full border px-3 py-2 text-left text-xs font-extrabold transition ${selected ? "border-[var(--bb-primary)] bg-[var(--bb-primary)] text-[var(--bb-black)]" : "border-[var(--bb-border)] bg-white text-[var(--bb-charcoal)]"}`}><span className="opacity-65">{displayContentPlatform(item.platform)} · </span>{cleanPrefixedTitle(item.title, item.clients)}</button>;
                    })}</div>
                  </section>
                ) : <div className="rounded-[22px] border border-dashed border-[var(--bb-border)] bg-white/55 p-8 text-center font-bold text-[var(--bb-muted)]">Não há conteúdos ativos deste cliente no mês escolhido.</div>}

                <div className="grid gap-4">{blocks.map((block, blockIndex) => (
                  <section key={block.key} className="rounded-[22px] border border-[var(--bb-border)] bg-white/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--bb-black)] text-xs font-extrabold text-white">{blockIndex + 1}</div>
                      <label className="grid min-w-52 flex-1 gap-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Título do bloco
                        <input value={block.title} onChange={(event) => updateBlock(block.key, { title: event.currentTarget.value })} className={inputClass} />
                      </label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveBlock(block.key, -1)} disabled={!blockIndex} aria-label="Subir bloco" className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
                        <button type="button" onClick={() => moveBlock(block.key, 1)} disabled={blockIndex === blocks.length - 1} aria-label="Descer bloco" className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
                        {block.contentIds.length > 1 ? <button type="button" onClick={() => splitBlock(block)} aria-label="Separar conteúdos" title="Separar conteúdos" className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white"><Split className="size-4" /></button> : null}
                        <button type="button" onClick={() => removeBlock(block)} aria-label="Retirar bloco" className="grid size-9 place-items-center rounded-full border border-[rgba(232,76,49,0.25)] bg-[var(--bb-red-soft)] text-[#9d3827]"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">{block.contentIds.map((contentId) => {
                      const item = itemMap.get(contentId);
                      return item ? <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#f5f5f1] px-3 py-2 text-xs font-bold"><span><strong>{displayContentPlatform(item.platform)}</strong>{item.format ? ` · ${item.format}` : ""} — {cleanPrefixedTitle(item.title, item.clients)}</span><span className="text-[var(--bb-muted)]">{formatDate(item.publish_date)}</span></div> : null;
                    })}</div>
                    <div className="mt-4 grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold">Visuais</h4><p className="text-xs font-bold text-[var(--bb-muted)]">Cada visual pode aplicar-se ao bloco inteiro ou apenas a algumas variantes. PNG, JPEG ou WebP · máximo 8 MB por imagem.</p></div><label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold focus-within:border-[var(--bb-black)] focus-within:ring-2 focus-within:ring-[var(--bb-primary)]"><ImagePlus className="size-4" />Adicionar imagens<input type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="Adicionar imagens" className="absolute inset-0 z-10 size-full cursor-pointer opacity-0" onChange={(event) => { addAssets(block, event.currentTarget.files); event.currentTarget.value = ""; }} /></label></div>
                      {block.assets.map((asset) => <div key={asset.key} className="grid gap-3 rounded-2xl border border-[var(--bb-border)] bg-[#f7f7f4] p-3 sm:grid-cols-[120px_1fr_auto]">
                        {/* Signed local object URL; Next image optimization is not applicable. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt="Pré-visualização do visual" className="h-28 w-full rounded-xl bg-white object-contain" />
                        <div><div className="truncate text-sm font-extrabold">{asset.file.name}</div><div className="mt-2 flex flex-wrap gap-2">{block.contentIds.map((contentId) => { const item = itemMap.get(contentId); const active = asset.appliesToContentIds.includes(contentId); return <button key={contentId} type="button" onClick={() => toggleAssetScope(block, asset, contentId)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold ${active ? "border-[#5f9d72] bg-[#e7f3e9] text-[#2f7650]" : "border-[var(--bb-border)] bg-white text-[var(--bb-muted)]"}`}>{active ? <Check className="size-3" /> : null}{item ? displayContentPlatform(item.platform) : "Conteúdo"}</button>; })}</div></div>
                        <button type="button" onClick={() => removeAsset(block, asset)} aria-label="Remover visual" className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white"><X className="size-4" /></button>
                      </div>)}
                      {!block.assets.length ? <label className="inline-flex w-fit items-center gap-2 text-xs font-extrabold text-[var(--bb-muted)]"><input type="checkbox" checked={block.noVisualConfirmed} onChange={(event) => updateBlock(block.key, { noVisualConfirmed: event.currentTarget.checked })} className="size-4 accent-[var(--bb-primary)]" />Este bloco é intencionalmente apresentado sem visual</label> : null}
                    </div>
                  </section>
                ))}</div>

                {excludedItems.length ? <section className="rounded-[22px] border border-dashed border-[var(--bb-border)] bg-white/45 p-4"><h3 className="text-sm font-extrabold">Conteúdos retirados desta aprovação</h3><div className="mt-3 flex flex-wrap gap-2">{excludedItems.map((item) => <button key={item.id} type="button" onClick={() => addExcluded(item)} className="inline-flex items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white px-3 py-2 text-xs font-extrabold"><Plus className="size-3" />{cleanPrefixedTitle(item.title, item.clients)}</button>)}</div></section> : null}

                {message ? <div role="status" className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">{message}</div> : null}
                <div className="sticky bottom-3 flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/95 p-3 shadow-xl backdrop-blur-xl"><Link href="/approvals" className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] px-5 text-sm font-extrabold">Aprovações</Link><button type="button" onClick={showPreview} disabled={!blocks.length} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white disabled:opacity-40"><Eye className="size-4" />Rever página do cliente</button></div>
              </div>
            )}
          </div>
        </div>, document.body) : null}
    </>
  );
}
