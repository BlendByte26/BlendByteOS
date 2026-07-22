"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Send } from "lucide-react";
import { ContentReviewPresentation } from "@/components/content-review-presentation";
import { submitContentReviewAction } from "@/lib/content-review-actions";
import { contentReviewDecisionSummary, contentReviewStatusLabels, type ContentReviewView } from "@/lib/content-reviews";
import type { ContentReviewDecision } from "@/lib/types";

type ResponseState = Record<string, { decision: ContentReviewDecision; comment: string }>;

function initialResponses(review: ContentReviewView): ResponseState {
  return Object.fromEntries(review.blocks.map((block) => [
    block.id,
    { decision: block.decision, comment: block.client_comment ?? "" },
  ]));
}

export function ContentReviewPublicForm({ review, token }: { review: ContentReviewView; token: string }) {
  const router = useRouter();
  const storageKey = `blendbyte-content-review:${review.id}`;
  const [responses, setResponses] = useState<ResponseState>(() => initialResponses(review));
  const [name, setName] = useState(review.recipient_name ?? "");
  const [email, setEmail] = useState(review.recipient_email ?? "");
  const [generalComment, setGeneralComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const open = review.status === "open";

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as { responses?: ResponseState; name?: string; email?: string; generalComment?: string };
        if (saved.responses) setResponses((current) => ({ ...current, ...saved.responses }));
        if (typeof saved.name === "string") setName(saved.name);
        if (typeof saved.email === "string") setEmail(saved.email);
        if (typeof saved.generalComment === "string") setGeneralComment(saved.generalComment);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ responses, name, email, generalComment }));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [email, generalComment, name, open, responses, storageKey]);

  function setDecision(blockId: string, decision: ContentReviewDecision) {
    setResponses((current) => ({
      ...current,
      [blockId]: { ...(current[blockId] ?? { comment: "" }), decision },
    }));
    setMessage(null);
  }

  function setComment(blockId: string, comment: string) {
    setResponses((current) => ({
      ...current,
      [blockId]: { ...(current[blockId] ?? { decision: "pending" }), comment },
    }));
  }

  function approveRemaining() {
    setResponses((current) => Object.fromEntries(review.blocks.map((block) => {
      const response = current[block.id] ?? { decision: "pending", comment: "" };
      return [block.id, response.decision === "pending" ? { ...response, decision: "approved" } : response];
    })));
    setMessage(null);
  }

  function submit() {
    const decisions = review.blocks.map((block) => ({
      blockId: block.id,
      decision: responses[block.id]?.decision ?? "pending",
      comment: responses[block.id]?.comment.trim() || null,
    }));
    if (decisions.some((decision) => decision.decision === "pending")) {
      setMessage("Indique a sua decisão em todos os blocos antes de enviar a resposta.");
      return;
    }
    if (decisions.some((decision) => decision.decision === "changes_requested" && !decision.comment)) {
      setMessage("Explique as alterações necessárias nos blocos assinalados.");
      return;
    }
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      setMessage("Indique o seu nome e um email válido.");
      return;
    }

    const formData = new FormData();
    formData.set("submission", JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      generalComment: generalComment.trim() || null,
      decisions,
    }));
    setMessage(null);
    startTransition(async () => {
      const result = await submitContentReviewAction(token, formData);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      window.localStorage.removeItem(storageKey);
      setMessage(result.alreadySubmitted ? "Esta resposta já tinha sido registada." : "Resposta enviada. Obrigado pela aprovação.");
      router.refresh();
    });
  }

  if (!open) {
    const summary = contentReviewDecisionSummary(review.blocks);
    return (
      <div className="grid gap-5">
        <div className="rounded-[22px] border border-[rgba(83,183,223,0.36)] bg-[var(--bb-primary-soft)] px-5 py-4 text-sm font-bold leading-6 text-[var(--bb-charcoal)]">
          <div className="text-base font-extrabold">{contentReviewStatusLabels[review.status]}</div>
          <p className="mt-1">{summary.approved} aprovados · {summary.changes} com alterações pedidas. Esta ronda já não aceita novas respostas.</p>
        </div>
        <ContentReviewPresentation review={review} />
      </div>
    );
  }

  const summary = contentReviewDecisionSummary(Object.values(responses));

  return (
    <div className="grid gap-6">
      <ContentReviewPresentation
        review={review}
        interactive
        responses={responses}
        onDecisionChange={setDecision}
        onCommentChange={setComment}
      />

      <section className="rounded-[26px] border border-[var(--bb-border)] bg-white/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.07)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">Enviar aprovação</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--bb-muted)]">{summary.approved} aprovados · {summary.changes} com alterações · {summary.pending} por decidir</p>
          </div>
          {summary.pending ? (
            <button type="button" onClick={approveRemaining} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]">
              <CheckCheck className="size-4" aria-hidden="true" />
              Aprovar restantes
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
            Nome de quem responde
            <input value={name} onChange={(event) => setName(event.currentTarget.value)} className="min-h-11 rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 text-sm font-semibold outline-none focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[var(--bb-primary-soft)]" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} className="min-h-11 rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 text-sm font-semibold outline-none focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[var(--bb-primary-soft)]" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[var(--bb-charcoal)] md:col-span-2">
            Comentário geral opcional
            <textarea value={generalComment} onChange={(event) => setGeneralComment(event.currentTarget.value)} rows={4} className="min-h-24 resize-y rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[var(--bb-primary-soft)]" />
          </label>
        </div>

        {message ? <p role="status" className="mt-4 rounded-2xl border border-[var(--bb-border)] bg-[#f7f7f4] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">{message}</p> : null}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={submit} disabled={isPending} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--bb-black)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-55">
            <Send className="size-4" aria-hidden="true" />
            {isPending ? "A enviar..." : "Enviar resposta final"}
          </button>
        </div>
      </section>
    </div>
  );
}
