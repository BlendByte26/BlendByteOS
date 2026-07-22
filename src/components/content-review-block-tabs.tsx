"use client";

import { useId, useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { displayContentPlatform } from "@/lib/content-platform";
import type { ContentReviewBlockView } from "@/lib/content-reviews";

type BlockTab = "content" | "visual";

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

function ContentPanel({ block }: { block: ContentReviewBlockView }) {
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
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-[#f7f7f4] p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">Texto do criativo</div>
              <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{item.copy_text?.trim() || "Sem texto do criativo."}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f7f4] p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">Descrição</div>
              <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">{item.description?.trim() || "Sem descrição."}</div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function VisualPanel({ block }: { block: ContentReviewBlockView }) {
  return (
    <div className={`grid gap-3 ${block.assets.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {block.assets.map((asset) => (
        <figure key={asset.id} className="overflow-hidden rounded-[20px] border border-[var(--bb-border)] bg-[#f4f4f1]">
          <div className="grid min-h-52 place-items-center bg-[linear-gradient(45deg,#f3f3f0_25%,transparent_25%),linear-gradient(-45deg,#f3f3f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f3f0_75%),linear-gradient(-45deg,transparent_75%,#f3f3f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
            {asset.url ? (
              // Signed and local object URLs are deliberately rendered without Next image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={`Visual de ${block.title}`} className="max-h-[680px] w-full object-contain" />
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
  );
}

export function ContentReviewBlockTabs({ block }: { block: ContentReviewBlockView }) {
  const [activeTab, setActiveTab] = useState<BlockTab>("content");
  const baseId = useId();
  const hasVisual = block.assets.length > 0;

  if (!hasVisual) return <ContentPanel block={block} />;

  const contentTabId = `${baseId}-content-tab`;
  const contentPanelId = `${baseId}-content-panel`;
  const visualTabId = `${baseId}-visual-tab`;
  const visualPanelId = `${baseId}-visual-panel`;

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label={`Vistas do bloco ${block.title}`} className="flex w-fit gap-1 rounded-2xl border border-[var(--bb-border)] bg-[#f3f3ef] p-1">
        <button
          id={contentTabId}
          type="button"
          role="tab"
          aria-selected={activeTab === "content"}
          aria-controls={contentPanelId}
          onClick={() => setActiveTab("content")}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${activeTab === "content" ? "bg-[var(--bb-black)] text-white shadow-sm" : "text-[var(--bb-muted)] hover:bg-white hover:text-[var(--bb-charcoal)]"}`}
        >
          <FileText className="size-4" aria-hidden="true" />
          Conteúdo
        </button>
        <button
          id={visualTabId}
          type="button"
          role="tab"
          aria-selected={activeTab === "visual"}
          aria-controls={visualPanelId}
          onClick={() => setActiveTab("visual")}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${activeTab === "visual" ? "bg-[var(--bb-black)] text-white shadow-sm" : "text-[var(--bb-muted)] hover:bg-white hover:text-[var(--bb-charcoal)]"}`}
        >
          <ImageIcon className="size-4" aria-hidden="true" />
          Visual
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "visual" ? "bg-white/18 text-white" : "bg-white text-[var(--bb-muted)]"}`}>{block.assets.length}</span>
        </button>
      </div>

      <div
        id={activeTab === "content" ? contentPanelId : visualPanelId}
        role="tabpanel"
        aria-labelledby={activeTab === "content" ? contentTabId : visualTabId}
      >
        {activeTab === "content" ? <ContentPanel block={block} /> : <VisualPanel block={block} />}
      </div>
    </div>
  );
}
