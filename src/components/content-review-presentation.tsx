import { Check, ImageIcon, MessageSquareText, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ContentReviewOverviewTable } from "@/components/content-review-overview-table";
import { displayContentPlatform } from "@/lib/content-platform";
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

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

function AssetScope({ block, itemIds }: { block: ContentReviewBlockView; itemIds: string[] }) {
  const labels = block.items
    .filter((item) => itemIds.includes(item.id))
    .map((item) => displayContentPlatform(item.platform));
  if (!labels.length || labels.length === block.items.length) return <span>Todos os conteúdos do bloco</span>;
  return <span>{Array.from(new Set(labels)).join(" · ")}</span>;
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
        {block.assets.length ? (
          <div className={`grid gap-3 ${block.assets.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {block.assets.map((asset) => (
              <figure key={asset.id} className="overflow-hidden rounded-[20px] border border-[var(--bb-border)] bg-[#f4f4f1]">
                <div className="grid min-h-52 place-items-center bg-[linear-gradient(45deg,#f3f3f0_25%,transparent_25%),linear-gradient(-45deg,#f3f3f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f3f0_75%),linear-gradient(-45deg,transparent_75%,#f3f3f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
                  {asset.url ? (
                    // Signed and local object URLs are deliberately rendered without Next image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={`Visual de ${block.title}`} className="max-h-[560px] w-full object-contain" />
                  ) : (
                    <ImageIcon className="size-10 text-[var(--bb-muted)]" aria-hidden="true" />
                  )}
                </div>
                <figcaption className="flex items-center gap-2 border-t border-[var(--bb-border)] bg-white/85 px-3 py-2 text-xs font-bold text-[var(--bb-muted)]">
                  <ImageIcon className="size-3.5" aria-hidden="true" />
                  <AssetScope block={block} itemIds={asset.applies_to_item_ids} />
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--bb-border)] bg-white/45 px-4 py-5 text-center text-sm font-bold text-[var(--bb-muted)]">
            Este bloco é apresentado sem visual.
          </div>
        )}

        <div className="grid gap-3">
          {block.items.map((item) => (
            <section key={item.id} className="rounded-[20px] border border-[var(--bb-border)] bg-white/65 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--bb-black)] px-2.5 py-1 text-[11px] font-extrabold text-white">
                    {displayContentPlatform(item.platform)}
                  </span>
                  {item.format ? <span className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--bb-charcoal)]">{item.format}</span> : null}
                </div>
                <span className="text-xs font-bold text-[var(--bb-muted)]">
                  {formatDate(item.publish_date)}{formatTime(item.publish_time) ? ` · ${formatTime(item.publish_time)}` : ""}
                </span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-[var(--bb-charcoal)]">{item.title}</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl bg-[#f7f7f4] p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">Texto do criativo</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{item.copy_text?.trim() || "Sem texto do criativo."}</div>
                </div>
                <div className="rounded-2xl bg-[#f7f7f4] p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">Legenda</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{item.description?.trim() || "Sem legenda."}</div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-[20px] border border-[rgba(83,183,223,0.34)] bg-[var(--bb-primary-soft)] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
            <MessageSquareText className="size-4" aria-hidden="true" />
            Validação deste bloco
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
            <div className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white text-sm font-extrabold text-[var(--bb-charcoal)]">
              {review.client_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.client_logo_url} alt={`Logótipo de ${review.client_name}`} className="h-full w-full object-contain p-1" />
              ) : clientInitials(review.client_name)}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.05] px-5 py-6 md:px-7">
          <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--bb-primary)]">{review.client_name}</div>
          <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight md:text-3xl">Revisão do planeamento de {formatContentMonthLabel(review.month)}</h1>
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
