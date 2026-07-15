"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Monitor,
  MoreHorizontal,
  Pencil,
  Save,
  Send,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { NewsletterMutationResult } from "@/lib/actions";
import {
  buildInvest2030GptBriefing,
  generateInvest2030NewsletterHtml,
  initialInvest2030NewsletterContent,
  invest2030NewsletterFilename,
  invest2030NewsletterStatusLabels,
  parseInvest2030NewsletterJson,
  safeInvest2030CtaUrl,
  validateInvest2030Newsletter,
  type Invest2030Newsletter,
  type Invest2030NewsletterContent,
  type Invest2030NewsletterParsedRequest,
} from "@/lib/invest2030-newsletter";

type SaveAction = (
  previousState: NewsletterMutationResult,
  formData: FormData,
) => Promise<NewsletterMutationResult>;
type FormAction = (formData: FormData) => void | Promise<void>;
type TabKey = "summary" | "edit" | "request" | "schedule";
type AccordionKey = "hero" | "stats" | "intro" | "benefits" | "audience" | "closing";

type Props = {
  taskId: string;
  campaignTitle: string;
  parsedRequest: Invest2030NewsletterParsedRequest;
  newsletter: Invest2030Newsletter | null;
  gptUrl: string | null;
  saveAction: SaveAction;
  markScheduledAction: FormAction;
  markExportedAction: () => void | Promise<void>;
  markSentAction: () => void | Promise<void>;
};

const inputClass =
  "min-h-10 rounded-xl border border-[var(--bb-border)] bg-white/80 px-3 text-sm font-semibold text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const textareaClass =
  "min-h-24 rounded-xl border border-[var(--bb-border)] bg-white/80 px-3 py-2 text-sm font-semibold leading-6 text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const labelClass = "grid gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]";
const panelClass = "rounded-[18px] border border-[var(--bb-border)] bg-white/78 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.05)]";
const subtlePanelClass = "rounded-[16px] border border-[var(--bb-border)] bg-white/62 p-3";

const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "summary", label: "Resumo", icon: <Eye className="size-4" aria-hidden="true" /> },
  { key: "edit", label: "Editar conteúdo", icon: <Pencil className="size-4" aria-hidden="true" /> },
  { key: "request", label: "Pedido original", icon: <FileText className="size-4" aria-hidden="true" /> },
  { key: "schedule", label: "Agendamento", icon: <Calendar className="size-4" aria-hidden="true" /> },
];

function ButtonShell({
  children,
  tone = "secondary",
  type = "button",
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--bb-black)] text-white shadow-[0_12px_26px_rgba(0,0,0,0.14)] hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
      : "border border-[var(--bb-border)] bg-white/75 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClass} ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className={labelClass}>
      {label}
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} className={textareaClass} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  );
}

function updateList(items: string[], index: number, value: string) {
  return items.map((item, currentIndex) => (currentIndex === index ? value : item));
}

