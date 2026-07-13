"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { operationalProfiles, type OperationalProfile, type OperationalProfileKey } from "@/lib/operational-profiles";
import type { ContentComment } from "@/lib/types";

type ContentCommentsResult =
  | { ok: true; comments: ContentComment[] }
  | { ok: false; message: string };

type ContentCommentMutationResult =
  | { ok: true; comment?: ContentComment }
  | { ok: false; message: string };

type ContentCommentsProps = {
  contentId: string;
  initialComments: ContentComment[];
  activeProfile: OperationalProfile;
  canPersist: boolean;
  listAction?: (contentId: string) => Promise<ContentCommentsResult>;
  createAction: (formData: FormData) => Promise<ContentCommentMutationResult>;
  deleteAction: (commentId: string) => Promise<ContentCommentMutationResult>;
  onCountChange?: (count: number) => void;
};

const mentionProfiles = Object.values(operationalProfiles);

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function profileName(key: string) {
  return operationalProfiles[key as OperationalProfileKey]?.name ?? key;
}

function canDeleteComment(comment: ContentComment, activeProfile: OperationalProfile) {
  return activeProfile.key === "guilherme" || comment.author_profile_key === activeProfile.key;
}

export function ContentComments({
  contentId,
  initialComments,
  activeProfile,
  canPersist,
  listAction,
  createAction,
  deleteAction,
  onCountChange,
}: ContentCommentsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<OperationalProfileKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!listAction) return;

    let active = true;
    startTransition(async () => {
      const result = await listAction(contentId);
      if (!active) return;
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setComments(result.comments);
      onCountChange?.(result.comments.length);
    });

    return () => {
      active = false;
    };
  }, [contentId, listAction, onCountChange]);

  function addMention(key: OperationalProfileKey, name: string) {
    const mention = `@${name}`;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const prefix = body.slice(0, start);
    const suffix = body.slice(end);
    const spacingBefore = prefix && !prefix.endsWith(" ") && !prefix.endsWith("\n") ? " " : "";
    const spacingAfter = suffix && !suffix.startsWith(" ") && !suffix.startsWith("\n") ? " " : "";
    const nextBody = `${prefix}${spacingBefore}${mention}${spacingAfter}${suffix}`;

    setBody(nextBody);
    setMentions((current) => Array.from(new Set([...current, key])));

    window.setTimeout(() => {
      textareaRef.current?.focus();
      const cursor = prefix.length + spacingBefore.length + mention.length + spacingAfter.length;
      textareaRef.current?.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function submit(formData: FormData) {
    setMessage(null);

    if (!canPersist) {
      setMessage("Modo demo: configure o Supabase para comentar.");
      return;
    }

    startTransition(async () => {
      const result = await createAction(formData);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (result.comment) {
        setComments((current) => {
          const next = [...current, result.comment!];
          onCountChange?.(next.length);
          return next;
        });
      }

      setBody("");
      setMentions([]);
      setMessage(null);
    });
  }

  function deleteComment(commentId: string) {
    const confirmed = window.confirm(
      "Apagar definitivamente este comentário?\n\nEsta ação não pode ser anulada.",
    );
    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await deleteAction(commentId);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setComments((current) => {
        const next = current.filter((comment) => comment.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
    });
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--bb-charcoal)]">
            <MessageSquare className="size-4" aria-hidden="true" />
            Comentários ({comments.length})
          </h3>
          <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">
            Notas simples para este conteúdo.
          </p>
        </div>
        <span className="rounded-full border border-[var(--bb-border)] bg-white/65 px-3 py-2 text-xs font-extrabold text-[var(--bb-muted)]">
          A comentar como {activeProfile.name}
        </span>
      </div>

      <form action={submit} className="grid gap-3 rounded-[20px] border border-[var(--bb-border)] bg-white/45 p-4">
        <input type="hidden" name="content_id" value={contentId} />
        {mentions.map((mention) => (
          <input key={mention} type="hidden" name="mentioned_profile_keys" value={mention} />
        ))}
        <textarea
          ref={textareaRef}
          name="body"
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="bb-textarea min-h-28 text-sm font-medium placeholder:text-[var(--bb-muted)]"
          placeholder="Escrever comentário..."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {mentionProfiles.map((profile) => (
              <button
                key={profile.key}
                type="button"
                onClick={() => addMention(profile.key, profile.name)}
                className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-extrabold transition ${
                  mentions.includes(profile.key)
                    ? "border-[var(--bb-black)] bg-[var(--bb-black)] text-white"
                    : "border-[var(--bb-border)] bg-white/75 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                }`}
              >
                @{profile.name}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Send className="size-4" aria-hidden="true" />
            {isPending ? "A comentar..." : "Comentar"}
          </button>
        </div>
      </form>

      {message ? (
        <div className="rounded-[16px] border border-[var(--bb-border)] bg-white/65 px-4 py-3 text-sm font-bold text-[var(--bb-muted)]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3">
        {comments.length ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-[18px] border border-[var(--bb-border)] bg-white/58 px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{comment.author_name}</div>
                  <div className="mt-0.5 text-xs font-bold text-[var(--bb-muted)]">
                    {formatCommentDate(comment.created_at)}
                  </div>
                </div>
                {canDeleteComment(comment, activeProfile) ? (
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id)}
                    aria-label="Apagar comentário"
                    title="Apagar comentário"
                    className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 text-[#a73522] transition hover:bg-[var(--bb-red-soft)]"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--bb-charcoal)]">
                {comment.body}
              </p>
              {comment.mentioned_profile_keys.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.mentioned_profile_keys.map((key) => (
                    <span
                      key={`${comment.id}-${key}`}
                      className="rounded-full border border-[rgba(83,183,223,0.38)] bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--bb-charcoal)]"
                    >
                      @{profileName(key)}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--bb-border)] bg-white/35 px-4 py-6 text-center text-sm font-bold text-[var(--bb-muted)]">
            Ainda não há comentários neste conteúdo.
          </div>
        )}
      </div>
    </section>
  );
}
