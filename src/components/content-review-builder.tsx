"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
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
import { createContentReviewAction } from "@/lib/content-review-actions";
import {
  contentReviewSourceItems,
  defaultContentReviewIntroduction,
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

const fieldClass = "min-h-11 w-full rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 text-sm font-semibold text-[var(--bb-charcoal)] outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[var(--bb-primary-soft)]";
const textareaClass = `${fieldClass} min-h-24 resize-y py-3 leading-6`;

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
  const [isPending, startTransition] = useTransition();

  const sourceItems = useMemo(() => contentReviewSourceItems(items, clientId, month), [clientId, items, month]);
  const itemMap = useMemo(() => new Map(sourceItems.map((item) => [item.id, item])), [sourceItems]);
  const client = clients.find((candidate) => candidate.id === clientId) ?? null;
  const includedIds = blocks.flatMap((block) => block.contentIds);
  const excludedItems = sourceItems.filter((item) => !includedIds.includes(item.id));
  const absoluteLink = created && typeof window !== "undefined" ? `${window.location.origin}${created.path}` : "";
  function reset(nextClientId = clientId, nextMonth = month) {
    const nextItems = contentReviewSourceItems(items, nextClientId, nextMonth);
    const nextClient = clients.find((candidate) => candidate.id === nextClientId);
    setBlocks(defaultBlocks(nextItems));
    setSelectedIds([]);
    setCreated(null);
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
    affected.forEach((block) => block.assets.forEach((asset) => URL.revokeObjectURL(asset.url)));
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
    block.assets.forEach((asset) => URL.revokeObjectURL(asset.url));
    const replacements = block.contentIds.flatMap((contentId) => {
      const item = itemMap.get(contentId);
      return item ? defaultBlocks([item]) : [];
    });
    setBlocks((current) => current.flatMap((candidate) => candidate.key === block.key ? replacements : [candidate]));
  }

  function removeBlock(block: LocalBlock) {
    block.assets.forEach((asset) => URL.revokeObjectURL(asset.url));
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
    const nextAssets = Array.from(files).map((file) => ({
      key: makeKey("asset"),
      file,
      url: URL.createObjectURL(file),
      appliesToContentIds: [...block.contentIds],
    }));
    updateBlock(block.key, { assets: [...block.assets, ...nextAssets], noVisualConfirmed: false });
  }

  function removeAsset(block: LocalBlock, asset: LocalAsset) {
    URL.revokeObjectURL(asset.url);
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
      setMessage("Link criado. Confirma a página antes de o enviar ao cliente.");
    });
  }

  const previewReview = client ? buildPreview({ client, month, recipientName, recipientEmail, approvalDeadline, introduction, ownerName, blocks, itemMap }) : null;

  return (
    <>
      <button type="button" onClick={openBuilder} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]">
        <Link2 className="size-4" aria-hidden="true" />
        Preparar validação
      </button>
      {open ? createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/55 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-label="Preparar validação do cliente">
          <div className={`mx-auto min-h-full rounded-[28px] border border-white/50 bg-[#f3f3ef] shadow-[0_30px_100px_rgba(0,0,0,0.3)] ${preview ? "max-w-6xl" : "max-w-5xl"}`}>
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-[28px] border-b border-[var(--bb-border)] bg-[#f3f3ef]/95 px-4 py-3 backdrop-blur-xl md:px-6">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--bb-muted)]">Validação do cliente</div>
                <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">{preview ? "Pré-visualização final" : "Preparar planeamento"}</h2>
              </div>
              <div className="flex items-center gap-2">
                {preview ? <button type="button" onClick={() => setPreview(false)} className="min-h-10 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold">Voltar à preparação</button> : null}
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white"><X className="size-4" /></button>
              </div>
            </div>

            {preview && previewReview ? (
              <div className="grid gap-5 p-4 md:p-6">
                <div className="rounded-2xl border border-[rgba(83,183,223,0.32)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">Esta é a página que o cliente verá. A tabela-resumo surge primeiro e a validação acontece depois, bloco a bloco.</div>
                <ContentReviewPresentation review={previewReview} />
                <div className="flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/90 p-3">
                  <button type="button" onClick={() => setPreview(false)} className="min-h-11 rounded-full border border-[var(--bb-border)] px-5 text-sm font-extrabold">Corrigir preparação</button>
                  <button type="button" onClick={createReview} disabled={isPending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white disabled:opacity-50"><Send className="size-4" />{isPending ? "A criar..." : "Criar link para o cliente"}</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 p-4 md:p-6">
                <section className="grid gap-4 rounded-[22px] border border-[var(--bb-border)] bg-white/75 p-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-extrabold">Cliente
                    <select value={clientId} onChange={(event) => changeClient(event.currentTarget.value)} className={fieldClass}>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">Mês
                    <input type="month" value={month} onChange={(event) => changeMonth(event.currentTarget.value)} className={fieldClass} />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">Contacto do cliente
                    <input value={recipientName} onChange={(event) => setRecipientName(event.currentTarget.value)} className={fieldClass} placeholder="Nome" />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">Email do cliente
                    <input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.currentTarget.value)} className={fieldClass} placeholder="email@cliente.pt" />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">Data limite
                    <input type="date" value={approvalDeadline} onChange={(event) => setApprovalDeadline(event.currentTarget.value)} className={fieldClass} />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold md:col-span-2">Introdução
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
                        <input value={block.title} onChange={(event) => updateBlock(block.key, { title: event.currentTarget.value })} className={fieldClass} />
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
                      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold">Visuais</h4><p className="text-xs font-bold text-[var(--bb-muted)]">Cada visual pode aplicar-se ao bloco inteiro ou apenas a algumas variantes.</p></div><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"><ImagePlus className="size-4" />Adicionar imagens<input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(event) => { addAssets(block, event.currentTarget.files); event.currentTarget.value = ""; }} /></label></div>
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

                {excludedItems.length ? <section className="rounded-[22px] border border-dashed border-[var(--bb-border)] bg-white/45 p-4"><h3 className="text-sm font-extrabold">Conteúdos retirados desta validação</h3><div className="mt-3 flex flex-wrap gap-2">{excludedItems.map((item) => <button key={item.id} type="button" onClick={() => addExcluded(item)} className="inline-flex items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white px-3 py-2 text-xs font-extrabold"><Plus className="size-3" />{cleanPrefixedTitle(item.title, item.clients)}</button>)}</div></section> : null}

                {message ? <div role="status" className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">{message}</div> : null}
                {created ? <section className="rounded-[22px] border border-[#8fc7a1] bg-[#edf8ef] p-4"><div className="flex items-center gap-2 font-extrabold text-[#2f7650]"><Check className="size-4" />Link pronto</div><div className="mt-3 flex flex-wrap gap-2"><input readOnly value={absoluteLink} className={`${fieldClass} min-w-64 flex-1`} /><button type="button" onClick={() => void copyText(absoluteLink).then(() => setMessage("Link copiado."))} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white"><Copy className="size-4" />Copiar link</button><a href={created.path} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"><Eye className="size-4" />Abrir página</a></div></section> : null}
                <div className="sticky bottom-3 flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/95 p-3 shadow-xl backdrop-blur-xl"><Link href="/content/validations" className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] px-5 text-sm font-extrabold">Histórico</Link><button type="button" onClick={showPreview} disabled={!blocks.length} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white disabled:opacity-40"><Eye className="size-4" />Rever página do cliente</button></div>
              </div>
            )}
          </div>
        </div>, document.body) : null}
    </>
  );
}