function moveItem(items: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function requestSummaryRows(parsedRequest: Invest2030NewsletterParsedRequest) {
  return [
    ["Identificação", `${parsedRequest.campaignName || "-"}\n${parsedRequest.actionTypes || "-"}`],
    ["Objetivo", parsedRequest.mainObjective],
    ["Público", parsedRequest.targetAudience],
    ["CTA", `${parsedRequest.primaryButtonText || "-"}\n${parsedRequest.primaryButtonUrl || "-"}`],
    ["Informação obrigatória", parsedRequest.mandatoryInformation],
    ["Observações", parsedRequest.observations],
  ] as const;
}

export function Invest2030NewsletterWorkspace({
  taskId,
  campaignTitle,
  parsedRequest,
  newsletter,
  gptUrl,
  saveAction,
  markScheduledAction,
  markExportedAction,
  markSentAction,
}: Props) {
  const initialContent = newsletter?.content_json ?? initialInvest2030NewsletterContent(parsedRequest);
  const [content, setContent] = useState<Invest2030NewsletterContent>(initialContent);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [openAccordion, setOpenAccordion] = useState<AccordionKey>("hero");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewWidth, setPreviewWidth] = useState(680);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isOriginalModalOpen, setOriginalModalOpen] = useState(false);
  const [saveState, formAction, saving] = useActionState(saveAction, { ok: true, message: "" });
  const exportedFormRef = useRef<HTMLFormElement>(null);
  const saveFormRef = useRef<HTMLFormElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const importCloseRef = useRef<HTMLButtonElement>(null);
  const originalCloseRef = useRef<HTMLButtonElement>(null);
  const finalCta = safeInvest2030CtaUrl(parsedRequest.primaryButtonUrl);
  const contentWithFinalLink = useMemo(
    () => ({ ...content, cta_url: finalCta.url }),
    [content, finalCta.url],
  );
  const html = useMemo(() => generateInvest2030NewsletterHtml(contentWithFinalLink), [contentWithFinalLink]);
  const validation = useMemo(
    () => validateInvest2030Newsletter(contentWithFinalLink, parsedRequest),
    [contentWithFinalLink, parsedRequest],
  );
  const iframeViewportWidth = previewMode === "desktop" ? 680 : 375;
  const previewScale = Math.min(1, Math.max(0.45, (previewWidth - 24) / iframeViewportWidth));
  const iframeHeight = 920;
  const statusLabel = newsletter ? invest2030NewsletterStatusLabels[newsletter.status] : "Novo rascunho";
  const linkStatus = finalCta.usedDefault ? "Fallback aplicado" : "Link original validado";

  useEffect(() => {
    const node = previewShellRef.current;
    if (!node) return;

    const updateWidth = () => setPreviewWidth(node.clientWidth || iframeViewportWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [iframeViewportWidth, activeTab]);

  useEffect(() => {
    if (isImportModalOpen) importCloseRef.current?.focus();
  }, [isImportModalOpen]);

  useEffect(() => {
    if (isOriginalModalOpen) originalCloseRef.current?.focus();
  }, [isOriginalModalOpen]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setImportModalOpen(false);
      setOriginalModalOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function patchContent(patch: Partial<Invest2030NewsletterContent>) {
    setContent((current) => ({ ...current, ...patch }));
  }

  function submitSave() {
    saveFormRef.current?.requestSubmit();
  }

  function resetDraft() {
    setContent(initialInvest2030NewsletterContent(parsedRequest));
    setJsonInput("");
    setJsonError(null);
    setNotice("Novo rascunho iniciado. Guarde para persistir.");
    setActiveTab("edit");
    setOpenAccordion("hero");
  }

  async function copyBriefing() {
    await navigator.clipboard.writeText(buildInvest2030GptBriefing(parsedRequest));
    setNotice("Briefing copiado para o GPT.");
  }

  function importJson() {
    const parsed = parseInvest2030NewsletterJson(jsonInput);
    if (!parsed.content) {
      setJsonError(parsed.errors.join(" "));
      return;
    }

    setJsonError(null);
    setContent({ ...parsed.content, cta_url: finalCta.url });
    setNotice("Conteúdo importado para o editor.");
    setImportModalOpen(false);
    setActiveTab("summary");
  }

  async function copyHtml() {
    if (validation.blockers.length) {
      setNotice("Corrija os bloqueios antes de copiar o HTML.");
      return;
    }

    await navigator.clipboard.writeText(html);
    setNotice("HTML completo copiado.");
    exportedFormRef.current?.requestSubmit();
  }

  function downloadHtml() {
    if (validation.blockers.length) {
      setNotice("Corrija os bloqueios antes de descarregar o HTML.");
      return;
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = invest2030NewsletterFilename(parsedRequest.campaignName);
    link.click();
    URL.revokeObjectURL(url);
    setNotice("HTML descarregado.");
    exportedFormRef.current?.requestSubmit();
  }

  return (
    <div className="grid gap-4 pb-20 md:pb-0">
      <h1 className="sr-only">Newsletter Invest2030</h1>
      <form ref={exportedFormRef} action={markExportedAction} className="hidden" />
      <form ref={saveFormRef} action={formAction} className="hidden">
        <input type="hidden" name="content_json" value={JSON.stringify(contentWithFinalLink)} />
      </form>

      <header className="sticky top-0 z-30 -mx-1 rounded-b-[22px] border border-[var(--bb-border)] bg-[rgba(247,245,239,0.94)] px-3 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.08)] backdrop-blur md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">Newsletter Invest2030</div>
            <div className="truncate text-lg font-extrabold text-[var(--bb-charcoal)]">{campaignTitle}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-full bg-[var(--bb-primary-soft)] px-4 text-sm font-extrabold text-[var(--bb-charcoal)]">
              {statusLabel}
            </span>
            <Link
              href={`/tasks/${taskId}/edit`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar à tarefa
            </Link>
            <ButtonShell onClick={submitSave} tone="primary" disabled={saving}>
              <Save className="size-4" aria-hidden="true" />
              Guardar rascunho
            </ButtonShell>
            <details className="relative">
              <summary
                aria-label="Menu secundário"
                className="grid min-h-10 cursor-pointer list-none place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] [&::-webkit-details-marker]:hidden"
              >
                <MoreHorizontal className="size-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-40 w-48 rounded-[16px] border border-[var(--bb-border)] bg-white p-2 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
                <button
                  type="button"
                  onClick={resetDraft}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                >
                  Novo rascunho
                </button>
              </div>
            </details>
          </div>
        </div>
        {saveState.message || notice ? (
          <div className={`mt-3 rounded-[14px] px-3 py-2 text-xs font-extrabold ${saveState.message && !saveState.ok ? "bg-[var(--bb-red-soft)] text-[#8f2415]" : "bg-white/72 text-[var(--bb-muted)]"}`}>
            {saveState.message || notice}
          </div>
        ) : null}
      </header>

      <nav
        aria-label="Separadores da newsletter"
        className="sticky top-[116px] z-20 -mx-1 overflow-x-auto rounded-[18px] border border-[var(--bb-border)] bg-[rgba(255,255,255,0.9)] p-1 shadow-[0_10px_24px_rgba(0,0,0,0.05)] backdrop-blur"
      >
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
                activeTab === tab.key
                  ? "bg-[var(--bb-black)] text-white"
                  : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "summary" ? (
        <SummaryTab
          parsedRequest={parsedRequest}
          content={contentWithFinalLink}
          finalCtaUrl={finalCta.url}
          linkStatus={linkStatus}
          usedDefaultCta={finalCta.usedDefault}
          statusLabel={statusLabel}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          previewShellRef={previewShellRef}
          iframeViewportWidth={iframeViewportWidth}
          previewScale={previewScale}
          iframeHeight={iframeHeight}
          html={html}
          validation={validation}
          newsletter={newsletter}
          onOpenImport={() => setImportModalOpen(true)}
          onEdit={() => setActiveTab("edit")}
          onCopyHtml={copyHtml}
          onDownloadHtml={downloadHtml}
          onSchedule={() => setActiveTab("schedule")}
        />
      ) : null}

      {activeTab === "edit" ? (
        <EditTab
          content={content}
          finalCtaUrl={finalCta.url}
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
          patchContent={patchContent}
          onSave={submitSave}
          saving={saving}
          onPreview={() => setActiveTab("summary")}
          onSummary={() => setActiveTab("summary")}
        />
      ) : null}

      {activeTab === "request" ? (
        <RequestTab
          parsedRequest={parsedRequest}
          onOpenOriginal={() => setOriginalModalOpen(true)}
        />
      ) : null}

      {activeTab === "schedule" ? (
        <ScheduleTab
          newsletter={newsletter}
          markScheduledAction={markScheduledAction}
          markSentAction={markSentAction}
        />
      ) : null}

      {activeTab === "summary" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bb-border)] bg-[rgba(247,245,239,0.96)] p-3 shadow-[0_-12px_30px_rgba(0,0,0,0.1)] backdrop-blur md:hidden">
          <div className="grid grid-cols-3 gap-2">
            <ButtonShell onClick={() => setImportModalOpen(true)} className="px-2 text-xs">
              <Upload className="size-4" aria-hidden="true" />
              Importar
            </ButtonShell>
            <ButtonShell onClick={copyHtml} tone="primary" className="px-2 text-xs">
              <Clipboard className="size-4" aria-hidden="true" />
              Copiar
            </ButtonShell>
            <ButtonShell onClick={() => setActiveTab("schedule")} className="px-2 text-xs">
              <Calendar className="size-4" aria-hidden="true" />
              Agendar
            </ButtonShell>
          </div>
        </div>
      ) : null}

      {isImportModalOpen ? (
        <ImportModal
          closeRef={importCloseRef}
          gptUrl={gptUrl}
          jsonInput={jsonInput}
          jsonError={jsonError}
          usedDefaultCta={finalCta.usedDefault}
          onClose={() => setImportModalOpen(false)}
          onCopyBriefing={copyBriefing}
          onJsonChange={setJsonInput}
          onImport={importJson}
        />
      ) : null}

      {isOriginalModalOpen ? (
        <OriginalRequestModal
          closeRef={originalCloseRef}
          originalNotes={parsedRequest.originalNotes}
          onClose={() => setOriginalModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SummaryTab({
  parsedRequest,
  content,
  finalCtaUrl,
  linkStatus,
  usedDefaultCta,
  statusLabel,
  previewMode,
  setPreviewMode,
  previewShellRef,
  iframeViewportWidth,
  previewScale,
  iframeHeight,
  html,
  validation,
  newsletter,
  onOpenImport,
  onEdit,
  onCopyHtml,
  onDownloadHtml,
  onSchedule,
}: {
  parsedRequest: Invest2030NewsletterParsedRequest;
  content: Invest2030NewsletterContent;
  finalCtaUrl: string;
  linkStatus: string;
  usedDefaultCta: boolean;
  statusLabel: string;
  previewMode: "desktop" | "mobile";
  setPreviewMode: (mode: "desktop" | "mobile") => void;
  previewShellRef: React.RefObject<HTMLDivElement | null>;
  iframeViewportWidth: number;
  previewScale: number;
  iframeHeight: number;
  html: string;
  validation: { blockers: string[]; warnings: string[] };
  newsletter: Invest2030Newsletter | null;
  onOpenImport: () => void;
  onEdit: () => void;
  onCopyHtml: () => void;
  onDownloadHtml: () => void;
  onSchedule: () => void;
}) {
  return (
    <div className="grid gap-4">
      <section className={panelClass}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryMetric label="Campanha" value={parsedRequest.campaignName || content.subject} />
          <SummaryMetric label="Data pretendida" value={parsedRequest.period || "-"} />
          <SummaryMetric label="Objetivo" value={parsedRequest.mainObjective || "-"} />
          <SummaryMetric label="CTA" value={finalCtaUrl} />
          <SummaryMetric label="Estado do link" value={linkStatus} />
        </div>
        {usedDefaultCta ? (
          <div className="mt-3 rounded-[14px] bg-[var(--bb-yellow-soft)] px-3 py-2 text-xs font-extrabold text-[var(--bb-charcoal)]">
            Link de contacto aplicado automaticamente
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <section className={panelClass}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Preview da newsletter</h2>
              <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">Viewport interno: {iframeViewportWidth}px</div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonShell onClick={onOpenImport}>
                <Upload className="size-4" aria-hidden="true" />
                Gerar/importar conteúdo
              </ButtonShell>
              <div className="flex rounded-full border border-[var(--bb-border)] bg-white/70 p-1">
                <button
                  type="button"
                  aria-label="Preview desktop"
                  title="Desktop"
                  onClick={() => setPreviewMode("desktop")}
                  className={`grid size-8 place-items-center rounded-full ${previewMode === "desktop" ? "bg-[var(--bb-black)] text-white" : "text-[var(--bb-muted)]"}`}
                >
                  <Monitor className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Preview mobile"
                  title="Mobile"
                  onClick={() => setPreviewMode("mobile")}
                  className={`grid size-8 place-items-center rounded-full ${previewMode === "mobile" ? "bg-[var(--bb-black)] text-white" : "text-[var(--bb-muted)]"}`}
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div ref={previewShellRef} className="max-h-[620px] overflow-auto rounded-[18px] border border-[var(--bb-border)] bg-[#f3f1ea] p-3">
            <div
              className="mx-auto"
              style={{
                width: iframeViewportWidth * previewScale,
                height: iframeHeight * previewScale,
              }}
            >
              <div
                style={{
                  width: iframeViewportWidth,
                  height: iframeHeight,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  title="Preview da newsletter Invest2030"
                  srcDoc={html}
                  sandbox=""
                  className="h-[920px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
                  style={{ width: iframeViewportWidth }}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className={panelClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Estado e ações</h2>
              <span className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--bb-charcoal)]">
                {statusLabel}
              </span>
            </div>
            {newsletter?.scheduled_at ? (
              <div className="mb-3 rounded-[14px] bg-[var(--bb-green-soft)] px-3 py-2 text-xs font-bold text-[var(--bb-charcoal)]">
                Agendada para {new Date(newsletter.scheduled_at).toLocaleString("pt-PT")}
              </div>
            ) : null}
            <div className="grid gap-2">
              <ButtonShell onClick={onEdit}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar conteúdo
              </ButtonShell>
              <ButtonShell onClick={onCopyHtml} tone="primary">
                <Clipboard className="size-4" aria-hidden="true" />
                Copiar HTML
              </ButtonShell>
              <ButtonShell onClick={onDownloadHtml}>
                <Download className="size-4" aria-hidden="true" />
                Descarregar HTML
              </ButtonShell>
              <ButtonShell onClick={onSchedule}>
                <Calendar className="size-4" aria-hidden="true" />
                Ir para agendamento
              </ButtonShell>
            </div>
          </section>

          <section className={panelClass}>
            <h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">Validações</h2>
            <ValidationList title="Bloqueios" items={validation.blockers} empty="Sem bloqueios." tone="error" />
            <div className="mt-3">
              <ValidationList title="Avisos" items={validation.warnings} empty="Sem avisos." tone="warning" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={subtlePanelClass}>
      <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">{label}</div>
      <div className="mt-1 line-clamp-3 break-words text-sm font-bold leading-5 text-[var(--bb-charcoal)]">{value || "-"}</div>
    </div>
  );
}

function EditTab({
  content,
  finalCtaUrl,
  openAccordion,
  setOpenAccordion,
  patchContent,
  onSave,
  saving,
  onPreview,
  onSummary,
}: {
  content: Invest2030NewsletterContent;
  finalCtaUrl: string;
  openAccordion: AccordionKey;
  setOpenAccordion: (key: AccordionKey) => void;
  patchContent: (patch: Partial<Invest2030NewsletterContent>) => void;
  onSave: () => void;
  saving: boolean;
  onPreview: () => void;
  onSummary: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="sticky top-[178px] z-10 flex flex-wrap items-center justify-end gap-2 rounded-[18px] border border-[var(--bb-border)] bg-[rgba(255,255,255,0.92)] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.06)] backdrop-blur">
        <ButtonShell onClick={onSave} tone="primary" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          Guardar alterações
        </ButtonShell>
        <ButtonShell onClick={onPreview}>
          <Eye className="size-4" aria-hidden="true" />
          Ver preview
        </ButtonShell>
        <ButtonShell onClick={onSummary}>Voltar ao resumo</ButtonShell>
      </div>

      <section className={panelClass}>
        <AccordionSection
          id="hero"
          title="Assunto e hero"
          open={openAccordion === "hero"}
          onToggle={() => setOpenAccordion(openAccordion === "hero" ? "stats" : "hero")}
        >
          <div className="grid gap-4">
            <TextInput label="Assunto" value={content.subject} onChange={(value) => patchContent({ subject: value })} />
            <TextInput label="Preheader" value={content.preheader} onChange={(value) => patchContent({ preheader: value })} />
            <TextInput label="Eyebrow" value={content.eyebrow} onChange={(value) => patchContent({ eyebrow: value })} />
            <TextInput label="Título principal" value={content.hero_title} onChange={(value) => patchContent({ hero_title: value })} multiline />
            <TextInput label="Subtítulo" value={content.hero_subtitle} onChange={(value) => patchContent({ hero_subtitle: value })} multiline />
          </div>
        </AccordionSection>

        <AccordionSection
          id="stats"
          title="Quatro indicadores"
          open={openAccordion === "stats"}
          onToggle={() => setOpenAccordion(openAccordion === "stats" ? "hero" : "stats")}
        >
          <div className="grid gap-3">
            {content.stats.slice(0, 4).map((stat, index) => (
              <div key={index} className="grid gap-2 rounded-[16px] border border-[var(--bb-border)] bg-white/60 p-3 md:grid-cols-2">
                <input
                  aria-label={`Valor do indicador ${index + 1}`}
                  value={stat.value}
                  onChange={(event) =>
                    patchContent({
                      stats: content.stats.map((item, currentIndex) => currentIndex === index ? { ...item, value: event.target.value } : item).slice(0, 4),
                    })
                  }
                  className={inputClass}
                  placeholder="Valor"
                />
                <input
                  aria-label={`Legenda do indicador ${index + 1}`}
                  value={stat.label}
                  onChange={(event) =>
                    patchContent({
                      stats: content.stats.map((item, currentIndex) => currentIndex === index ? { ...item, label: event.target.value } : item).slice(0, 4),
                    })
                  }
                  className={inputClass}
                  placeholder="Legenda"
                />
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          id="intro"
          title="Introdução"
          open={openAccordion === "intro"}
          onToggle={() => setOpenAccordion(openAccordion === "intro" ? "hero" : "intro")}
        >
          <ListEditor title="Parágrafos de introdução" items={content.intro_paragraphs} onChange={(items) => patchContent({ intro_paragraphs: items })} multiline />
        </AccordionSection>

        <AccordionSection
          id="benefits"
          title="Condições e benefícios"
          open={openAccordion === "benefits"}
          onToggle={() => setOpenAccordion(openAccordion === "benefits" ? "hero" : "benefits")}
        >
          <div className="grid gap-4">
            <TextInput label="Título da lista de benefícios" value={content.benefits_title} onChange={(value) => patchContent({ benefits_title: value })} />
            <ListEditor title="Benefícios" items={content.benefits} onChange={(items) => patchContent({ benefits: items })} allowMove />
          </div>
        </AccordionSection>

        <AccordionSection
          id="audience"
          title="Público e exclusões"
          open={openAccordion === "audience"}
          onToggle={() => setOpenAccordion(openAccordion === "audience" ? "hero" : "audience")}
        >
          <div className="grid gap-4">
            <TextInput label="Título da secção de público" value={content.audience_section_title} onChange={(value) => patchContent({ audience_section_title: value })} />
            <TextInput label="Título do bloco de público" value={content.audience_title} onChange={(value) => patchContent({ audience_title: value })} />
            <TextInput label="Texto do público-alvo" value={content.audience_body} onChange={(value) => patchContent({ audience_body: value })} multiline />
            <TextInput label="Exclusões" value={content.exclusions} onChange={(value) => patchContent({ exclusions: value })} multiline />
          </div>
        </AccordionSection>

        <AccordionSection
          id="closing"
          title="Fecho e CTAs"
          open={openAccordion === "closing"}
          onToggle={() => setOpenAccordion(openAccordion === "closing" ? "hero" : "closing")}
        >
          <div className="grid gap-4">
            <ListEditor title="Parágrafos finais" items={content.closing_paragraphs} onChange={(items) => patchContent({ closing_paragraphs: items })} multiline />
            <TextInput label="Texto do primeiro CTA" value={content.primary_cta_label} onChange={(value) => patchContent({ primary_cta_label: value })} />
            <TextInput label="Texto do segundo CTA" value={content.secondary_cta_label} onChange={(value) => patchContent({ secondary_cta_label: value })} />
            <TextInput label="URL dos CTAs" value={finalCtaUrl} onChange={() => undefined} />
          </div>
        </AccordionSection>
      </section>
    </div>
  );
}

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: AccordionKey;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `invest2030-accordion-${id}`;
  return (
    <div className="border-b border-[var(--bb-border)] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-extrabold text-[var(--bb-charcoal)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--bb-primary)]"
      >
        {title}
        <span className={`text-[var(--bb-muted)] transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <div id={panelId} hidden={!open} className="pb-5">
        {children}
      </div>
    </div>
  );
}

function RequestTab({
  parsedRequest,
  onOpenOriginal,
}: {
  parsedRequest: Invest2030NewsletterParsedRequest;
  onOpenOriginal: () => void;
}) {
  return (
    <section className={panelClass}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">Pedido original</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--bb-muted)]">Resumo legível do pedido recebido.</p>
        </div>
        <ButtonShell onClick={onOpenOriginal}>
          <FileText className="size-4" aria-hidden="true" />
          Ver texto original completo
        </ButtonShell>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {requestSummaryRows(parsedRequest).map(([label, value]) => (
          <div key={label} className={subtlePanelClass}>
            <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">{label}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{value || "-"}</div>
          </div>
        ))}
      </div>
      {parsedRequest.missingFields.length || parsedRequest.unrecognizedHeadings.length ? (
        <div className="mt-4 rounded-[16px] border border-[rgba(232,76,49,0.2)] bg-[var(--bb-red-soft)] p-3 text-xs font-bold leading-5 text-[#8f2415]">
          {parsedRequest.missingFields.length ? `Campos não reconhecidos: ${parsedRequest.missingFields.join(", ")}. ` : ""}
          {parsedRequest.unrecognizedHeadings.length ? `Títulos inesperados: ${parsedRequest.unrecognizedHeadings.join(", ")}.` : ""}
        </div>
      ) : null}
    </section>
  );
}

function ScheduleTab({
  newsletter,
  markScheduledAction,
  markSentAction,
}: {
  newsletter: Invest2030Newsletter | null;
  markScheduledAction: FormAction;
  markSentAction: () => void | Promise<void>;
}) {
  return (
    <section className={`${panelClass} max-w-3xl`}>
      <h2 className="mb-3 text-base font-extrabold text-[var(--bb-charcoal)]">Agendamento</h2>
      {newsletter?.scheduled_at ? (
        <div className="mb-4 rounded-[16px] bg-[var(--bb-green-soft)] px-3 py-2 text-sm font-bold text-[var(--bb-charcoal)]">
          Campanha agendada para: {new Date(newsletter.scheduled_at).toLocaleString("pt-PT")}
          {newsletter.scheduled_by ? (
            <span className="mt-1 block text-xs text-[var(--bb-muted)]">
              Registado por {newsletter.scheduled_by}
              {newsletter.scheduled_recorded_at ? ` em ${new Date(newsletter.scheduled_recorded_at).toLocaleString("pt-PT")}` : ""}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mb-4 rounded-[16px] bg-white/70 px-3 py-2 text-sm font-bold text-[var(--bb-muted)]">
          Ainda sem agendamento registado.
        </div>
      )}
      <form action={markScheduledAction} className="grid gap-3">
        <div className="grid gap-2 md:grid-cols-2">
          <label className={labelClass}>
            Data
            <input name="scheduled_date" type="date" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Hora
            <input name="scheduled_time" type="time" required className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Observação
          <textarea name="scheduled_note" className={`${textareaClass} min-h-20`} placeholder="Observação opcional" />
        </label>
        <ButtonShell type="submit" tone="primary" disabled={!newsletter}>
          <Send className="size-4" aria-hidden="true" />
          Marcar como agendada
        </ButtonShell>
        {!newsletter ? <div className="text-xs font-bold text-[var(--bb-muted)]">Guarde o rascunho antes de agendar.</div> : null}
      </form>
      <form action={markSentAction} className="mt-3">
        <ButtonShell type="submit" disabled={!newsletter || newsletter.status === "sent"}>Marcar como enviada</ButtonShell>
      </form>
    </section>
  );
}

function ImportModal({
  closeRef,
  gptUrl,
  jsonInput,
  jsonError,
  usedDefaultCta,
  onClose,
  onCopyBriefing,
  onJsonChange,
  onImport,
}: {
  closeRef: React.RefObject<HTMLButtonElement | null>;
  gptUrl: string | null;
  jsonInput: string;
  jsonError: string | null;
  usedDefaultCta: boolean;
  onClose: () => void;
  onCopyBriefing: () => void;
  onJsonChange: (value: string) => void;
  onImport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(18,18,28,0.52)] p-0 backdrop-blur-sm sm:p-5" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invest2030-import-title"
        className="ml-auto flex h-full w-full flex-col overflow-hidden bg-[#f7f5ef] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:max-w-2xl sm:rounded-[24px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--bb-border)] p-4">
          <div>
            <h2 id="invest2030-import-title" className="text-base font-extrabold text-[var(--bb-charcoal)]">Gerar/importar conteúdo</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--bb-muted)]">Briefing GPT e importação do JSON.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Fechar modal de importação"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/80 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-auto p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonShell onClick={onCopyBriefing} tone="primary">
              <Clipboard className="size-4" aria-hidden="true" />
              Copiar briefing para GPT
            </ButtonShell>
            <a
              href={gptUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!gptUrl}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] ${gptUrl ? "" : "pointer-events-none opacity-45"}`}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Abrir GPT Invest2030
            </a>
          </div>
          {!gptUrl ? (
            <div className="rounded-[14px] bg-white/72 px-3 py-2 text-xs font-bold text-[var(--bb-muted)]">
              GPT Invest2030 ainda não configurado.
            </div>
          ) : null}
          {usedDefaultCta ? (
            <div className="rounded-[14px] bg-[var(--bb-yellow-soft)] px-3 py-2 text-xs font-extrabold text-[var(--bb-charcoal)]">
              Link de contacto aplicado automaticamente
            </div>
          ) : null}
          <label className={labelClass}>
            Colar JSON
            <textarea
              value={jsonInput}
              onChange={(event) => onJsonChange(event.target.value)}
              className={`${textareaClass} min-h-64 w-full font-mono text-xs`}
              placeholder='{"subject": "..."}'
            />
          </label>
          {jsonError ? <div className="rounded-[14px] bg-[var(--bb-red-soft)] px-3 py-2 text-xs font-bold text-[#8f2415]">{jsonError}</div> : null}
        </div>
        <div className="border-t border-[var(--bb-border)] p-4">
          <ButtonShell onClick={onImport} tone="primary" className="w-full">
            <Upload className="size-4" aria-hidden="true" />
            Importar conteúdo
          </ButtonShell>
        </div>
      </section>
    </div>
  );
}

function OriginalRequestModal({
  closeRef,
  originalNotes,
  onClose,
}: {
  closeRef: React.RefObject<HTMLButtonElement | null>;
  originalNotes: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(18,18,28,0.52)] p-0 backdrop-blur-sm sm:p-5" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invest2030-original-title"
        className="ml-auto flex h-full w-full flex-col overflow-hidden bg-[#f7f5ef] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:max-w-xl sm:rounded-[24px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--bb-border)] p-4">
          <h2 id="invest2030-original-title" className="text-base font-extrabold text-[var(--bb-charcoal)]">Texto original completo</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Fechar texto original"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/80 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">
          {originalNotes || "Sem notas."}
        </pre>
      </section>
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  multiline = false,
  allowMove = false,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  multiline?: boolean;
  allowMove?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{title}</div>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="rounded-full border border-[var(--bb-border)] bg-white/75 px-3 py-1 text-xs font-extrabold text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
        >
          Adicionar
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 gap-2">
          {multiline ? (
            <textarea value={item} onChange={(event) => onChange(updateList(items, index, event.target.value))} className={`${textareaClass} min-h-20 flex-1`} />
          ) : (
            <input value={item} onChange={(event) => onChange(updateList(items, index, event.target.value))} className={`${inputClass} flex-1`} />
          )}
          <div className="grid content-start gap-1">
            {allowMove ? (
              <>
                <IconButton label="Subir" onClick={() => onChange(moveItem(items, index, -1))} disabled={index === 0}>
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </IconButton>
                <IconButton label="Descer" onClick={() => onChange(moveItem(items, index, 1))} disabled={index === items.length - 1}>
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </IconButton>
              </>
            ) : null}
            <IconButton label="Remover" onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function ValidationList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: "error" | "warning";
}) {
  const className =
    tone === "error"
      ? "rounded-[16px] bg-[var(--bb-red-soft)] px-3 py-2 text-xs font-bold leading-5 text-[#8f2415]"
      : "rounded-[16px] bg-[var(--bb-yellow-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--bb-charcoal)]";
  return (
    <div>
      <div className="mb-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">{title}</div>
      <div className={className}>
        {items.length ? (
          <ul className="grid gap-1">
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {empty}
          </span>
        )}
      </div>
    </div>
  );
}
