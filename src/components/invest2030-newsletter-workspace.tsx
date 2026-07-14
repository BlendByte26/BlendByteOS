"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Clipboard, Download, ExternalLink, Save, Send, Smartphone, Trash2, Monitor } from "lucide-react";
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

type Props = {
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
const sectionClass = "rounded-[20px] border border-[var(--bb-border)] bg-white/72 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.05)]";

function fieldRows(parsedRequest: Invest2030NewsletterParsedRequest) {
  return [
    ["Nome da campanha", parsedRequest.campaignName],
    ["Tipo de ação", parsedRequest.actionTypes],
    ["Quem está a pedir", parsedRequest.requestedBy],
    ["Período", parsedRequest.period],
    ["Objetivo principal", parsedRequest.mainObjective],
    ["Público-alvo / segmentação", parsedRequest.targetAudience],
    ["Texto do botão principal", parsedRequest.primaryButtonText],
    ["Link do botão principal", parsedRequest.primaryButtonUrl],
    ["Tema / mensagem principal", parsedRequest.mainMessage],
    ["Informação obrigatória", parsedRequest.mandatoryInformation],
    ["Estado da informação", parsedRequest.informationStatus],
    ["Observações", parsedRequest.observations],
  ] as const;
}

function ButtonShell({
  children,
  tone = "secondary",
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    tone === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-45"
      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
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

export function Invest2030NewsletterWorkspace({
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
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewWidth, setPreviewWidth] = useState(680);
  const [saveState, formAction, saving] = useActionState(saveAction, { ok: true, message: "" });
  const exportedFormRef = useRef<HTMLFormElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
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
  const iframeHeight = 720;

  useEffect(() => {
    const node = previewShellRef.current;
    if (!node) return;

    const updateWidth = () => setPreviewWidth(node.clientWidth || iframeViewportWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [iframeViewportWidth]);

  function patchContent(patch: Partial<Invest2030NewsletterContent>) {
    setContent((current) => ({ ...current, ...patch }));
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
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(520px,1.15fr)] 2xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.1fr)_minmax(380px,1fr)]">
      <form ref={exportedFormRef} action={markExportedAction} className="hidden" />
      <aside className="grid min-w-0 content-start gap-4">
        <section className={sectionClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Pedido recebido</h2>
            <span className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--bb-charcoal)]">
              {newsletter ? invest2030NewsletterStatusLabels[newsletter.status] : "Novo"}
            </span>
          </div>
          <div className="grid gap-3">
            {fieldRows(parsedRequest).map(([label, value]) => (
              <div key={label}>
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
          <details className="mt-4 rounded-[16px] border border-[var(--bb-border)] bg-white/70 p-3">
            <summary className="cursor-pointer text-sm font-extrabold text-[var(--bb-charcoal)]">Ver notas originais</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--bb-muted)]">{parsedRequest.originalNotes || "Sem notas."}</pre>
          </details>
        </section>

        <section className={sectionClass}>
          <h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">Preparação para GPT</h2>
          <div className="grid gap-2">
            <ButtonShell onClick={copyBriefing} tone="primary">
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
            {!gptUrl ? (
              <div className="text-xs font-bold leading-5 text-[var(--bb-muted)]">
                NEXT_PUBLIC_INVEST2030_GPT_URL ainda não está configurado.
              </div>
            ) : null}
            {finalCta.usedDefault ? (
              <div className="rounded-[16px] bg-[var(--bb-yellow-soft)] px-3 py-2 text-xs font-extrabold text-[var(--bb-charcoal)]">
                Link de contacto aplicado automaticamente
              </div>
            ) : null}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">Colar resposta do GPT</h2>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            className={`${textareaClass} min-h-44 w-full font-mono text-xs`}
            placeholder='{"subject": "..."}'
          />
          {jsonError ? <div className="mt-2 text-xs font-bold text-[#8f2415]">{jsonError}</div> : null}
          <div className="mt-3">
            <ButtonShell onClick={importJson} tone="primary">Importar conteúdo</ButtonShell>
          </div>
        </section>
      </aside>

      <main className="grid min-w-0 content-start gap-4">
        <section className={sectionClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Editor de conteúdo</h2>
            <form action={formAction}>
              <input type="hidden" name="content_json" value={JSON.stringify(contentWithFinalLink)} />
              <ButtonShell type="submit" tone="primary" disabled={saving}>
                <Save className="size-4" aria-hidden="true" />
                Guardar rascunho
              </ButtonShell>
            </form>
          </div>
          {saveState.message ? (
            <div className={`mb-4 rounded-[16px] px-3 py-2 text-xs font-extrabold ${saveState.ok ? "bg-[var(--bb-green-soft)] text-[var(--bb-charcoal)]" : "bg-[var(--bb-red-soft)] text-[#8f2415]"}`}>
              {saveState.message}
            </div>
          ) : null}
          <div className="grid gap-4">
            <TextInput label="Assunto" value={content.subject} onChange={(value) => patchContent({ subject: value })} />
            <TextInput label="Preheader" value={content.preheader} onChange={(value) => patchContent({ preheader: value })} />
            <TextInput label="Eyebrow" value={content.eyebrow} onChange={(value) => patchContent({ eyebrow: value })} />
            <TextInput label="Título principal" value={content.hero_title} onChange={(value) => patchContent({ hero_title: value })} multiline />
            <TextInput label="Subtítulo" value={content.hero_subtitle} onChange={(value) => patchContent({ hero_subtitle: value })} multiline />

            <div className="grid gap-3">
              <div className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">Quatro indicadores</div>
              {content.stats.slice(0, 4).map((stat, index) => (
                <div key={index} className="grid gap-2 rounded-[16px] border border-[var(--bb-border)] bg-white/60 p-3 md:grid-cols-2">
                  <input
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

            <ListEditor title="Parágrafos de introdução" items={content.intro_paragraphs} onChange={(items) => patchContent({ intro_paragraphs: items })} multiline />
            <TextInput label="Título da lista de benefícios" value={content.benefits_title} onChange={(value) => patchContent({ benefits_title: value })} />
            <ListEditor title="Benefícios" items={content.benefits} onChange={(items) => patchContent({ benefits: items })} allowMove />
            <TextInput label="Título da secção de público" value={content.audience_section_title} onChange={(value) => patchContent({ audience_section_title: value })} />
            <TextInput label="Título do bloco de público" value={content.audience_title} onChange={(value) => patchContent({ audience_title: value })} />
            <TextInput label="Texto do público-alvo" value={content.audience_body} onChange={(value) => patchContent({ audience_body: value })} multiline />
            <TextInput label="Exclusões" value={content.exclusions} onChange={(value) => patchContent({ exclusions: value })} multiline />
            <ListEditor title="Parágrafos finais" items={content.closing_paragraphs} onChange={(items) => patchContent({ closing_paragraphs: items })} multiline />
            <TextInput label="Texto do primeiro CTA" value={content.primary_cta_label} onChange={(value) => patchContent({ primary_cta_label: value })} />
            <TextInput label="Texto do segundo CTA" value={content.secondary_cta_label} onChange={(value) => patchContent({ secondary_cta_label: value })} />
            <TextInput label="URL dos CTAs" value={finalCta.url} onChange={() => undefined} />
          </div>
        </section>
      </main>

      <aside className="grid min-w-0 content-start gap-4 xl:col-span-2 2xl:col-span-1">
        <section className={sectionClass}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Preview e exportação</h2>
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
          <div ref={previewShellRef} className="overflow-hidden rounded-[18px] border border-[var(--bb-border)] bg-[#f3f1ea] p-3">
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
                  className="h-[720px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
                  style={{ width: iframeViewportWidth }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">Validações</h2>
          <ValidationList title="Bloqueios" items={validation.blockers} empty="Sem bloqueios." tone="error" />
          <div className="mt-3">
            <ValidationList title="Avisos" items={validation.warnings} empty="Sem avisos." tone="warning" />
          </div>
        </section>

        <section className={sectionClass}>
          <div className="grid gap-2">
            <ButtonShell onClick={copyHtml} tone="primary">
              <Clipboard className="size-4" aria-hidden="true" />
              Copiar HTML
            </ButtonShell>
            <ButtonShell onClick={downloadHtml}>
              <Download className="size-4" aria-hidden="true" />
              Descarregar HTML
            </ButtonShell>
            {notice ? <div className="text-xs font-extrabold text-[var(--bb-muted)]">{notice}</div> : null}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">Agendamento</h2>
          {newsletter?.scheduled_at ? (
            <div className="mb-3 rounded-[16px] bg-[var(--bb-green-soft)] px-3 py-2 text-sm font-bold text-[var(--bb-charcoal)]">
              Campanha agendada para: {new Date(newsletter.scheduled_at).toLocaleString("pt-PT")}
              {newsletter.scheduled_by ? (
                <span className="mt-1 block text-xs text-[var(--bb-muted)]">
                  Registado por {newsletter.scheduled_by}
                  {newsletter.scheduled_recorded_at ? ` em ${new Date(newsletter.scheduled_recorded_at).toLocaleString("pt-PT")}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
          <form action={markScheduledAction} className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-2">
              <input name="scheduled_date" type="date" required className={inputClass} />
              <input name="scheduled_time" type="time" required className={inputClass} />
            </div>
            <textarea name="scheduled_note" className={`${textareaClass} min-h-20`} placeholder="Observação opcional" />
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
      </aside>
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
        <div key={index} className="flex gap-2">
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
          empty
        )}
      </div>
    </div>
  );
}
