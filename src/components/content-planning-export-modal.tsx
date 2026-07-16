"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  X,
} from "lucide-react";
import { DatePicker, MonthPicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import {
  buildEmailDraft,
  buildExportItemInput,
  contentItemsForPlanningPeriod,
  defaultApprovalInstructions,
  displayExportClient,
  documentTitleDefaults,
  planningPlatformList,
  type ContentPlanningExportItemInput,
  type ContentPlanningLanguage,
} from "@/lib/content-planning-export";
import { displayContentPlatform } from "@/lib/content-platform";
import type { Client, ContentItem } from "@/lib/types";

type ContentPlanningExportModalProps = {
  clients: Client[];
  items: ContentItem[];
  defaultClientId?: string;
  defaultMonth?: string;
  defaultPreparedByName: string;
  defaultPreparedByEmail: string;
};

type EditableExportItem = ContentPlanningExportItemInput & {
  selected: boolean;
  open: boolean;
};

const languageOptions = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
];
const inputClass =
  "min-h-11 w-full min-w-0 rounded-2xl border border-[var(--bb-border)] bg-white/80 px-3.5 text-sm font-semibold text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const textareaClass =
  "min-h-24 w-full min-w-0 resize-y rounded-2xl border border-[var(--bb-border)] bg-white/80 px-3.5 py-3 text-sm font-semibold leading-6 text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const labelClass = "grid min-w-0 gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const sectionClass = "rounded-[20px] border border-[var(--bb-border)] bg-white/55 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)]";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clientOptions(clients: Client[]) {
  return clients.map((client) => ({ value: client.id, label: displayExportClient(client) }));
}

