"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ClientDetailItem = {
  label: string;
  value: string;
};

export function ClientDetailsSlider({ items }: { items: ClientDetailItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction * Math.max(240, track.clientWidth * 0.72),
      behavior: "smooth",
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--bb-border)] pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--bb-muted)]">
          Contrato e serviços
        </p>
        <div
          role="group"
          className="flex gap-2"
          aria-label="Navegação dos detalhes do cliente"
        >
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Ver detalhes anteriores"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.5)] hover:bg-[var(--bb-primary-soft)]"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Ver detalhes seguintes"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.5)] hover:bg-[var(--bb-primary-soft)]"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        role="region"
        aria-label="Detalhes do contrato e serviços"
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-[82%] flex-1 snap-start rounded-[16px] border border-[var(--bb-border)] bg-white/42 px-4 py-3 sm:min-w-[48%] xl:min-w-[32%]"
          >
            <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">
              {item.label}
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-[var(--bb-charcoal)]">
              {item.value || "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
