import { CalendarRange, ImageIcon } from "lucide-react";
import { displayContentPlatform } from "@/lib/content-platform";
import { formatContentMonthLabel } from "@/lib/content-month";
import type { ContentReviewBlockView } from "@/lib/content-reviews";

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : value;
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

export function ContentReviewOverviewTable({ month, blocks }: { month: string; blocks: ContentReviewBlockView[] }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-white/75 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--bb-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--bb-black)] text-white">
            <CalendarRange className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Resumo do planeamento</h2>
            <p className="text-sm font-semibold text-[var(--bb-muted)]">{formatContentMonthLabel(month)} · visão rápida antes da aprovação</p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--bb-primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--bb-charcoal)]">
          {blocks.length} {blocks.length === 1 ? "bloco" : "blocos"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--bb-border)] bg-[#f5f5f1] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">
              <th className="w-16 px-5 py-3">Bloco</th>
              <th className="px-4 py-3">Tema</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Canais e formatos</th>
              <th className="px-4 py-3 text-center">Peças</th>
              <th className="px-5 py-3 text-center">Visual</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, index) => {
              const dates = unique(block.items.map((item) => item.publish_date)).sort();
              const platforms = unique(block.items.map((item) => displayContentPlatform(item.platform)));
              const formats = unique(block.items.map((item) => item.format));

              return (
                <tr key={block.id} className="border-b border-[var(--bb-border)] last:border-b-0">
                  <td className="px-5 py-4 align-top">
                    <span className="grid size-8 place-items-center rounded-xl bg-[var(--bb-black)] text-xs font-extrabold text-white">{String(index + 1).padStart(2, "0")}</span>
                  </td>
                  <td className="max-w-sm px-4 py-4 align-top">
                    <a href={`#bloco-${block.id}`} className="font-extrabold text-[var(--bb-charcoal)] underline-offset-4 hover:underline">{block.title}</a>
                  </td>
                  <td className="px-4 py-4 align-top text-sm font-bold text-[var(--bb-muted)]">{dates.length ? dates.map(formatDate).join(" · ") : "A definir"}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map((platform) => <span key={platform} className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--bb-charcoal)]">{platform}</span>)}
                      {formats.map((format) => <span key={format} className="rounded-full border border-[var(--bb-border)] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[var(--bb-muted)]">{format}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center align-top text-sm font-extrabold text-[var(--bb-charcoal)]">{block.items.length}</td>
                  <td className="px-5 py-4 text-center align-top">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${block.assets.length ? "bg-[#e7f3e9] text-[#2f7650]" : "bg-[#f1f1ed] text-[var(--bb-muted)]"}`}>
                      <ImageIcon className="size-3" aria-hidden="true" />
                      {block.assets.length || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
