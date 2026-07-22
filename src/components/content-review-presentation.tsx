import { Check, MessageSquareText, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ClientLogo } from "@/components/client-logo";
import { ContentReviewBlockTabs } from "@/components/content-review-block-tabs";
import { ContentReviewOverviewTable } from "@/components/content-review-overview-table";
import { formatContentMonthLabel } from "@/lib/content-month";
import {
  contentReviewDecisionLabels,
  type ContentReviewBlockView,
  type ContentReviewView,
} from "@/lib/content-reviews";
import type { ContentReviewDecision } from "@/lib/types";

type DecisionState = Record<string, { decision: ContentReviewDecision; comment: string }>;

function clientInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function ReviewBlock({
  block,
  index,
  interactive,
  response,
  onDecisionChange,
  onCommentChange,
}: {
  block: ContentReviewBlockView;
  index: number;
  interactive: boolean;
  response: { decision: ContentReviewDecision; comment: string };
  onDecisionChange?: (blockId: string, decision: ContentReviewDecision) => void;
  onCommentChange?: (blockId: string, comment: string) => void;
}) {
  return (
    <article id={`bloco-${block.id}`} className="overflow-hidden rounded-[26px] border border-[var(--bb-border)] bg-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--bb-border)] px-5 py-4 md:px-6">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--bb-muted)]">Bloco {String(index + 1).padStart(2, "0")}</div>
          <h2 className="mt-1 text-xl font-extrabold text-[var(--bb-charcoal)]">{block.title}</h2>
        </div>
        <span className="rounded-full bg-[var(--bb-primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--bb-charcoal)]">
          {block.items.length} {block.items.length === 1 ? "conteúdo" : "conteúdos"}
        </span>
      </div>

      <div className="grid gap-5 p-5 md:p-6">
        <ContentReviewBlockTabs block={block} />

        <section className="rounded-[20px] border border-[rgba(83,183,223,0.34)] bg-[var(--bb-primary-soft)] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
            <MessageSquareText className="size-4" aria-hidden="true" />
            Aprovação deste bloco
          </div>
          {interactive ? (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onDecisionChange?.(block.id, "approved")}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition ${response.decision === "approved" ? "border-[#5f9d72] bg-[#2f7650] text-white" : "border-[var(--bb-border)] bg-white text-[var(--bb-charcoal)] hover:border-[#5f9d72]"}`}
                >
                  <Check className="size-4" aria-hidden="true" />
                  Aprovar bloco
                </button>
                <button
                  type="button"
                  onClick={() => onDecisionChange?.(block.id, "changes_requested")}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition ${response.decision === "changes_requested" ? "border-[#b55b4c] bg-[#9f493c] text-white" : "border-[var(--bb-border)] bg-white text-[var(--bb-charcoal)] hover:border-[#b55b4c]"}`}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Necessita de alterações
                </button>
              </div>
              <label className="grid gap-2 text-xs font-extrabold text-[var(--bb-charcoal)]">
                Comentário {response.decision === "changes_requested" ? "obrigatório" : "opcional"}
                <textarea
                  value={response.comment}
                  onChange={(event) => onCommentChange?.(block.id, event.currentTarget.value)}
                  rows={4}
                  placeholder="Indique aqui os ajustes ou observações para este bloco."
                  className="min-h-24 resize-y rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 py-3 text-sm font-semibold leading-6 text-[var(--bb-charcoal)] outline-none focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                />
              </label>
            </div>
          ) : block.decision !== "pending" || block.client_comment ? (
            <div className="mt-3 grid gap-2">
              <div className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${block.decision === "approved" ? "bg-[#e7f3e9] text-[#2f7650]" : block.decision === "changes_requested" ? "bg-[var(--bb-red-soft)] text-[#9f493c]" : "bg-white text-[var(--bb-muted)]"}`}>
                {contentReviewDecisionLabels[block.decision]}
              </div>
              {block.client_comment ? <p className="whitespace-pre-wrap rounded-2xl bg-white/85 px-3.5 py-3 text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{block.client_comment}</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[var(--bb-muted)]">Na página enviada, o cliente poderá aprovar ou pedir alterações e deixar um comentário neste bloco.</p>
          )}
        </section>
      </div>
    </article>
  );
}

export function ContentReviewPresentation({
  review,
  interactive = false,
  responses = {},
  onDecisionChange,
  onCommentChange,
}: {
  review: ContentReviewView;
  interactive?: boolean;
  responses?: DecisionState;
  onDecisionChange?: (blockId: string, decision: ContentReviewDecision) => void;
  onCommentChange?: (blockId: string, comment: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <header className="overflow-hidden rounded-[28px] border border-[var(--bb-border)] bg-[var(--bb-black)] text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-7">
          <BrandLogo variant="wordmark" className="h-12 w-40 rounded-xl" imageClassName="p-2" priority />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/55">Planeamento de conteúdos</div>
              <div className="mt-1 text-sm font-extrabold">{formatContentMonthLabel(review.month)} · v{review.version}</div>
            </div>
            <ClientLogo
              logoPath={review.client_logo_url}
              fallback={clientInitials(review.client_name)}
              className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white text-sm font-extrabold text-[var(--bb-charcoal)]"
              imageClassName="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.05] px-5 py-6 md:px-7">
          <h1 className="max-w-3xl text-2xl font-extrabold leading-tight md:text-3xl">Revisão do planeamento de {formatContentMonthLabel(review.month)}</h1>
          {review.introduction ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/72">{review.introduction}</p> : null}
          {review.approval_deadline ? <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.1em] text-white/58">Responder até {formatDate(review.approval_deadline)}</p> : null}
        </div>
      </header>

      <ContentReviewOverviewTable month={review.month} blocks={review.blocks} />

      <div className="grid gap-5">
        {review.blocks.map((block, index) => (
          <ReviewBlock
            key={block.id}
            block={block}
            index={index}
            interactive={interactive}
            response={responses[block.id] ?? { decision: block.decision, comment: block.client_comment ?? "" }}
            onDecisionChange={onDecisionChange}
            onCommentChange={onCommentChange}
          />
        ))}
      </div>
    </div>
  );
}
