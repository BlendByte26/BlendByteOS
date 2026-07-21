import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Panel } from "@/components/ui";
import {
  addCalendarDays,
  dashboardDateState,
  dashboardDates,
  filterDashboardItems,
  sortDashboardItems,
  type DashboardFocus,
  type DashboardItem,
  type DashboardScope,
} from "@/lib/dashboard";

function dashboardHref({
  scope,
  focus,
  showAll,
  weekDay,
  hash,
}: {
  scope: DashboardScope;
  focus?: DashboardFocus | null;
  showAll?: boolean;
  weekDay?: string | null;
  hash?: string;
}) {
  const params = new URLSearchParams();
  if (scope === "team") params.set("scope", "team");
  if (focus) params.set("focus", focus);
  if (showAll) params.set("show", "all");
  if (weekDay) params.set("weekDay", weekDay);
  const query = params.toString();
  return `/${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" })
    .format(new Date(`${value}T12:00:00.000Z`))
    .replace(" de ", " ");
}

function dateLabel(item: DashboardItem, now: Date) {
  if (!item.date) return { label: "Sem prazo", tone: "text-[var(--bb-muted)]" };
  const state = dashboardDateState(item.date, now);
  if (state.overdue) return { label: `Atraso · ${formatDate(item.date)}`, tone: "text-[#a73522]" };
  if (state.today) return { label: "Hoje", tone: "text-[#126b8f]" };
  if (state.tomorrow) return { label: "Amanhã", tone: "text-[#6f4aa8]" };
  return { label: formatDate(item.date), tone: "text-[var(--bb-muted)]" };
}

function SmallAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
    >
      {children}
    </Link>
  );
}

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm font-bold text-[var(--bb-muted)]">{children}</p>;
}

function ItemRow({ item, now, compact = false }: { item: DashboardItem; now: Date; compact?: boolean }) {
  const deadline = dateLabel(item, now);
  const client = item.client?.short_name ?? item.client?.client_code ?? item.client?.name ?? "Sem cliente";
  return (
    <Link
      href={item.href}
      className={`group grid min-w-0 gap-2 rounded-[14px] border border-transparent bg-white/55 px-3 transition hover:border-[rgba(83,183,223,0.36)] hover:bg-white/92 ${
        compact ? "py-2" : "py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
      }`}
    >
      <span className="w-fit rounded-full bg-[var(--bb-primary-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#126b8f]">
        {item.type}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-[var(--bb-charcoal)]">{item.title}</span>
        <span className="block truncate text-[11px] font-bold text-[var(--bb-muted)]">
          {client}{item.owner ? ` · ${item.owner}` : ""}
        </span>
      </span>
      {!compact ? (
        <span className={`flex items-center justify-between gap-2 text-xs font-extrabold sm:justify-end ${deadline.tone}`}>
          {deadline.label}
          <ArrowRight className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
        </span>
      ) : null}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  href,
  empty,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  empty: string;
  tone: "danger" | "blue" | "violet";
}) {
  const styles = {
    danger: "border-l-[var(--bb-red)]",
    blue: "border-l-[var(--bb-primary)]",
    violet: "border-l-[var(--bb-secondary)]",
  }[tone];
  return (
    <Link
      href={href}
      className={`group min-w-0 rounded-[18px] border border-l-4 border-[var(--bb-border)] bg-white/82 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.055)] transition hover:-translate-y-0.5 hover:bg-white ${styles}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-[var(--bb-muted)]">{label}</span>
        <ArrowRight className="size-3.5 text-[var(--bb-muted)] transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--bb-charcoal)]">{value}</div>
      {value === 0 ? <div className="mt-0.5 truncate text-[11px] font-bold text-[var(--bb-muted)]">{empty}</div> : null}
    </Link>
  );
}

function focusTitle(focus: DashboardFocus | null) {
  if (focus === "overdue") return "Prioridades · Em atraso";
  if (focus === "near") return "Prioridades · Hoje / amanhã";
  if (focus === "next7") return "Prioridades · Próximos 7 dias";
  return "Prioridades";
}

