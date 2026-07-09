"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, TriangleAlert } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { ClientBadge } from "@/components/client-badge";
import { ContentStatusControl } from "@/components/content-status-control";
import { Badge, EmptyState } from "@/components/ui";
import { displayContentPlatform } from "@/lib/content-platform";
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
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const monthTitleFormatter = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });
const mobileDayFormatter = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const fullDayFormatter = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDayFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "short",
});

type CalendarSubView = "month" | "week" | "day";

type CalendarDay = {
  date: string;
  day: number;
  isToday: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function todayParts() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function todayMonth() {
  const today = todayParts();
  return `${today.year}-${pad2(today.month)}`;
}

function todayDate() {
  const today = todayParts();
  return `${today.year}-${pad2(today.month)}-${pad2(today.day)}`;
}

function isValidDate(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidMonth(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function resolveCalendarMonth(month: string | undefined) {
  return isValidMonth(month) ? month! : todayMonth();
}

function resolveCalendarSubView(value: string | null): CalendarSubView {
  if (value === "week" || value === "day") return value;
  return "month";
}

function resolveCalendarDate(value: string | null, month: string) {
  if (isValidDate(value)) return value!;
  const today = todayDate();
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}

function splitMonth(month: string) {
  return {
    year: Number(month.slice(0, 4)),
    month: Number(month.slice(5, 7)),
  };
}

function monthOffset(month: string, offset: number) {
  const parts = splitMonth(month);
  const date = new Date(parts.year, parts.month - 1 + offset, 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthTitle(month: string) {
  const parts = splitMonth(month);
  const label = monthTitleFormatter.format(new Date(parts.year, parts.month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function dateToIso(date: Date) {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return dateToIso(date);
}

function startOfWeek(value: string) {
  const date = parseDate(value);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return dateToIso(date);
}

function weekDaysFor(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { date, isToday: date === todayDate() };
  });
}

function calendarDays(month: string): Array<CalendarDay | null> {
  const parts = splitMonth(month);
  const daysInMonth = new Date(parts.year, parts.month, 0).getDate();
  const firstWeekday = (new Date(parts.year, parts.month - 1, 1).getDay() + 6) % 7;
  const cells: Array<CalendarDay | null> = Array.from({ length: firstWeekday }, () => null);
  const currentDate = todayDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = isoDate(parts.year, parts.month, day);
    cells.push({ date, day, isToday: date === currentDate });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

function formatPublishStamp(item: ContentItem) {
  const date = formatDate(item.publish_date);
  const time = formatTime(item.publish_time);
  if (!date) return time;
  return time ? `${date} · ${time}` : date;
}

function sortByPublishDate(a: ContentItem, b: ContentItem) {
  const left = a.publish_date ?? `${a.month ?? "9999-12"}-31`;
  const right = b.publish_date ?? `${b.month ?? "9999-12"}-31`;
  return left.localeCompare(right) || sortByPublishTime(a, b);
}

function sortByPublishTime(a: ContentItem, b: ContentItem) {
  const left = a.publish_time ?? "99:99:99";
  const right = b.publish_time ?? "99:99:99";
  return left.localeCompare(right) || a.title.localeCompare(b.title);
}

function contentTitle(item: ContentItem) {
  return cleanPrefixedTitle(item.title, item.clients);
}

function clientLabel(item: ContentItem) {
  return item.clients?.short_name || item.clients?.client_code || item.clients?.name || "Sem cliente";
}

function calendarHref({
  pathname,
  searchParams,
  subView,
  date,
  month,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  subView: CalendarSubView;
  date?: string;
  month?: string;
}) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set("view", "calendar");
  nextParams.set("calendarView", subView);
  if (date) {
    nextParams.set("date", date);
    nextParams.set("month", date.slice(0, 7));
  } else if (month) {
    nextParams.set("month", month);
    nextParams.delete("date");
  }
  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
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
    colorKey: item.clients?.color_key,
  });
  const missing = attentionFields(item);
  const attention = item.is_blocked || missing.length ? attentionLabel(item, missing) : null;
  const publishStamp = formatPublishStamp(item);

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
            colorKey={item.clients.color_key}
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
        <span>{displayContentPlatform(item.platform)}</span>
        <span>·</span>
        <span>{item.format || "Sem formato"}</span>
        {item.assignee_name ? (
          <>
            <span>·</span>
            <span>{item.assignee_name}</span>
          </>
        ) : null}
        {publishStamp ? (
          <>
            <span>·</span>
            <span>{publishStamp}</span>
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function MonthEvent({ item }: { item: ContentItem }) {
  const time = formatTime(item.publish_time);
  const clientToken = getClientVisualToken({
    clientCode: item.clients?.client_code,
    clientName: item.clients?.name,
    shortName: item.clients?.short_name,
    colorKey: item.clients?.color_key,
  });

  return (
    <Link
      href={`/content/${item.id}/edit`}
      title={`${time ? `${time} · ` : ""}${contentTitle(item)} · ${clientLabel(item)} · ${displayContentPlatform(item.platform)} · ${contentStatusLabels[item.status]}`}
      className={`block min-w-0 rounded-md border border-transparent px-1.5 py-1 text-left transition hover:border-current ${clientToken.bg} ${clientToken.text}`}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-extrabold leading-4">
        <span className={`size-1.5 shrink-0 rounded-full ${clientToken.dot}`} />
        {time ? <span className="shrink-0 tabular-nums">{time}</span> : null}
        <span className="truncate">{contentTitle(item)}</span>
      </div>
      <div className="truncate pl-3 text-[10px] font-bold leading-3 text-[var(--bb-muted)]">
        {clientLabel(item)} · {displayContentPlatform(item.platform)} · {contentStatusLabels[item.status]}
      </div>
    </Link>
  );
}

function AgendaItem({ item, compact = false }: { item: ContentItem; compact?: boolean }) {
  const time = formatTime(item.publish_time);
  const clientToken = getClientVisualToken({
    clientCode: item.clients?.client_code,
    clientName: item.clients?.name,
    shortName: item.clients?.short_name,
    colorKey: item.clients?.color_key,
  });

  return (
    <article className={`grid gap-2 rounded-lg border border-l-4 px-3 py-2.5 ${clientToken.bg} ${clientToken.border} ${clientToken.borderStrong}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-[3.25rem] text-xs font-extrabold tabular-nums text-[var(--bb-charcoal)]">
          {time ?? "Sem hora"}
        </span>
        <Link
          href={`/content/${item.id}/edit`}
          className="min-w-0 flex-1 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:underline"
        >
          <span className="bb-line-clamp-2">{contentTitle(item)}</span>
        </Link>
        <Badge value={item.status} label={contentStatusLabels[item.status]} />
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-[var(--bb-muted)]">
        <span>{clientLabel(item)}</span>
        <span>·</span>
        <span>{displayContentPlatform(item.platform)}</span>
        {!compact && item.assignee_name ? (
          <>
            <span>·</span>
            <span>{item.assignee_name}</span>
          </>
        ) : null}
        <Link href={`/content/${item.id}/edit`} className="ml-auto font-extrabold text-[var(--bb-charcoal)] hover:underline">
          Editar
        </Link>
      </div>
    </article>
  );
}

function UnscheduledItem({ item }: { item: ContentItem }) {
  const clientToken = getClientVisualToken({
    clientCode: item.clients?.client_code,
    clientName: item.clients?.name,
    shortName: item.clients?.short_name,
    colorKey: item.clients?.color_key,
  });

  return (
    <Link
      href={`/content/${item.id}/edit`}
      className={`block min-w-0 rounded-md border border-l-4 px-2.5 py-2 text-left transition hover:bg-white/82 ${clientToken.bg} ${clientToken.border} ${clientToken.borderStrong}`}
    >
      <div className="truncate text-xs font-extrabold text-[var(--bb-charcoal)]">{contentTitle(item)}</div>
      <div className="mt-0.5 truncate text-[11px] font-bold text-[var(--bb-muted)]">
        {clientLabel(item)} · {displayContentPlatform(item.platform)} · {contentStatusLabels[item.status]}
      </div>
    </Link>
  );
}

function MonthCalendar({
  days,
  itemsByDate,
}: {
  days: Array<CalendarDay | null>;
  itemsByDate: Map<string, ContentItem[]>;
}) {
  const filledDays = days.filter((day): day is CalendarDay => Boolean(day));
  const mobileDays = filledDays.filter((day) => (itemsByDate.get(day.date) ?? []).length > 0);

  return (
    <>
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-y border-l border-[var(--bb-border)] bg-white/48 text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">
          {weekDays.map((day) => (
            <div key={day} className="border-r border-[var(--bb-border)] px-2 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-[var(--bb-border)] bg-white/34">
          {days.map((day, index) => {
            const dayItems = day ? itemsByDate.get(day.date) ?? [] : [];

            return (
              <div
                key={day?.date ?? `empty-${index}`}
                className="min-h-[7.75rem] border-b border-r border-[var(--bb-border)] bg-white/38 p-1.5"
              >
                {day ? (
                  <>
                    <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
                      <span
                        className={`inline-grid size-6 place-items-center rounded-full text-xs font-extrabold ${
                          day.isToday
                            ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
                            : "text-[var(--bb-muted)]"
                        }`}
                      >
                        {day.day}
                      </span>
                      {dayItems.length ? (
                        <span className="text-[10px] font-extrabold text-[var(--bb-muted)]">{dayItems.length}</span>
                      ) : null}
                    </div>
                    <div className="grid gap-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <MonthEvent key={item.id} item={item} />
                      ))}
                      {dayItems.length > 3 ? (
                        <div className="px-1.5 text-[11px] font-extrabold text-[var(--bb-muted)]">
                          +{dayItems.length - 3} mais
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 md:hidden">
        {mobileDays.length ? (
          mobileDays.map((day) => {
            const dayItems = itemsByDate.get(day.date) ?? [];

            return (
              <section key={day.date} className="rounded-lg border border-[var(--bb-border)] bg-white/48 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">
                    {mobileDayFormatter.format(parseDate(day.date))}
                  </h3>
                  <span className="text-xs font-extrabold text-[var(--bb-muted)]">{dayItems.length}</span>
                </div>
                <div className="grid gap-0.5">
                  {dayItems.map((item) => (
                    <MonthEvent key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <EmptyState title="Sem conteúdos com data neste mês." />
        )}
      </div>
    </>
  );
}

function WeekCalendar({
  days,
  itemsByDate,
}: {
  days: Array<{ date: string; isToday: boolean }>;
  itemsByDate: Map<string, ContentItem[]>;
}) {
  return (
    <>
      <div className="hidden grid-cols-7 border-l border-t border-[var(--bb-border)] bg-white/34 md:grid">
        {days.map((day) => {
          const dayItems = itemsByDate.get(day.date) ?? [];

          return (
            <section key={day.date} className="min-h-[18rem] border-b border-r border-[var(--bb-border)] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">
                    {weekDays[new Date(parseDate(day.date)).getDay() === 0 ? 6 : new Date(parseDate(day.date)).getDay() - 1]}
                  </div>
                  <div className={`text-sm font-extrabold ${day.isToday ? "text-[var(--bb-black)]" : "text-[var(--bb-charcoal)]"}`}>
                    {shortDayFormatter.format(parseDate(day.date))}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[var(--bb-muted)]">{dayItems.length || ""}</span>
              </div>
              <div className="grid gap-1.5">
                {dayItems.length ? (
                  dayItems.map((item) => <AgendaItem key={item.id} item={item} compact />)
                ) : (
                  <div className="rounded-lg border border-dashed border-[var(--bb-border)] px-2 py-3 text-xs font-bold text-[var(--bb-muted)]">
                    Sem conteúdos
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-2 md:hidden">
        {days.map((day) => {
          const dayItems = itemsByDate.get(day.date) ?? [];

          return (
            <section key={day.date} className="rounded-lg border border-[var(--bb-border)] bg-white/48 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">
                  {mobileDayFormatter.format(parseDate(day.date))}
                </h3>
                <span className="text-xs font-extrabold text-[var(--bb-muted)]">{dayItems.length || ""}</span>
              </div>
              {dayItems.length ? (
                <div className="grid gap-1.5">
                  {dayItems.map((item) => <AgendaItem key={item.id} item={item} compact />)}
                </div>
              ) : (
                <div className="text-xs font-bold text-[var(--bb-muted)]">Sem conteúdos</div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function DayCalendar({ date, items }: { date: string; items: ContentItem[] }) {
  return items.length ? (
    <div className="grid gap-2">
      {items.map((item) => (
        <AgendaItem key={item.id} item={item} />
      ))}
    </div>
  ) : (
    <EmptyState title={`Sem conteúdos em ${formatDate(date)}.`} />
  );
}

function UnscheduledSection({ items }: { items: ContentItem[] }) {
  return (
    <section className="rounded-lg border border-[var(--bb-border)] bg-white/50 p-3 shadow-[0_10px_26px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Por agendar</h2>
        <span className="rounded-full bg-white/78 px-2 py-0.5 text-xs font-extrabold text-[var(--bb-muted)] ring-1 ring-[var(--bb-border)]">
          {items.length}
        </span>
      </div>
      {items.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <UnscheduledItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-xs font-bold text-[var(--bb-muted)]">Sem conteúdos por agendar.</div>
      )}
    </section>
  );
}

export function ContentCalendarView({ items, month }: { items: ContentItem[]; month: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subView = resolveCalendarSubView(searchParams.get("calendarView"));
  const visibleMonth = resolveCalendarMonth(month);
  const selectedDate = resolveCalendarDate(searchParams.get("date"), visibleMonth);
  const days = calendarDays(visibleMonth);
  const weekDaysList = weekDaysFor(selectedDate);
  const weekStart = weekDaysList[0].date;
  const weekEnd = weekDaysList[6].date;
  const scheduledItems = items.filter((item) => item.publish_date).sort(sortByPublishDate);
  const itemsForMonth = scheduledItems.filter((item) => item.publish_date?.startsWith(`${visibleMonth}-`));
  const unscheduledItems = items.filter((item) => !item.publish_date).sort(sortByPublishDate);
  const itemsByDate = new Map<string, ContentItem[]>();

  scheduledItems.forEach((item) => {
    if (!item.publish_date) return;
    const dateItems = itemsByDate.get(item.publish_date) ?? [];
    dateItems.push(item);
    itemsByDate.set(item.publish_date, dateItems.sort(sortByPublishTime));
  });

  const selectedDayItems = (itemsByDate.get(selectedDate) ?? []).sort(sortByPublishTime);
  const headerTitle =
    subView === "month"
      ? monthTitle(visibleMonth)
      : subView === "week"
        ? `${shortDayFormatter.format(parseDate(weekStart))} - ${shortDayFormatter.format(parseDate(weekEnd))}`
        : capitalize(fullDayFormatter.format(parseDate(selectedDate)));
  const headerCount =
    subView === "month"
      ? `${itemsForMonth.length} com data neste mês`
      : subView === "week"
        ? `${weekDaysList.reduce((count, day) => count + (itemsByDate.get(day.date)?.length ?? 0), 0)} nesta semana`
        : `${selectedDayItems.length} neste dia`;
  const previousHref =
    subView === "month"
      ? calendarHref({ pathname, searchParams, subView, month: monthOffset(visibleMonth, -1) })
      : calendarHref({
          pathname,
          searchParams,
          subView,
          date: addDays(selectedDate, subView === "week" ? -7 : -1),
        });
  const nextHref =
    subView === "month"
      ? calendarHref({ pathname, searchParams, subView, month: monthOffset(visibleMonth, 1) })
      : calendarHref({
          pathname,
          searchParams,
          subView,
          date: addDays(selectedDate, subView === "week" ? 7 : 1),
        });

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-[var(--bb-border)] bg-white/62 p-3 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">{headerTitle}</h2>
              <p className="text-xs font-bold text-[var(--bb-muted)]">{headerCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full border border-[var(--bb-border)] bg-white/55 p-1">
              {(["month", "week", "day"] as const).map((option) => (
                <Link
                  key={option}
                  href={calendarHref({
                    pathname,
                    searchParams,
                    subView: option,
                    date: option === "month" ? undefined : selectedDate,
                    month: option === "month" ? visibleMonth : undefined,
                  })}
                  className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold transition ${
                    subView === option
                      ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
                      : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
                  }`}
                >
                  {option === "month" ? "Mês" : option === "week" ? "Semana" : "Dia"}
                </Link>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Link
                href={previousHref}
                aria-label={subView === "month" ? "Mês anterior" : subView === "week" ? "Semana anterior" : "Dia anterior"}
                title={subView === "month" ? "Mês anterior" : subView === "week" ? "Semana anterior" : "Dia anterior"}
                className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={nextHref}
                aria-label={subView === "month" ? "Mês seguinte" : subView === "week" ? "Semana seguinte" : "Dia seguinte"}
                title={subView === "month" ? "Mês seguinte" : subView === "week" ? "Semana seguinte" : "Dia seguinte"}
                className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {subView === "month" ? <MonthCalendar days={days} itemsByDate={itemsByDate} /> : null}
        {subView === "week" ? <WeekCalendar days={weekDaysList} itemsByDate={itemsByDate} /> : null}
        {subView === "day" ? <DayCalendar date={selectedDate} items={selectedDayItems} /> : null}
      </section>

      <UnscheduledSection items={unscheduledItems} />
    </div>
  );
}
