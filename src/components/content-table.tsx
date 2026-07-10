"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Archive, Copy, FileText, Pencil, Trash2, X } from "lucide-react";
import { ClientBadge } from "@/components/client-badge";
import { ContentEditorTabs } from "@/components/content-editor-tabs";
import { ContentStatusControl } from "@/components/content-status-control";
import { EmptyState, ExternalLink, Panel, TableWrap } from "@/components/ui";
import { displayContentPlatform } from "@/lib/content-platform";
import { getClientVisualToken } from "@/lib/client-visuals";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { OperationalProfile } from "@/lib/operational-profiles";
import type { Client, ContentComment, ContentItem, TeamMember } from "@/lib/types";

type ContentFormAction = (id: string, formData: FormData) => void | Promise<void>;
type ArchiveContentAction = (id: string) => void | Promise<void>;
type DeleteContentAction = (id: string) => void | Promise<void>;
type ModalSection = "general" | "brief" | "copy" | "description" | "workflow" | "links";
type ListContentCommentsAction = (contentId: string) => Promise<
  | { ok: true; comments: ContentComment[] }
  | { ok: false; message: string }
>;
type ContentCommentAction = (formData: FormData) => Promise<
  | { ok: true; comment?: ContentComment }
  | { ok: false; message: string }
>;
type DeleteContentCommentAction = (commentId: string) => Promise<
  | { ok: true; comment?: ContentComment }
  | { ok: false; message: string }
>;

type ContentTableProps = {
  items: ContentItem[];
  clients: Client[];
  teamMembers: TeamMember[];
  activeProfile: OperationalProfile;
  canPersist: boolean;
  updateContentAction: ContentFormAction;
  updateStatusAction: ContentFormAction;
  archiveContentAction: ArchiveContentAction;
  deleteContentAction: DeleteContentAction;
  listCommentsAction: ListContentCommentsAction;
  createCommentAction: ContentCommentAction;
  deleteCommentAction: DeleteContentCommentAction;
};

