import type { Client, ContentItem, Task } from "./types";

export const DASHBOARD_TIME_ZONE = "Europe/Lisbon";

const activeTaskStatuses = new Set<Task["status"]>(["pending", "in_progress"]);
const activeContentStatuses = new Set<ContentItem["status"]>([
  "pending",
  "in_progress",
  "ready_to_publish",
]);
const closedOperationalStates = new Set(["feito", "done", "concluido", "aprovado", "approved"]);

export type DashboardScope = "personal" | "team";
export type DashboardFocus = "overdue" | "near" | "next7";
export type DashboardItem = {
  key: string;
  type: "Tarefa" | "Conteúdo";
  title: string;
  client: Client | null;
  owner: string | null;
  date: string | null;
  href: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

// O modelo atual guarda responsáveis como texto, não como IDs. Para evitar
// falsos positivos, só aceitamos nomes canónicos completos separados pelos
// delimitadores já usados na app; texto livre como “Carolina Silva” não conta.
function assigneeTokens(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;/|]+/)
    .map(normalize)
    .filter(Boolean);
}

export function assigneeMatches(value: string | null | undefined, canonicalName: string) {
  const expected = normalize(canonicalName);
  return Boolean(expected && assigneeTokens(value).includes(expected));
}

export function assigneeMatchesAny(value: string | null | undefined, canonicalNames: Iterable<string>) {
  const allowed = new Set(Array.from(canonicalNames, normalize));
  return assigneeTokens(value).some((token) => allowed.has(token));
}

function dateParts(date: Date, timeZone = DASHBOARD_TIME_ZONE) {
  const values = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((value) => value.type === type)?.value ?? "";
  return { year: part("year"), month: part("month"), day: part("day") };
}

export function lisbonDate(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dashboardDates(now = new Date()) {
  const today = lisbonDate(now);
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const weekStart = addCalendarDays(today, -((weekday + 6) % 7));
  return {
    today,
    tomorrow: addCalendarDays(today, 1),
    nextSevenEnd: addCalendarDays(today, 6),
    weekStart,
    weekEnd: addCalendarDays(weekStart, 6),
  };
}

export function lisbonGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: DASHBOARD_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 20) return "Boa tarde";
  return "Boa noite";
}

function isClosedOperationalState(value: string | null | undefined) {
  return closedOperationalStates.has(normalize(value));
}

/**
 * Única fonte de verdade para a data operacional dos conteúdos no Painel.
 * Mantém a ordem da antiga agenda de Marketing e usa design_due_date apenas
 * como fallback final, sem inferir o tipo de trabalho pelo título ou owner.
 */
export function getContentOperationalDate(item: ContentItem) {
  if (item.status === "ready_to_publish") {
    return item.publishing_due_date ?? item.publish_date ?? item.approval_due_date ?? item.design_due_date;
  }
  if (item.needs_copy && !isClosedOperationalState(item.copy_status)) {
    return item.copy_due_date ?? item.publish_date ?? item.publishing_due_date ?? item.design_due_date;
  }
  if (item.needs_client_approval && !isClosedOperationalState(item.approval_status)) {
    return item.approval_due_date ?? item.publish_date ?? item.publishing_due_date ?? item.design_due_date;
  }
  return (
    item.publishing_due_date ??
    item.publish_date ??
    item.approval_due_date ??
    item.copy_due_date ??
    item.design_due_date
  );
}

export function isActiveTask(task: Task) {
  return activeTaskStatuses.has(task.status);
}

export function isActiveContent(item: ContentItem) {
  return activeContentStatuses.has(item.status);
}

export function buildDashboardItems({
  tasks,
  content,
  clients,
  scope,
  profileName,
  activeTeamNames,
}: {
  tasks: Task[];
  content: ContentItem[];
  clients: Client[];
  scope: DashboardScope;
  profileName: string;
  activeTeamNames: string[];
}) {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const ownerMatches = (owner: string | null) =>
    scope === "team" ? assigneeMatchesAny(owner, activeTeamNames) : assigneeMatches(owner, profileName);

  const taskItems: DashboardItem[] = tasks
    .filter((task) => isActiveTask(task) && ownerMatches(task.assignee_name))
    .map((task) => ({
      key: `task-${task.id}`,
      type: "Tarefa",
      title: task.title,
      client: task.client_id ? clientsById.get(task.client_id) ?? null : null,
      owner: task.assignee_name,
      date: task.due_date,
      href: `/tasks/${task.id}/edit`,
    }));

  const contentItems: DashboardItem[] = content
    .filter((item) => isActiveContent(item) && ownerMatches(item.assignee_name))
    .map((item) => ({
      key: `content-${item.id}`,
      type: "Conteúdo",
      title: item.title,
      client: clientsById.get(item.client_id) ?? null,
      owner: item.assignee_name,
      date: getContentOperationalDate(item),
      href: `/content/${item.id}/edit`,
    }));

  return [...taskItems, ...contentItems];
}

export function dashboardDateState(date: string | null, now = new Date()) {
  const dates = dashboardDates(now);
  return {
    overdue: Boolean(date && date < dates.today),
    today: date === dates.today,
    tomorrow: date === dates.tomorrow,
    near: Boolean(date && date >= dates.today && date <= dates.tomorrow),
    next7: Boolean(date && date >= dates.today && date <= dates.nextSevenEnd),
    thisWeek: Boolean(date && date >= dates.weekStart && date <= dates.weekEnd),
  };
}

export function sortDashboardItems(items: DashboardItem[], now = new Date()) {
  const dates = dashboardDates(now);
  const rank = (date: string | null) => {
    if (!date) return 5;
    if (date < dates.today) return 0;
    if (date === dates.today) return 1;
    if (date === dates.tomorrow) return 2;
    if (date <= dates.nextSevenEnd) return 3;
    return 4;
  };
  return [...items].sort((first, second) => {
    const rankDifference = rank(first.date) - rank(second.date);
    if (rankDifference) return rankDifference;
    if (first.date !== second.date) return (first.date ?? "").localeCompare(second.date ?? "");
    return first.title.localeCompare(second.title, "pt-PT");
  });
}

export function filterDashboardItems(items: DashboardItem[], focus: DashboardFocus | null, now = new Date()) {
  if (!focus) return items;
  return items.filter((item) => {
    const state = dashboardDateState(item.date, now);
    if (focus === "overdue") return state.overdue;
    if (focus === "near") return state.near;
    return state.next7;
  });
}
