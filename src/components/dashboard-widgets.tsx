"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui";

type DashboardPanelListProps = {
  id: string;
  title: string;
  emptyTitle: string;
  total: number;
  href: string;
  collapsedLimit?: number;
  expandedLimit?: number;
  children: React.ReactNode[];
};

function SmallLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-7 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-2.5 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
    >
      {children}
    </Link>
  );
}

function CompactEmpty({ title }: { title: string }) {
  return (
    <div className="mt-2 rounded-[14px] border border-dashed border-[var(--bb-border)] bg-white/38 px-3 py-2 text-sm font-bold text-[var(--bb-muted)]">
      {title}
    </div>
  );
}

export function DashboardPanelList({
  id,
  title,
  emptyTitle,
  total,
  href,
  collapsedLimit = 3,
  expandedLimit = 8,
  children,
}: DashboardPanelListProps) {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => children.filter(Boolean), [children]);
  const visibleLimit = expanded ? expandedLimit : collapsedLimit;
  const visibleItems = items.slice(0, visibleLimit);
  const canExpand = items.length > collapsedLimit;

  return (
    <div id={id} className="scroll-mt-5">
      <Panel className="p-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {total > collapsedLimit ? <SmallLink href={href}>Ver todos</SmallLink> : null}
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex min-h-7 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-2.5 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
            >
              {expanded ? "Mostrar menos" : "Mostrar mais"}
            </button>
          ) : null}
        </div>
      </div>
      {visibleItems.length ? <div className="mt-2.5 grid gap-1.5">{visibleItems}</div> : <CompactEmpty title={emptyTitle} />}
      </Panel>
    </div>
  );
}

export function DashboardSectionNav({
  sections,
}: {
  sections: Array<{ id: string; label: string }>;
}) {
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-3 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/55 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold text-[var(--bb-muted)] transition hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
