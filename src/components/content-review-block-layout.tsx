import { ImageIcon } from "lucide-react";
import { displayContentPlatform } from "@/lib/content-platform";
import type { ContentReviewBlockView } from "@/lib/content-reviews";

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

function DescriptionPanel({ block }: { block: ContentReviewBlockView }) {
  return (
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
          <div className="mt-3 rounded-2xl bg-[#f7f7f4] p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">Descrição</div>
            <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{item.description?.trim() || "Sem descrição."}</div>
          </div>
        </section>
      ))}
    </div>
  );
}

function VisualPanel({ block }: { block: ContentReviewBlockView }) {
  const multiple = block.assets.length > 1;

  return (
    <div className={`grid gap-3 ${multiple ? "auto-cols-[85%] snap-x snap-mandatory grid-flow-col overflow-x-auto pb-1 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible sm:pb-0" : ""}`}>
      {block.assets.map((asset) => (
        <figure key={asset.id} className={`overflow-hidden rounded-[20px] border border-[var(--bb-border)] bg-[#f4f4f1] ${multiple ? "snap-start" : ""}`}>
          <div className="flex h-[240px] items-center justify-center bg-[linear-gradient(45deg,#f3f3f0_25%,transparent_25%),linear-gradient(-45deg,#f3f3f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f3f0_75%),linear-gradient(-45deg,transparent_75%,#f3f3f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] sm:h-[280px]">
            {asset.url ? (
              // Signed and local object URLs are deliberately rendered without Next image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={`Visual de ${block.title}`}
                className="block h-auto w-auto max-h-full max-w-full object-contain"
              />
            ) : (
              <ImageIcon className="size-10 text-[var(--bb-muted)]" aria-hidden="true" />
            )}
          </div>
        </figure>
      ))}
    </div>
  );
}

export function ContentReviewBlockLayout({ block }: { block: ContentReviewBlockView }) {
  if (!block.assets.length) return <DescriptionPanel block={block} />;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <VisualPanel block={block} />
      <DescriptionPanel block={block} />
    </div>
  );
}