export function DashboardOverview({
  items,
  scope,
  focus,
  showAll,
  expandedWeekDay,
  now,
}: {
  items: DashboardItem[];
  scope: DashboardScope;
  focus: DashboardFocus | null;
  showAll: boolean;
  expandedWeekDay: string | null;
  now: Date;
}) {
  const sorted = sortDashboardItems(items, now);
  const dates = dashboardDates(now);
  const overdue = items.filter((item) => dashboardDateState(item.date, now).overdue);
  const near = items.filter((item) => dashboardDateState(item.date, now).near);
  const next7 = items.filter((item) => dashboardDateState(item.date, now).next7);
  const focusedItems = filterDashboardItems(sorted, focus, now);
  const visiblePriorities = showAll ? focusedItems : focusedItems.slice(0, 8);
  const weekItems = sorted.filter((item) => dashboardDateState(item.date, now).thisWeek);
  const weekDays = Array.from({ length: 7 }, (_, index) => addCalendarDays(dates.weekStart, index))
    .map((day) => ({ day, items: weekItems.filter((item) => item.date === day) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <MetricCard
          label="Em atraso"
          value={overdue.length}
          href={dashboardHref({ scope, focus: "overdue", hash: "prioridades" })}
          empty="Sem trabalho em atraso."
          tone="danger"
        />
        <MetricCard
          label="Hoje / amanhã"
          value={near.length}
          href={dashboardHref({ scope, focus: "near", hash: "prioridades" })}
          empty="Nada previsto para hoje ou amanhã."
          tone="blue"
        />
        <MetricCard
          label="Próximos 7 dias"
          value={next7.length}
          href={dashboardHref({ scope, focus: "next7", hash: "prioridades" })}
          empty="Sem prazos nos próximos 7 dias."
          tone="violet"
        />
      </div>

      <Panel className="mt-3 p-3.5" >
        <div id="prioridades" className="flex scroll-mt-5 items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">{focusTitle(focus)}</h2>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {focus ? <SmallAction href={dashboardHref({ scope, hash: "prioridades" })}>Limpar</SmallAction> : null}
            {focusedItems.length > 8 && !showAll ? (
              <SmallAction href={dashboardHref({ scope, focus, showAll: true, hash: "prioridades" })}>Ver tudo</SmallAction>
            ) : null}
          </div>
        </div>
        {visiblePriorities.length ? (
          <div className="mt-2.5 grid gap-1">
            {visiblePriorities.map((item) => <ItemRow key={item.key} item={item} now={now} />)}
          </div>
        ) : (
          <CompactEmpty>
            {focus === "overdue"
              ? "Sem trabalho em atraso."
              : focus === "near"
                ? "Nada previsto para hoje ou amanhã."
                : "Sem prioridades ativas neste âmbito."}
          </CompactEmpty>
        )}
      </Panel>

      <Panel className="mt-3 p-3.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#126b8f]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">Esta semana</h2>
        </div>
        {weekDays.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {weekDays.map(({ day, items: dayItems }) => {
              const isExpanded = expandedWeekDay === day;
              const visible = isExpanded ? dayItems : dayItems.slice(0, 3);
              const dayDate = new Date(`${day}T12:00:00.000Z`);
              const dayName = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(dayDate);
              return (
                <section key={day} className="min-w-0 rounded-[16px] border border-[var(--bb-border)] bg-white/42 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold capitalize text-[var(--bb-charcoal)]">
                      {day === dates.today ? "Hoje" : dayName} <span className="text-[var(--bb-muted)]">· {formatDate(day)}</span>
                    </h3>
                    {dayItems.length > 3 ? (
                      <Link
                        href={dashboardHref({ scope, weekDay: isExpanded ? null : day, hash: "semana" })}
                        className="text-[11px] font-extrabold text-[#126b8f] hover:underline"
                      >
                        {isExpanded ? "Menos" : `Ver mais (${dayItems.length - 3})`}
                      </Link>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    {visible.map((item) => <ItemRow key={item.key} item={item} now={now} compact />)}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <CompactEmpty>Sem trabalho agendado para esta semana.</CompactEmpty>
        )}
        <span id="semana" className="scroll-mt-5" />
      </Panel>
    </>
  );
}
