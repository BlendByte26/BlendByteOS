"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { Client, ContentItem, SetupChecklistItem, Task } from "@/lib/types";

type UpdateChecklistAction = (
  id: string,
  checklist: SetupChecklistItem[],
) => Promise<SetupChecklistItem[]>;
type CreateChecklistAction = (id: string) => Promise<SetupChecklistItem[]>;
type UpdateLinksAction = (id: string, formData: FormData) => Promise<Partial<Client>>;

type LinkItem = {
  key: keyof Client;
  label: string;
  href: string | null;
};

type LinkGroup = {
  title: string;
  links: LinkItem[];
};

const linkFieldGroups: Array<{ title: string; fields: Array<{ key: keyof Client; label: string }> }> = [
  {
    title: "Trabalho interno",
    fields: [
      { key: "google_drive_url", label: "Google Drive" },
      { key: "onedrive_url", label: "OneDrive" },
      { key: "figma_project_url", label: "Figma" },
      { key: "final_deliverables_url", label: "Entregáveis" },
      { key: "content_calendar_url", label: "Planeamento / calendário de conteúdos" },
      { key: "reporting_url", label: "Pasta de reporting" },
    ],
  },
  {
    title: "Documentos",
    fields: [
      { key: "proposal_url", label: "Proposta" },
      { key: "contract_url", label: "Contrato" },
      { key: "adjudication_url", label: "Adjudicação" },
      { key: "brand_assets_url", label: "Brand assets" },
      { key: "initial_briefing_url", label: "Briefing inicial" },
      { key: "conditions_url", label: "Documento de condições" },
    ],
  },
  {
    title: "Plataformas",
    fields: [
      { key: "website_url", label: "Website" },
      { key: "instagram_url", label: "Instagram" },
      { key: "facebook_url", label: "Facebook" },
      { key: "linkedin_url", label: "LinkedIn" },
      { key: "tiktok_url", label: "TikTok" },
      { key: "youtube_url", label: "YouTube" },
      { key: "meta_url", label: "Meta Business / Ads" },
      { key: "linkedin_campaign_manager_url", label: "LinkedIn Campaign Manager" },
      { key: "crm_newsletter_url", label: "Newsletter platform" },
    ],
  },
];

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function linkGroupsFor(client: Client): LinkGroup[] {
  return linkFieldGroups.map((group) => ({
    title: group.title,
    links: group.fields
      .map((field) => ({
        ...field,
        href: textValue(client[field.key]) || null,
      }))
      .filter((link) => Boolean(link.href)),
  }));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

export function ClientOperationalControls({
  client,
  tasks,
  content,
  canEdit,
  updateChecklistAction,
  createChecklistAction,
  updateLinksAction,
}: {
  client: Client;
  tasks: Task[];
  content: ContentItem[];
  canEdit: boolean;
  updateChecklistAction: UpdateChecklistAction;
  createChecklistAction: CreateChecklistAction;
  updateLinksAction: UpdateLinksAction;
}) {
  const router = useRouter();
  const [localClient, setLocalClient] = useState(client);
  const [checklist, setChecklist] = useState<SetupChecklistItem[]>(client.setup_checklist ?? []);
  const [checklistMessage, setChecklistMessage] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [linksMessage, setLinksMessage] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const linkGroups = useMemo(() => linkGroupsFor(localClient), [localClient]);
  const hasLinks = linkGroups.some((group) => group.links.length > 0);
  const completed = checklist.filter((item) => item.done);
  const percent = checklist.length ? Math.round((completed.length / checklist.length) * 100) : 0;
  const blockers = [
    ...tasks
      .filter((task) => task.is_blocked)
      .map((task) => ({
        id: task.id,
        type: "Tarefa",
        title: getTaskDisplayTitle(task),
        reason: task.blocker_reason ?? "Motivo por adicionar",
        owner: task.assignee_name ?? "-",
        date: task.due_date,
        href: `/tasks/${task.id}/edit`,
      })),
    ...content
      .filter((item) => item.is_blocked)
      .map((item) => ({
        id: item.id,
        type: "Conteúdo",
        title: cleanPrefixedTitle(item.title, item.clients),
        reason: item.blocker_reason ?? "Motivo por adicionar",
        owner: item.assignee_name ?? "-",
        date: item.publish_date,
        href: `/content/${item.id}/edit`,
      })),
  ];
  const visibleBlockers = blockers.slice(0, 5);
  const hiddenBlockers = Math.max(0, blockers.length - visibleBlockers.length);

  function saveChecklist(nextChecklist: SetupChecklistItem[]) {
    setChecklist(nextChecklist);
    setChecklistError(null);
    setChecklistMessage("A guardar...");
    startTransition(() => {
      void updateChecklistAction(localClient.id, nextChecklist)
        .then((saved) => {
          setChecklist(saved);
          setChecklistMessage("Guardado");
          window.setTimeout(() => setChecklistMessage(null), 1600);
          router.refresh();
        })
        .catch(() => {
          setChecklistError("Não foi possível guardar a checklist.");
          setChecklistMessage(null);
        });
    });
  }

  function toggleChecklistItem(label: string, done: boolean) {
    saveChecklist(checklist.map((item) => (item.label === label ? { ...item, done } : item)));
  }

  function createDefaultChecklist() {
    setChecklistError(null);
    setChecklistMessage("A guardar...");
    startTransition(() => {
      void createChecklistAction(localClient.id)
        .then((saved) => {
          setChecklist(saved);
          setChecklistMessage("Guardado");
          window.setTimeout(() => setChecklistMessage(null), 1600);
          router.refresh();
        })
        .catch(() => {
          setChecklistError("Não foi possível guardar a checklist.");
          setChecklistMessage(null);
        });
    });
  }

  async function saveLinks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingLinks(true);
    setLinksError(null);
    setLinksMessage("A guardar...");

    try {
      const saved = await updateLinksAction(localClient.id, new FormData(event.currentTarget));
      setLocalClient((current) => ({ ...current, ...saved }));
      setLinksMessage("Guardado");
      setLinksOpen(false);
      router.refresh();
    } catch {
      setLinksError("Não foi possível guardar os links.");
      setLinksMessage(null);
    } finally {
      setIsSavingLinks(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelHeader title="Links rápidos" />
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setLinksError(null);
                  setLinksMessage(null);
                  setLinksOpen(true);
                }}
                className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                Editar links
              </button>
            ) : null}
          </div>
          {hasLinks ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {linkGroups.map((group) => (
                <QuickLinkGroup key={group.title} group={group} />
              ))}
            </div>
          ) : (
            <EmptyState title="Ainda não há links preenchidos para este cliente." />
          )}
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <PanelHeader title="Setup do cliente" />
            {checklist.length ? (
              <span className="rounded-full bg-white/65 px-3 py-1 text-xs font-extrabold text-[var(--bb-muted)] ring-1 ring-[var(--bb-border)]">
                {completed.length}/{checklist.length} concluído
              </span>
            ) : null}
          </div>
          {checklist.length ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/65">
                <div className="h-full rounded-full bg-[var(--bb-primary)]" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-4 grid gap-2">
                {checklist.map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center gap-3 rounded-[14px] border border-[var(--bb-border)] bg-white/45 px-3 py-2 text-xs font-bold text-[var(--bb-charcoal)]"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={!canEdit}
                      onChange={(event) => toggleChecklistItem(item.label, event.target.checked)}
                      className="size-4 accent-[var(--bb-primary)] disabled:cursor-not-allowed"
                    />
                    <span className={item.done ? "text-[var(--bb-charcoal)]" : "text-[var(--bb-muted)]"}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-dashed border-[var(--bb-border)] bg-white/35 p-4">
              <p className="text-sm font-semibold text-[var(--bb-muted)]">
                Ainda não existe checklist de setup para este cliente.
              </p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={createDefaultChecklist}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
                >
                  Criar checklist padrão
                </button>
              ) : null}
            </div>
          )}
          <div className="mt-3 min-h-5 text-xs font-bold">
            {checklistError ? <span className="text-[#8f2415]">{checklistError}</span> : null}
            {checklistMessage ? <span className="text-[var(--bb-muted)]">{isPending ? "A guardar..." : checklistMessage}</span> : null}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <PanelHeader title="Bloqueios" />
        {visibleBlockers.length ? (
          <div className="mt-4 grid gap-2">
            {visibleBlockers.map((blocker) => (
              <Link
                key={`${blocker.type}-${blocker.id}`}
                href={blocker.href}
                className="rounded-[16px] border border-[rgba(232,76,49,0.18)] bg-[var(--bb-red-soft)] px-4 py-3 transition hover:bg-[rgba(232,76,49,0.2)]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#8f2415]">
                  <span>{blocker.type}</span>
                  <span>·</span>
                  <span>{formatDate(blocker.date)}</span>
                  <span>·</span>
                  <span>{blocker.owner}</span>
                </div>
                <div className="bb-line-clamp-2 mt-1 text-sm font-extrabold text-[var(--bb-charcoal)]">
                  {blocker.title}
                </div>
                <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[#8f2415]">
                  {blocker.reason}
                </div>
              </Link>
            ))}
            {hiddenBlockers ? (
              <div className="rounded-full bg-white/55 px-3 py-2 text-xs font-extrabold text-[var(--bb-muted)]">
                +{hiddenBlockers} bloqueios
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="Sem bloqueios neste cliente." />
        )}
      </Panel>

      {canEdit && linksOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 bg-[rgba(12,16,18,0.32)] p-3 backdrop-blur-sm md:p-6"
              style={{ zIndex: 99990 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setLinksOpen(false);
              }}
            >
              <form
                onSubmit={saveLinks}
                className="mx-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:max-h-[calc(100vh-3rem)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--bb-border)] bg-white/60 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Editar links</h2>
                    <p className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                      Não guardar passwords, tokens ou chaves de acesso no BlendByteOS.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinksOpen(false)}
                    aria-label="Fechar"
                    title="Fechar"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="overflow-y-auto px-5 py-5">
                  <div className="grid gap-5 lg:grid-cols-3">
                    {linkFieldGroups.map((group) => (
                      <div key={group.title} className="grid content-start gap-3">
                        <h3 className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{group.title}</h3>
                        {group.fields.map((field) => (
                          <label key={String(field.key)} className="grid gap-1.5 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                            {field.label}
                            <input
                              name={String(field.key)}
                              type="url"
                              defaultValue={textValue(localClient[field.key])}
                              placeholder="Colar link"
                              className="bb-input min-h-10 px-3 text-sm font-medium normal-case placeholder:text-[var(--bb-muted)]"
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  {linksError ? <div className="mt-4 text-sm font-bold text-[#8f2415]">{linksError}</div> : null}
                  {linksMessage ? <div className="mt-4 text-sm font-bold text-[var(--bb-muted)]">{isSavingLinks ? "A guardar..." : linksMessage}</div> : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--bb-border)] bg-white/45 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setLinksOpen(false)}
                    className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLinks}
                    className="inline-flex min-h-10 items-center rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar links
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PanelHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>;
}

function QuickLinkGroup({ group }: { group: LinkGroup }) {
  return (
    <div className="rounded-[18px] border border-[var(--bb-border)] bg-white/42 p-4">
      <h3 className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{group.title}</h3>
      {group.links.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {group.links.map((link) => (
            <LinkPill key={`${group.title}-${link.label}`} href={link.href ?? ""} label={link.label} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[var(--bb-muted)]">Sem links preenchidos.</p>
      )}
    </div>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-8 max-w-full items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition hover:border-[rgba(83,183,223,0.44)] hover:bg-[var(--bb-primary-soft)]"
    >
      <span className="truncate">{label}</span>
    </a>
  );
}
