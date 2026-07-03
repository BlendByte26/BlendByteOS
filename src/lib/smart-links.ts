import type { ContentStatus, TaskPriority, TaskStatus } from "@/lib/types";

export type ContentStatusSlug = "idea" | "production" | "design" | "ready" | "scheduled" | "archived";
export type TaskStatusSlug = "todo" | "doing" | "done" | "archived" | "open";

const contentStatusBySlug: Record<ContentStatusSlug, ContentStatus> = {
  idea: "idea",
  production: "todo",
  design: "in_progress",
  ready: "ready_to_publish",
  scheduled: "published",
  archived: "archived",
};

const contentSlugByStatus: Record<ContentStatus, ContentStatusSlug> = {
  idea: "idea",
  todo: "production",
  in_progress: "design",
  ready_to_publish: "ready",
  published: "scheduled",
  archived: "archived",
};

const taskStatusBySlug: Record<Exclude<TaskStatusSlug, "open">, TaskStatus> = {
  todo: "todo",
  doing: "in_progress",
  done: "done",
  archived: "archived",
};

const taskSlugByStatus: Record<TaskStatus, Exclude<TaskStatusSlug, "open">> = {
  todo: "todo",
  in_progress: "doing",
  done: "done",
  archived: "archived",
};

function withQuery(pathname: string, entries: Array<[string, string | null | undefined]>) {
  const params = new URLSearchParams();

  entries.forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function contentStatusToSlug(status: ContentStatus) {
  return contentSlugByStatus[status];
}

export function taskStatusToSlug(status: TaskStatus) {
  return taskSlugByStatus[status];
}

export function parseContentStatusParam(value: string | null | undefined) {
  if (!value) return "";
  if (value in contentStatusBySlug) return contentStatusBySlug[value as ContentStatusSlug];
  if (Object.values(contentStatusBySlug).includes(value as ContentStatus)) return value as ContentStatus;
  return "";
}

export function parseTaskStatusParam(value: string | null | undefined): TaskStatus | "open" | "" {
  if (!value) return "";
  if (value === "open") return "open";
  if (value in taskStatusBySlug) return taskStatusBySlug[value as Exclude<TaskStatusSlug, "open">];
  if (Object.values(taskStatusBySlug).includes(value as TaskStatus)) return value as TaskStatus;
  return "";
}

export function parseTaskPriorityParam(value: string | null | undefined): TaskPriority | "" {
  if (value === "urgent" || value === "normal" || value === "low") return value;
  return "";
}

export function buildContentUrl({
  view = "table",
  client,
  status,
  attention,
  owner,
  platform,
  month,
  until,
}: {
  view?: "table" | "pipeline";
  client?: string | null;
  status?: ContentStatus | ContentStatusSlug | null;
  attention?: boolean;
  owner?: string | null;
  platform?: string | null;
  month?: string | null;
  until?: string | null;
} = {}) {
  const statusValue =
    status && Object.values(contentStatusBySlug).includes(status as ContentStatus)
      ? contentStatusToSlug(status as ContentStatus)
      : status;

  return withQuery("/content", [
    ["view", view],
    ["client", client],
    ["status", statusValue],
    ["attention", attention ? "true" : undefined],
    ["owner", owner],
    ["platform", platform],
    ["month", month],
    ["until", until],
  ]);
}

export function buildTasksUrl({
  view,
  client,
  status,
  priority,
  owner,
  until,
}: {
  view?: "all" | "today" | "week" | "archived";
  client?: string | null;
  status?: TaskStatus | TaskStatusSlug | null;
  priority?: TaskPriority | null;
  owner?: string | null;
  until?: string | null;
} = {}) {
  const statusValue =
    status && status !== "open" && Object.values(taskStatusBySlug).includes(status as TaskStatus)
      ? taskStatusToSlug(status as TaskStatus)
      : status;

  return withQuery("/tasks", [
    ["view", view && view !== "all" ? view : undefined],
    ["client", client],
    ["status", statusValue],
    ["priority", priority],
    ["owner", owner],
    ["until", until],
  ]);
}
