"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import { ContentEditorTabs } from "@/components/content-editor-tabs";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { AuthenticatedOperationalProfile } from "@/lib/auth";
import type { Client, ContentComment, ContentItem, TeamMember } from "@/lib/types";

export type ContentEditSection = "general" | "brief" | "copy" | "description" | "workflow" | "links";
export type ContentEditingState = { item: ContentItem; section: ContentEditSection };

type ContentFormAction = (id: string, formData: FormData) => void | Promise<void>;
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

type ContentEditModalProps = {
  editing: ContentEditingState | null;
  clients: Client[];
  teamMembers: TeamMember[];
  activeProfile: AuthenticatedOperationalProfile;
  canPersist: boolean;
  updateContentAction: ContentFormAction;
  listCommentsAction: ListContentCommentsAction;
  createCommentAction: ContentCommentAction;
  deleteCommentAction: DeleteContentCommentAction;
  onClose: () => void;
};

function displayTitle(item: ContentItem) {
  return cleanPrefixedTitle(item.title, item.clients);
}

export function ContentEditModal({
  editing,
  clients,
  teamMembers,
  activeProfile,
  canPersist,
  updateContentAction,
  listCommentsAction,
  createCommentAction,
  deleteCommentAction,
  onClose,
}: ContentEditModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [saveMessage, setSaveMessage] = useState<{ itemId: string; message: string } | null>(null);

  useEffect(() => {
    if (!editing) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [editing, onClose]);

  useEffect(() => {
    if (!editing) return;
    window.setTimeout(() => {
      const target = modalRef.current?.querySelector<HTMLElement>(`[data-content-section="${editing.section}"]`);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      target?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    }, 80);
  }, [editing]);

  if (!editing || typeof document === "undefined") return null;

  async function saveContent(formData: FormData) {
    if (!editing) return;
    if (!canPersist) {
      setSaveMessage({
        itemId: editing.item.id,
        message: "Modo demo: configure o Supabase para gravar alterações.",
      });
      return;
    }

    setSaveMessage({ itemId: editing.item.id, message: "A guardar..." });
    try {
      await updateContentAction(editing.item.id, formData);
      setSaveMessage({ itemId: editing.item.id, message: "Guardado." });
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Erro ao guardar conteúdo", error);
      setSaveMessage({
        itemId: editing.item.id,
        message: error instanceof Error ? error.message : "Não foi possível guardar o conteúdo.",
      });
    }
  }

  const visibleSaveMessage = saveMessage?.itemId === editing.item.id ? saveMessage.message : null;

  return createPortal(
    <div
      data-portal="modal"
      className="fixed inset-0 bg-[rgba(12,16,18,0.32)] p-3 backdrop-blur-sm md:p-6"
      style={{ zIndex: 99990 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          {visibleSaveMessage ? (
            <div className="mb-4 rounded-[16px] border border-[var(--bb-border)] bg-white/55 px-4 py-3 text-sm font-bold text-[var(--bb-muted)]">
              {visibleSaveMessage}
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
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