function displayTitle(item: ContentItem) {
  return cleanPrefixedTitle(item.title, item.clients);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

function formatPublishDateTime(item: ContentItem) {
  const date = formatDate(item.publish_date);
  const time = formatTime(item.publish_time);
  return time && date !== "-" ? `${date} · ${time}` : date;
}

function PreviewCell({
  text,
  label,
  copyLabel,
  onOpen,
}: {
  text: string | null;
  label: "Brief" | "Copy" | "Descrição";
  copyLabel: "brief" | "copy" | "descrição";
  onOpen: () => void;
}) {
  const value = text?.trim();

  if (!value) {
    return <span className="text-xs font-bold text-[var(--bb-muted)]">—</span>;
  }

  async function copyText() {
    if (!value) return;
    if (!navigator.clipboard) {
      fallbackCopy(value);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      fallbackCopy(value);
    }
  }

  return (
    <div className="flex max-w-[180px] items-start gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left text-xs font-semibold leading-5 text-[var(--bb-charcoal)] transition hover:text-[var(--bb-black)]"
        title={`Abrir ${label}`}
      >
        <span
          className="block"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {value}
        </span>
      </button>
      <button
        type="button"
        onClick={copyText}
        aria-label={`Copiar ${copyLabel}`}
        title={`Copiar ${copyLabel}`}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/55 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
      >
        <Copy className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
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

function ActionButton({
  label,
  tone = "neutral",
  onClick,
  children,
}: {
  label: string;
  tone?: "neutral" | "danger";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-grid size-9 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/55 shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
        tone === "danger"
          ? "text-[#a73522] hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)]"
          : "text-[var(--bb-charcoal)] hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

export function ContentTable({
  items,
  clients,
  teamMembers,
  activeProfile,
  canPersist,
  updateContentAction,
  updateStatusAction,
  archiveContentAction,
  deleteContentAction,
  listCommentsAction,
  createCommentAction,
  deleteCommentAction,
}: ContentTableProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState(items);
  const [editing, setEditing] = useState<{ item: ContentItem; section: ModalSection } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    window.setTimeout(() => {
      const target = modalRef.current?.querySelector<HTMLElement>(`[data-content-section="${editing.section}"]`);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      target?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    }, 80);
  }, [editing]);

  async function saveContent(formData: FormData) {
    if (!editing) return;
    if (!canPersist) {
      setSaveMessage("Modo demo: configure o Supabase para gravar alterações.");
      return;
    }

    setSaveMessage("A guardar...");
    try {
      await updateContentAction(editing.item.id, formData);
      setSaveMessage("Guardado.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao guardar conteúdo", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar o conteúdo.");
    }
  }

  async function archiveContent(item: ContentItem) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para arquivar conteúdos.");
      return;
    }

    const confirmed = window.confirm(
      `Arquivar o conteúdo "${displayTitle(item)}"?\n\nEle deixa a tabela ativa e passa a aparecer no Arquivo.`,
    );
    if (!confirmed) return;

    setTableError(null);
    try {
      await archiveContentAction(item.id);
      setLocalItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      router.refresh();
    } catch (error) {
      console.error("Erro ao arquivar conteúdo", error);
      setTableError(error instanceof Error ? error.message : "Não foi possível arquivar o conteúdo.");
    }
  }

  async function deleteContent(item: ContentItem) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para apagar conteúdos.");
      return;
    }

    const confirmed = window.confirm(
      `Apagar definitivamente o conteúdo "${displayTitle(item)}"?\n\nEsta ação não pode ser anulada.`,
    );
    if (!confirmed) return;

    setTableError(null);
    try {
      await deleteContentAction(item.id);
      setLocalItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      router.refresh();
    } catch (error) {
      console.error("Erro ao apagar conteúdo", error);
      setTableError(error instanceof Error ? error.message : "Não foi possível apagar o conteúdo.");
    }
  }

  return (
    <>
      <Panel>
        {tableError ? (
          <div className="border-b border-[var(--bb-border)] bg-[var(--bb-red-soft)] px-5 py-3 text-sm font-bold text-[#8f2415]">
            {tableError}
          </div>
        ) : null}
        {localItems.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[1260px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-4 py-4 font-extrabold">Pub.</th>
                  <th className="px-4 py-4 font-extrabold">Cliente</th>
                  <th className="px-4 py-4 font-extrabold">Plataforma</th>
                  <th className="px-4 py-4 font-extrabold">Formato</th>
                  <th className="min-w-[220px] px-4 py-4 font-extrabold">Título</th>
                  <th className="px-4 py-4 font-extrabold">Brief</th>
                  <th className="px-4 py-4 font-extrabold">Copy</th>
                  <th className="px-4 py-4 font-extrabold">Descrição</th>
                  <th className="min-w-[190px] px-4 py-4 font-extrabold">Estado</th>
                  <th className="px-4 py-4 font-extrabold">Owner</th>
                  <th className="px-4 py-4 font-extrabold">Links</th>
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {localItems.map((item) => {
                  const links = [
                    { href: item.brief_url, label: "Briefing" },
                    { href: item.media_folder_url, label: "Media" },
                    { href: item.figma_url, label: "Figma" },
                    { href: item.export_url, label: "Export" },
                    { href: item.published_url, label: "Publicação" },
                  ].filter((link): link is { href: string; label: string } => Boolean(link.href));
                  const clientToken = getClientVisualToken({
                    clientCode: item.clients?.client_code,
                    clientName: item.clients?.name,
                    shortName: item.clients?.short_name,
                    colorKey: item.clients?.color_key,
                  });

                  return (
                    <tr key={item.id} className={item.is_blocked ? "bg-[var(--bb-red-soft)]" : "odd:bg-white/18"}>
                      <td className={`border-l-4 px-4 py-4 font-medium whitespace-nowrap text-[var(--bb-muted)] ${clientToken.borderStrong}`}>{formatPublishDateTime(item)}</td>
                      <td className="max-w-56 px-4 py-4">
                        {item.clients ? (
                          <ClientBadge
                            clientId={item.clients.id}
                            clientCode={item.clients.client_code}
                            clientName={item.clients.name}
                            shortName={item.clients.short_name}
                            colorKey={item.clients.color_key}
                            variant="compact"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[var(--bb-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{displayContentPlatform(item.platform)}</td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{item.format ?? "-"}</td>
                      <td className="max-w-[260px] px-4 py-4 font-bold text-[var(--bb-charcoal)]">
                        <button
                          type="button"
                          onClick={() => setEditing({ item, section: "general" })}
                          className="text-left transition hover:text-[var(--bb-black)]"
                        >
                          <span className="bb-line-clamp-2 block">{displayTitle(item)}</span>
                        </button>
                        {item.is_blocked ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold leading-5 text-[#8f2415]">
                            <span className="whitespace-nowrap rounded-full bg-[var(--bb-red-soft)] px-2 py-1 ring-1 ring-[rgba(232,76,49,0.24)]">
                              Precisa de atenção
                            </span>
                            <span className="min-w-0 break-words">{item.blocker_reason ?? "Nota por adicionar"}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <PreviewCell text={item.creative_brief} label="Brief" copyLabel="brief" onOpen={() => setEditing({ item, section: "brief" })} />
                      </td>
                      <td className="px-4 py-4">
                        <PreviewCell text={item.copy_text} label="Copy" copyLabel="copy" onOpen={() => setEditing({ item, section: "copy" })} />
                      </td>
                      <td className="px-4 py-4">
                        <PreviewCell text={item.description} label="Descrição" copyLabel="descrição" onOpen={() => setEditing({ item, section: "description" })} />
                      </td>
                      <td className="px-4 py-4">
                        <ContentStatusControl
                          itemId={item.id}
                          status={item.status}
                          canPersist={canPersist}
                          updateStatusAction={updateStatusAction}
                          className="w-52"
                        />
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{item.assignee_name ?? "-"}</td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-56 flex-wrap gap-1.5">
                          {links.length ? links.map((link) => <ExternalLink key={`${item.id}-${link.label}`} href={link.href} label={link.label} />) : <span className="text-xs font-bold text-[var(--bb-muted)]">—</span>}
                        </div>
                      </td>
                      <td className="bb-actions-col sticky right-0 px-2 py-4">
                        <div className="bb-actions-row">
                          <ActionButton label="Editar" onClick={() => setEditing({ item, section: "general" })}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </ActionButton>
                          {item.status === "archived" ? (
                            <form action={() => deleteContent(item)}>
                              <ActionButton label="Apagar definitivamente" tone="danger">
                              <Trash2 className="size-4" aria-hidden="true" />
                              </ActionButton>
                            </form>
                          ) : (
                            <form action={() => archiveContent(item)}>
                              <ActionButton label="Arquivar">
                                <Archive className="size-4" aria-hidden="true" />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Não encontrámos resultados com estes filtros." />
        )}
      </Panel>

      {editing && typeof document !== "undefined" ? createPortal(
        <div
          data-portal="modal"
          className="fixed inset-0 bg-[rgba(12,16,18,0.32)] p-3 backdrop-blur-sm md:p-6"
          style={{ zIndex: 99990 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Editar conteúdo"
            className="mx-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:max-h-[calc(100vh-3rem)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--bb-border)] bg-white/60 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                  <FileText className="size-4" aria-hidden="true" />
                  Editar conteúdo
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--bb-charcoal)]">{displayTitle(editing.item)}</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                title="Fechar"
                className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              {saveMessage ? (
                <div className="mb-4 rounded-[16px] border border-[var(--bb-border)] bg-white/55 px-4 py-3 text-sm font-bold text-[var(--bb-muted)]">
                  {saveMessage}
                </div>
              ) : null}
              <ContentEditorTabs
                item={editing.item}
                clients={clients}
                teamMembers={teamMembers}
                activeProfile={activeProfile}
                canPersist={canPersist}
                contentAction={saveContent}
                submitLabel="Guardar alterações"
                initialComments={[]}
                listCommentsAction={listCommentsAction}
                createCommentAction={createCommentAction}
                deleteCommentAction={deleteCommentAction}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
