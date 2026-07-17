import Link from "next/link";
import type { Client, ContentItem, Task, TeamMember } from "@/lib/types";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";

type DashboardView = "marketing" | "design";
type AgendaItem = {
  key: string;
  kind: "Tarefa" | "Design" | "Copy" | "Aprovação" | "Publicação";
  title: string;
  client: Client | null;
  owner: string | null;
  date: string | null;
  href: string;
  complete: boolean;
  urgent: boolean;
  blocked: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ownerMatches(value: string | null | undefined, owner: string) {
  if (owner === "all") return true;
  const source = normalize(value), target = normalize(owner);
  return Boolean(source && (source === target || source.includes(target) || target.includes(source)));
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function weekRange() {
  const today = new Date(), start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return { start: localDate(start), end: localDate(end) };
}

function isDesignTask(task: Task) {
  const text = normalize([task.title, task.type, task.notes, task.related_url].filter(Boolean).join(" "));
  return task.type === "design" || ["design", "criativo", "branding", "website", "landing", "figma", "apresentacao"].some((word) => text.includes(word));
}

function needsDesign(item: ContentItem) {
  const state = normalize(item.design_status);
  const openState = state && !["feito", "done", "concluido", "aprovado", "approved"].some((word) => state.includes(word));
  return Boolean((item.needs_design && ["pending", "in_progress"].includes(item.status)) || openState || item.figma_url);
}

function contentDeadline(item: ContentItem, view: DashboardView) {
  const closedStates = ["feito", "done", "concluido", "aprovado"];
  if (view === "design") return { date: item.design_due_date ?? item.approval_due_date ?? item.publish_date, kind: "Design" as const };
  if (item.status === "ready_to_publish") return { date: item.publishing_due_date ?? item.publish_date, kind: "Publicação" as const };
  if (item.needs_copy && !closedStates.includes(normalize(item.copy_status))) return { date: item.copy_due_date ?? item.publish_date, kind: "Copy" as const };
  if (item.needs_client_approval && !closedStates.includes(normalize(item.approval_status))) return { date: item.approval_due_date ?? item.publish_date, kind: "Aprovação" as const };
  return { date: item.publishing_due_date ?? item.publish_date ?? item.approval_due_date ?? item.copy_due_date, kind: "Publicação" as const };
}

function buildItems(view: DashboardView, owner: string, clients: Map<string, Client>, content: ContentItem[], tasks: Task[]) {
  const taskItems: AgendaItem[] = tasks.filter((task) => task.status !== "archived" && ownerMatches(task.assignee_name, owner) && (view === "marketing" || isDesignTask(task))).map((task) => ({
    key: `task-${task.id}`, kind: "Tarefa", title: getTaskDisplayTitle(task), client: task.client_id ? clients.get(task.client_id) ?? null : null,
    owner: task.assignee_name, date: task.due_date, href: `/tasks/${task.id}/edit`, complete: task.status === "done", urgent: task.priority === "urgent", blocked: task.is_blocked,
  }));
  const contentItems: AgendaItem[] = content.filter((item) => item.status !== "archived" && ownerMatches(item.assignee_name, owner) && (view === "marketing" || needsDesign(item) || item.status === "published")).map((item) => {
    const deadline = contentDeadline(item, view);
    return { key: `content-${item.id}`, kind: deadline.kind, title: cleanPrefixedTitle(item.title, item.clients ?? null), client: clients.get(item.client_id) ?? null,
      owner: item.assignee_name, date: deadline.date, href: `/content/${item.id}/edit`, complete: item.status === "published", urgent: false, blocked: item.is_blocked };
  });
  return [...taskItems, ...contentItems];
}

export function DashboardAgenda({ view, profileName, isAdmin, requestedOwner, clients, content, tasks, teamMembers }: {
  view: DashboardView; profileName: string; isAdmin: boolean; requestedOwner?: string; clients: Client[]; content: ContentItem[]; tasks: Task[]; teamMembers: TeamMember[];
}) {
  const owner = isAdmin && requestedOwner ? requestedOwner : profileName;
  const items = buildItems(view, owner, new Map(clients.map((client) => [client.id, client])), content, tasks);
  const today = localDate(new Date()), tomorrow = addDays(today, 1), week = weekRange();
  const dated = items.filter((item): item is AgendaItem & { date: string } => Boolean(item.date));
  const overdue = dated.filter((item) => !item.complete && item.date < today).sort((a, b) => a.date.localeCompare(b.date));
  const critical = dated.filter((item) => !item.complete && item.date >= today && (item.urgent || item.date <= tomorrow)).sort((a, b) => a.date.localeCompare(b.date));
  const weekly = dated.filter((item) => item.date >= week.start && item.date <= week.end).sort((a, b) => a.date.localeCompare(b.date));
  const noDeadline = items.filter((item) => !item.complete && !item.date).slice(0, 5);
  const readyToValidate: AgendaItem[] = view === "design" ? content
    .filter((item) => item.status === "ready_to_publish" && ownerMatches(item.assignee_name, owner) && (item.needs_design || item.design_status || item.figma_url))
    .map((item) => ({ key: `validation-${item.id}`, kind: "Design" as const, title: cleanPrefixedTitle(item.title, item.clients ?? null), client: clients.find((client) => client.id === item.client_id) ?? null,
      owner: item.assignee_name, date: item.approval_due_date ?? item.publish_date, href: `/content/${item.id}/edit`, complete: false, urgent: false, blocked: item.is_blocked }))
    .slice(0, 5) : [];
  return <div className="mt-3 grid gap-3">
    {isAdmin ? <OwnerSelector owner={owner} view={view} members={teamMembers} /> : null}
    <div className="grid gap-3 xl:grid-cols-2">
      <Section title="Em atraso"><ItemList items={overdue} today={today} empty="Sem trabalho em atraso." /></Section>
      <Section title="Urgentes ou a terminar"><ItemList items={critical} today={today} empty="Sem urgências nem prazos nas próximas 48 horas." /></Section>
    </div>
    <Section title="Esta semana"><Week items={weekly} today={today} start={week.start} /></Section>
    <Section title="Sem prazo"><ItemList items={noDeadline} today={today} empty="Sem trabalho ativo por calendarizar." /></Section>
    {view === "design" ? <Section title="Prontos para validar"><ItemList items={readyToValidate} today={today} empty="Sem conteúdos prontos para validar." /></Section> : null}
  </div>;
}

function OwnerSelector({ owner, view, members }: { owner: string; view: DashboardView; members: TeamMember[] }) {
  const names = Array.from(new Set(members.filter((member) => member.active).map((member) => member.name))).sort((a, b) => a.localeCompare(b, "pt"));
  return <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">Ver agenda</span>{["all", ...names].map((name) => {
    const query = new URLSearchParams(); if (view !== "marketing") query.set("view", view); query.set("owner", name);
    return <Link key={name} href={`/?${query}`} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${owner === name ? "bg-[var(--bb-primary)] text-[var(--bb-black)]" : "border border-[var(--bb-border)] bg-white/60 text-[var(--bb-muted)]"}`}>{name === "all" ? "Toda a equipa" : name}</Link>;
  })}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[18px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.05)]"><h2 className="mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>{children}</section>;
}

function ItemList({ items, today, empty }: { items: AgendaItem[]; today: string; empty: string }) {
  return items.length ? <div className="grid gap-1.5">{items.map((item) => <Row key={item.key} item={item} today={today} />)}</div> : <p className="rounded-[14px] border border-dashed border-[var(--bb-border)] px-3 py-4 text-center text-sm font-bold text-[var(--bb-muted)]">{empty}</p>;
}

function Week({ items, today, start }: { items: AgendaItem[]; today: string; start: string }) {
  const formatter = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit" });
  return <div className="grid gap-2">{Array.from({ length: 7 }, (_, index) => addDays(start, index)).map((day) => {
    const dayItems = items.filter((item) => item.date === day);
    return <div key={day} className={`rounded-[15px] border px-3 py-2.5 ${day === today ? "border-[rgba(83,183,223,0.48)] bg-[var(--bb-primary-soft)]" : day < today ? "border-[var(--bb-border)] bg-black/[0.025]" : "border-[var(--bb-border)] bg-white/52"}`}>
      <h3 className="mb-2 text-xs font-extrabold capitalize">{day === today ? "Hoje" : formatter.format(new Date(`${day}T12:00:00`))}</h3>
      {dayItems.length ? <div className="grid gap-1.5">{dayItems.map((item) => <Row key={item.key} item={item} today={today} compact />)}</div> : <p className="text-xs font-bold text-[var(--bb-muted)]">Sem itens.</p>}
    </div>;
  })}</div>;
}

function Row({ item, today, compact = false }: { item: AgendaItem; today: string; compact?: boolean }) {
  const daysLate = item.date && item.date < today && !item.complete ? Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${item.date}T12:00:00`).getTime()) / 86400000) : 0;
  return <Link href={item.href} className={`grid gap-2 rounded-[13px] border border-[var(--bb-border)] bg-white/72 px-3 py-2 transition hover:bg-white sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${item.complete ? "opacity-55" : ""}`}>
    <div className="flex flex-wrap gap-1.5"><span className="rounded-full bg-[var(--bb-primary-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase">{item.kind}</span>{item.urgent && !item.complete ? <span className="rounded-full bg-[var(--bb-yellow-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase">Urgente</span> : null}{item.blocked && !item.complete ? <span className="rounded-full bg-[var(--bb-red-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#8f2415]">Bloqueado</span> : null}{item.complete ? <span className="text-xs font-extrabold text-[var(--bb-muted)]">✓ Feito</span> : null}</div>
    <div className="min-w-0"><div className={`truncate text-sm font-extrabold ${item.complete ? "line-through" : ""}`}>{item.title}</div><div className="truncate text-xs font-bold text-[var(--bb-muted)]">{item.client?.short_name ?? item.client?.name ?? "Sem cliente"}{item.owner ? ` · ${item.owner}` : ""}</div></div>
    {!compact || daysLate ? <div className={`text-xs font-extrabold ${daysLate ? "text-[#8f2415]" : "text-[var(--bb-muted)]"}`}>{daysLate ? `${daysLate}d em atraso` : item.date?.slice(8, 10) + "/" + item.date?.slice(5, 7)}</div> : null}
  </Link>;
}
