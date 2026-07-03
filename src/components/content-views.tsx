"use client";

import Link from "next/link";
import { Pencil, TriangleAlert } from "lucide-react";
import { ClientBadge } from "@/components/client-badge";
import { ContentStatusControl } from "@/components/content-status-control";
import { Badge, EmptyState } from "@/components/ui";
import { getClientVisualToken } from "@/lib/client-visuals";
import { contentStatusLabels } from "@/lib/labels";
import { cleanPrefixedTitle } from "@/lib/title-display";
import { contentStatuses, type ContentItem, type ContentStatus } from "@/lib/types";

type ContentStatusAction = (id: string, formData: FormData) => void | Promise<void>;

type ContentViewProps = {
  items: ContentItem[];
  canPersist: boolean;
  updateStatusAction: ContentStatusAction;
};

const attentionStatuses: ContentStatus[] = ["todo", "in_progress", "ready_to_publish"];

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function sortByPublishDate(a: ContentItem, b: ContentItem) {
  const left = a.publish_date ?? `${a.month ?? "9999-12"}-31`;
  const right = b.publish_date ?? `${b.month ?? "9999-12"}-31`;
  return left.localeCompare(right) || a.title.localeCompare(b.title);
}

function attentionFields(item: ContentItem) {
  const missing: string[] = [];

  if (!item.title?.trim()) missing.push("título");
  if (!item.client_id) missing.push("cliente");
  if (!item.platform?.trim()) missing.push("plataforma");
  if (!item.format?.trim()) missing.push("formato");
  if (!item.status) missing.push("estado");
  if (!item.assignee_name?.trim()) missing.push("owner");

  if (attentionStatuses.includes(item.status)) {
    if (!item.creative_brief?.trim() && !item.brief_url?.trim()) missing.push("briefing");
    if (!item.copy_text?.trim()) missing.push("copy");
  }

  return missing;
}

function attentionLabel(item: ContentItem, missing: string[]) {
  if (missing.length) return missing.slice(0, 3).join(", ");
  if (item.blocker_reason?.trim()) return item.blocker_reason;
  if (item.is_blocked) return "atenção";
  return null;
}

function ContentMiniCard({
  item,
  canPersist,
  updateStatusAction,
}: {
  item: ContentItem;
  canPersist: boolean;
  updateStatusAction: ContentStatusAction;
}) {
  const clientToken = getClientVisualToken({
    clientCode: item.clients?.client_code,
    clientName: item.clients?.name,
    shortName: item.clients?.short_name,
  });
  const missing = attentionFields(item);
  const attention = item.is_blocked || missing.length ? attentionLabel(item, missing) : null;
  const date = formatDate(item.publish_date);

  return (
    <article
      className={`min-w-0 rounded-lg border border-l-4 border-[var(--bb-border)] bg-white/68 px-3 py-3 ${clientToken.borderStrong}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {item.clients ? (
          <ClientBadge
            clientId={item.clients.id}
            clientCode={item.clients.client_code}
            clientName={item.clients.name}
            shortName={item.clients.short_name}
            variant="compact"
          />
        ) : (
          <span className="text-xs font-bold text-[var(--bb-muted)]">Sem cliente</span>
        )}
        <div className="min-w-0 flex-1" />
        {attention ? (
          <span
            title={`Precisa de atenção: ${attention}`}
            className="inline-flex min-h-6 max-w-[118px] shrink-0 items-center gap-1 rounded-full bg-[var(--bb-yellow-soft)] px-2 text-[11px] font-extrabold text-[var(--bb-charcoal)] ring-1 ring-[rgba(236,254,84,0.48)]"
          >
            <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{attention}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <Badge value={item.status} label={contentStatusLabels[item.status]} />
      </div>

      <h3 className="bb-line-clamp-2 mt-1.5 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
        {cleanPrefixedTitle(item.title, item.clients)}
      </h3>

      <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-1 text-[11px] font-bold leading-4 text-[var(--bb-muted)]">
        <span>{item.platform || "Sem plataforma"}</span>
        <span>·</span>
        <span>{item.format || "Sem formato"}</span>
        {item.assignee_name ? (
          <>
            <span>·</span>
            <span>{item.assignee_name}</span>
          </>
        ) : null}
        {date ? (
          <>
            <span>·</span>
            <span>{date}</span>
          </>
        ) : item.month ? (
          <>
            <span>·</span>
            <span>{item.month}</span>
          </>
        ) : null}
      </div>

      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <ContentStatusControl
          itemId={item.id}
          status={item.status}
          canPersist={canPersist}
          updateStatusAction={updateStatusAction}
        />
        <Link
          href={`/content/${item.id}/edit`}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </Link>
      </div>
    </article>
  );
}

export function ContentPipelineView({ items, canPersist, updateStatusAction }: ContentViewProps) {
  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-gutter:stable]">
      <div className="grid min-w-[1680px] grid-cols-6 gap-3 px-1">
        {contentStatuses.map((status) => {
          const statusItems = items.filter((item) => item.status === status).sort(sortByPublishDate);

          return (
            <section
              key={status}
              className="min-w-0 rounded-lg border border-[var(--bb-border)] bg-white/48 p-3 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
                  {contentStatusLabels[status]}
                </h2>
                <span className="rounded-full bg-white/78 px-2 py-0.5 text-xs font-extrabold text-[var(--bb-muted)] ring-1 ring-[var(--bb-border)]">
                  {statusItems.length}
                </span>
              </div>
              {statusItems.length ? (
                <div className="grid gap-2">
                  {statusItems.map((item) => (
                    <ContentMiniCard
                      key={item.id}
                      item={item}
                      canPersist={canPersist}
                      updateStatusAction={updateStatusAction}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title={`Sem conteúdos em ${contentStatusLabels[status]}.`} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