function parseFilename(disposition: string | null) {
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? "Planeamento_Conteudos.pdf";
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildEditableItems(sourceItems: ContentItem[]): EditableExportItem[] {
  return sourceItems.map((item, index) => ({
    ...buildExportItemInput(item),
    selected: true,
    open: index === 0,
  }));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function selectedExportInputs(items: EditableExportItem[]) {
  return items
    .filter((item) => item.selected)
    .map((item) => ({
      id: item.id,
      title: item.title,
      publishDate: item.publishDate,
      publishTime: item.publishTime,
      format: item.format,
      platform: item.platform,
      objective: item.objective,
      copy: item.copy,
      caption: item.caption,
    }));
}

export function ContentPlanningExportModal({
  clients,
  items,
  defaultClientId = "",
  defaultMonth = "",
  defaultPreparedByName,
  defaultPreparedByEmail,
}: ContentPlanningExportModalProps) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || "");
  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [language, setLanguage] = useState<ContentPlanningLanguage>("pt");
  const [documentTitle, setDocumentTitle] = useState(documentTitleDefaults.pt);
  const [monthlyObjective, setMonthlyObjective] = useState("");
  const [monthlyThemes, setMonthlyThemes] = useState("");
  const [preparedByName, setPreparedByName] = useState(defaultPreparedByName);
  const [preparedByEmail, setPreparedByEmail] = useState(defaultPreparedByEmail);
  const [website, setWebsite] = useState("blendbyte.pt");
  const [clientContactName, setClientContactName] = useState("");
  const [approvalDeadline, setApprovalDeadline] = useState("");
  const [approvalInstructions, setApprovalInstructions] = useState(defaultApprovalInstructions("pt", month));
  const initialDraft = buildEmailDraft({
    language: "pt",
    clientName: clients.find((client) => client.id === clientId)?.name ?? "Cliente",
    month,
    preparedByName: defaultPreparedByName,
    preparedByEmail: defaultPreparedByEmail,
    website: "blendbyte.pt",
  });
  const [emailSubject, setEmailSubject] = useState(initialDraft.subject);
  const [emailBody, setEmailBody] = useState(initialDraft.body);
  const [editableItems, setEditableItems] = useState<EditableExportItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedItems = editableItems.filter((item) => item.selected);
  const platformList = useMemo(
    () => planningPlatformList(selectedItems.map((item) => ({ platform: item.platform ?? "" }))),
    [selectedItems],
  );
  const warnings = [
    selectedItems.some((item) => !item.publishDate) ? "Há conteúdos selecionados sem data." : null,
    selectedItems.some((item) => !item.copy?.trim()) ? "Há conteúdos sem texto do criativo." : null,
    selectedItems.some((item) => !item.caption?.trim()) ? "Há conteúdos sem legenda." : null,
    selectedItems.some((item) => !item.objective?.trim()) ? "Há conteúdos sem objetivo individual." : null,
    !clientContactName.trim() ? "O contacto do cliente está vazio." : null,
    !approvalDeadline.trim() ? "A data limite de aprovação está vazia." : null,
  ].filter(Boolean) as string[];

  function draftFor(next?: Partial<{
    language: ContentPlanningLanguage;
    clientId: string;
    month: string;
    monthlyThemes: string;
    monthlyObjective: string;
    clientContactName: string;
    approvalDeadline: string;
    preparedByName: string;
    preparedByEmail: string;
    website: string;
  }>) {
    const nextLanguage = next?.language ?? language;
    const nextClientId = next?.clientId ?? clientId;
    const nextClient = clients.find((currentClient) => currentClient.id === nextClientId);

    return buildEmailDraft({
      language: nextLanguage,
      clientName: nextClient?.name ?? "Cliente",
      month: next?.month ?? month,
      contactName: next?.clientContactName ?? clientContactName,
      monthlyThemes: next?.monthlyThemes ?? monthlyThemes,
      monthlyObjective: next?.monthlyObjective ?? monthlyObjective,
      approvalDeadline: next?.approvalDeadline ?? approvalDeadline,
      preparedByName: next?.preparedByName ?? preparedByName,
      preparedByEmail: next?.preparedByEmail ?? preparedByEmail,
      website: next?.website ?? website,
    });
  }

  function refreshDraft(next?: Parameters<typeof draftFor>[0]) {
    const draft = draftFor(next);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
  }

  function resetItems(nextClientId: string, nextMonth: string) {
    setEditableItems(buildEditableItems(contentItemsForPlanningPeriod(items, nextClientId, nextMonth)));
  }

  function openModal() {
    const nextClientId = defaultClientId || clients[0]?.id || "";
    const nextMonth = defaultMonth || currentMonth();
    setClientId(nextClientId);
    setMonth(nextMonth);
    setApprovalInstructions(defaultApprovalInstructions(language, nextMonth));
    refreshDraft({ clientId: nextClientId, month: nextMonth });
    resetItems(nextClientId, nextMonth);
    setMessage(null);
    setCopyMessage(null);
    setOpen(true);
  }

  function changeClient(nextClientId: string) {
    setClientId(nextClientId);
    resetItems(nextClientId, month);
    refreshDraft({ clientId: nextClientId });
  }

  function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    setApprovalInstructions(defaultApprovalInstructions(language, nextMonth));
    resetItems(clientId, nextMonth);
    refreshDraft({ month: nextMonth });
  }

  function changeLanguage(nextLanguage: string) {
    const cleanLanguage: ContentPlanningLanguage = nextLanguage === "en" ? "en" : "pt";
    setLanguage(cleanLanguage);
    setDocumentTitle(documentTitleDefaults[cleanLanguage]);
    setApprovalInstructions(defaultApprovalInstructions(cleanLanguage, month));
    refreshDraft({ language: cleanLanguage });
  }

  function updateEditableItem(id: string, patch: Partial<EditableExportItem>) {
    setEditableItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function moveItem(id: string, direction: -1 | 1) {
    setEditableItems((currentItems) => {
      const index = currentItems.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentItems.length) return currentItems;
      const nextItems = [...currentItems];
      const [item] = nextItems.splice(index, 1);
      if (!item) return currentItems;
      nextItems.splice(nextIndex, 0, item);
      return nextItems;
    });
  }

  function selectAll() {
    setEditableItems((currentItems) => currentItems.map((item) => ({ ...item, selected: true })));
  }

  function clearSelection() {
    setEditableItems((currentItems) => currentItems.map((item) => ({ ...item, selected: false })));
  }

  async function copyText(value: string, label: string) {
    if (!navigator.clipboard) {
      fallbackCopy(value);
    } else {
      await navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
    }
    setCopyMessage(`${label} copiado.`);
  }

  function validationMessage() {
    if (!clientId) return "Escolhe um cliente antes de gerar o PDF.";
    if (!month) return "Escolhe um mês e ano antes de gerar o PDF.";
    if (!monthlyObjective.trim()) return "Preenche o objetivo do mês.";
    if (!selectedItems.length) return "Seleciona pelo menos um conteúdo.";
    if (!preparedByName.trim()) return "Indica o nome de quem preparou o documento.";
    if (!preparedByEmail.trim()) return "Indica o email de quem preparou o documento.";
    return null;
  }

  async function generatePdf() {
    setMessage(null);
    setCopyMessage(null);
    const invalidMessage = validationMessage();
    if (invalidMessage) {
      setMessage(invalidMessage);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-planning/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          month,
          language,
          documentTitle,
          monthlyObjective,
          monthlyThemes,
          preparedByName,
          preparedByEmail,
          website,
          clientContactName,
          approvalDeadline,
          approvalInstructions,
          emailSubject,
          emailBody,
          items: selectedExportInputs(editableItems),
        }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(error?.message ?? "Não foi possível gerar o PDF.");
        return;
      }

      const blob = await response.blob();
      const filename = parseFilename(response.headers.get("content-disposition"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("PDF gerado. O rascunho de email continua disponível abaixo.");
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
      setMessage("Não foi possível gerar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  function closeModal() {
    if (isGenerating) return;
    setOpen(false);
    setMessage(null);
    setCopyMessage(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[rgba(83,183,223,0.45)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)] transition hover:bg-[var(--bb-primary-hover)]"
      >
        <FileDown className="size-4" aria-hidden="true" />
        Exportar planeamento
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(20,20,18,0.42)] px-3 py-4 backdrop-blur-sm md:py-7">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-[1320px] flex-col overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--bb-border)] px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">Exportar planeamento</h2>
                <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">
                  Prepara um documento final para aprovação do cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar"
                title="Fechar"
                className="inline-grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
              <div className="grid gap-4">
                <section className={sectionClass}>
                  <SectionTitle letter="A" title="Documento" />
                  <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                    <label className={labelClass}>
                      Cliente
                      <SelectField
                        name="planning_client_id"
                        value={clientId}
                        onValueChange={changeClient}
                        options={clientOptions(clients)}
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Mês e ano
                      <MonthPicker
                        name="planning_month"
                        value={month}
                        onValueChange={changeMonth}
                        required
                        ariaLabel="Mês e ano"
                      />
                    </label>
                    <label className={labelClass}>
                      Idioma do documento
                      <SelectField
                        name="planning_language"
                        value={language}
                        onValueChange={changeLanguage}
                        options={languageOptions}
                      />
                    </label>
                    <label className={labelClass}>
                      Título do documento
                      <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} className={inputClass} />
                    </label>
                    <label className={`${labelClass} lg:col-span-2`}>
                      Objetivo do mês
                      <textarea
                        value={monthlyObjective}
                        onChange={(event) => {
                          setMonthlyObjective(event.target.value);
                          refreshDraft({ monthlyObjective: event.target.value });
                        }}
                        className={textareaClass}
                      />
                    </label>
                    <label className={`${labelClass} lg:col-span-2`}>
                      Resumo dos temas do mês
                      <textarea
                        value={monthlyThemes}
                        onChange={(event) => {
                          setMonthlyThemes(event.target.value);
                          refreshDraft({ monthlyThemes: event.target.value });
                        }}
                        className={textareaClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Nome de quem preparou
                      <input
                        value={preparedByName}
                        onChange={(event) => {
                          setPreparedByName(event.target.value);
                          refreshDraft({ preparedByName: event.target.value });
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Email de quem preparou
                      <input
                        type="email"
                        value={preparedByEmail}
                        onChange={(event) => {
                          setPreparedByEmail(event.target.value);
                          refreshDraft({ preparedByEmail: event.target.value });
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Website
                      <input
                        value={website}
                        onChange={(event) => {
                          setWebsite(event.target.value);
                          refreshDraft({ website: event.target.value });
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Nome do contacto do cliente
                      <input
                        value={clientContactName}
                        onChange={(event) => {
                          setClientContactName(event.target.value);
                          refreshDraft({ clientContactName: event.target.value });
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Data limite de aprovação
                      <DatePicker
                        name="approval_deadline"
                        value={approvalDeadline}
                        onValueChange={(value) => {
                          setApprovalDeadline(value);
                          refreshDraft({ approvalDeadline: value });
                        }}
                        ariaLabel="Data limite de aprovação"
                      />
                    </label>
                  </div>
                </section>

                <section className={sectionClass}>
                  <SectionTitle letter="B" title="Conteúdos" />
                  <p className="mt-2 rounded-2xl border border-[rgba(83,183,223,0.28)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
                    Ajustes efetuados aqui aplicam-se apenas a este PDF.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-[var(--bb-muted)]">
                      {editableItems.length} encontrados · {selectedItems.length} selecionados
                      {platformList.length ? ` · ${platformList.join(", ")}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={selectAll} className="inline-flex min-h-9 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                        Selecionar tudo
                      </button>
                      <button type="button" onClick={clearSelection} className="inline-flex min-h-9 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                        Limpar seleção
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 max-h-[52vh] overflow-y-auto pr-1">
                    {editableItems.length ? (
                      <div className="grid gap-3">
                        {editableItems.map((item, index) => (
                          <ContentAccordion
                            key={item.id}
                            item={item}
                            index={index}
                            total={editableItems.length}
                            language={language}
                            onMove={moveItem}
                            onChange={updateEditableItem}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-[var(--bb-border)] bg-white/55 px-4 py-6 text-center text-sm font-bold text-[var(--bb-muted)]">
                        Não existem conteúdos para este cliente e período.
                      </div>
                    )}
                  </div>
                </section>

                <section className={sectionClass}>
                  <SectionTitle letter="C" title="Aprovação" />
                  <label className={`${labelClass} mt-4`}>
                    Instruções de aprovação
                    <textarea value={approvalInstructions} onChange={(event) => setApprovalInstructions(event.target.value)} className={`${textareaClass} min-h-60`} />
                  </label>
                </section>

                <section className={sectionClass}>
                  <SectionTitle letter="D" title="Email de envio" />
                  <div className="mt-4 grid gap-4">
                    <label className={labelClass}>
                      Assunto
                      <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      Corpo do email
                      <textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className={`${textareaClass} min-h-72`} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => copyText(emailSubject, "Assunto")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                        <Copy className="size-4" aria-hidden="true" />
                        Copiar assunto
                      </button>
                      <button type="button" onClick={() => copyText(emailBody, "Email")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                        <Copy className="size-4" aria-hidden="true" />
                        Copiar email
                      </button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-2 text-sm font-bold">
                  {warnings.map((warning) => (
                    <WarningLine key={warning}>{warning}</WarningLine>
                  ))}
                  {message ? (
                    <p className="rounded-2xl border border-[var(--bb-border)] bg-white/65 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
                      {message}
                    </p>
                  ) : null}
                  {copyMessage ? (
                    <p className="rounded-2xl border border-[rgba(83,183,223,0.28)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
                      {copyMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 md:px-6">
              <button type="button" onClick={closeModal} className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                Cancelar
              </button>
              <button type="button" onClick={() => copyText(emailSubject, "Assunto")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                <Copy className="size-4" aria-hidden="true" />
                Copiar assunto
              </button>
              <button type="button" onClick={() => copyText(emailBody, "Email")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]">
                <Copy className="size-4" aria-hidden="true" />
                Copiar email
              </button>
              <button type="button" onClick={generatePdf} disabled={isGenerating} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-55">
                <Download className="size-4" aria-hidden="true" />
                {isGenerating ? "A gerar..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function SectionTitle({ letter, title }: { letter: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-full bg-[var(--bb-black)] text-xs font-extrabold text-white">
        {letter}
      </span>
      <h3 className="text-base font-extrabold text-[var(--bb-charcoal)]">{title}</h3>
    </div>
  );
}

function ContentAccordion({
  item,
  index,
  total,
  language,
  onMove,
  onChange,
}: {
  item: EditableExportItem;
  index: number;
  total: number;
  language: ContentPlanningLanguage;
  onMove: (id: string, direction: -1 | 1) => void;
  onChange: (id: string, patch: Partial<EditableExportItem>) => void;
}) {
  const summaryParts = [
    formatDate(item.publishDate),
    item.publishTime,
    item.format,
    item.platform ? displayContentPlatform(item.platform) : null,
  ].filter(Boolean);

  return (
    <article className={`rounded-[18px] border ${item.selected ? "border-[rgba(83,183,223,0.45)] bg-white/80" : "border-[var(--bb-border)] bg-white/45"} p-3`}>
      <div className="flex flex-wrap items-start gap-3">
        <label className="mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg border border-[var(--bb-border)] bg-white">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={() => onChange(item.id, { selected: !item.selected })}
            className="sr-only"
          />
          {item.selected ? <Check className="size-4 text-[var(--bb-black)]" aria-hidden="true" /> : null}
        </label>
        <button
          type="button"
          onClick={() => onChange(item.id, { open: !item.open })}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-xs font-extrabold uppercase text-[var(--bb-muted)]">
            #{String(index + 1).padStart(2, "0")} · {summaryParts.join(" · ")}
          </span>
          <span className="mt-1 block text-sm font-extrabold text-[var(--bb-charcoal)]">{item.title}</span>
        </button>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button type="button" disabled={index === 0} onClick={() => onMove(item.id, -1)} className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-2.5 text-xs font-extrabold text-[var(--bb-charcoal)] disabled:opacity-40">
            Subir
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(item.id, 1)} className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-2.5 text-xs font-extrabold text-[var(--bb-charcoal)] disabled:opacity-40">
            Descer
          </button>
          <button type="button" onClick={() => onChange(item.id, { open: !item.open })} aria-label="Abrir conteúdo" className="inline-grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75">
            <ChevronDown className={`size-4 transition ${item.open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {item.open ? (
        <div className="mt-4 grid gap-4 border-t border-[var(--bb-border)] pt-4 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>
            Título
            <input value={item.title ?? ""} onChange={(event) => onChange(item.id, { title: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Data
            <input type="date" value={item.publishDate ?? ""} onChange={(event) => onChange(item.id, { publishDate: event.target.value || null })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Hora
            <input type="time" value={item.publishTime ?? ""} onChange={(event) => onChange(item.id, { publishTime: event.target.value || null })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Formato
            <input value={item.format ?? ""} onChange={(event) => onChange(item.id, { format: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Plataformas
            <input value={item.platform ?? ""} onChange={(event) => onChange(item.id, { platform: event.target.value })} className={inputClass} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Objetivo do conteúdo
            <input value={item.objective ?? ""} onChange={(event) => onChange(item.id, { objective: event.target.value })} className={inputClass} placeholder={language === "en" ? "Optional" : "Opcional"} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Texto do criativo
            <textarea value={item.copy ?? ""} onChange={(event) => onChange(item.id, { copy: event.target.value })} className={`${textareaClass} min-h-48`} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Legenda
            <textarea value={item.caption ?? ""} onChange={(event) => onChange(item.id, { caption: event.target.value })} className={`${textareaClass} min-h-48`} />
          </label>
        </div>
      ) : null}
    </article>
  );
}

function WarningLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-2xl border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-[#8f2415]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
