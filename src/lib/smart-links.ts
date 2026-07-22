import type { ContentStatus, TaskPriority, TaskStatus } from "@/lib/types";

export type ContentStatusSlug = "pending" | "design" | "ready" | "scheduled" | "archived";
type LegacyContentStatusSlug = "idea" | "production";
export type TaskStatusSlug = "pending" | "doing" | "done" | "archived";

const contentStatusBySlug: Record<ContentStatusSlug | LegacyContentStatusSlug, ContentStatus> = {
  pending: "pending",
  idea: "pending",
  production: "pending",
  design: "in_progress",
  ready: "ready_to_publish",
  scheduled: "published",
  archived: "archived",
};

const contentSlugByStatus: Record<ContentStatus, ContentStatusSlug> = {
  pending: "pending",
  in_progress: "design",
  ready_to_publish: "ready",
  published: "scheduled",
  archived: "archived",
};

function isContentStatusSlug(value: string): value is ContentStatusSlug | LegacyContentStatusSlug {
  return value in contentStatusBySlug;
}

function isContentStatus(value: string): value is ContentStatus {
  return value in contentSlugByStatus;
}

const taskStatusBySlug: Record<TaskStatusSlug, TaskStatus> = {
  pending: "pending",
  doing: "in_progress",
  done: "done",
  archived: "archived",
};

const taskSlugByStatus: Record<TaskStatus, TaskStatusSlug> = {
  pending: "pending",
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
  if (isContentStatusSlug(value)) return contentStatusBySlug[value];
  if (value === "todo") return "pending";
  if (isContentStatus(value)) return value;
  return "";
}

export function parseContentStatusParams(value: string | string[] | null | undefined): ContentStatus[] {
  const values = Array.isArray(value) ? value : [value];
  const statuses = values
    .map((item) => parseContentStatusParam(item))
    .filter(Boolean) as ContentStatus[];

  return Array.from(new Set(statuses));
}

export function parseTaskStatusParam(value: string | null | undefined): TaskStatus | "" {
  if (!value) return "";
  if (value in taskStatusBySlug) return taskStatusBySlug[value as TaskStatusSlug];
  if (Object.values(taskStatusBySlug).includes(value as TaskStatus)) return value as TaskStatus;
  return "";
}

export function parseTaskStatusParams(value: string | string[] | null | undefined): TaskStatus[] {
  const values = Array.isArray(value) ? value : [value];
  const statuses = values
    .map((item) => parseTaskStatusParam(item))
    .filter(Boolean) as TaskStatus[];

  return Array.from(new Set(statuses));
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
    status && isContentStatusSlug(status)
      ? contentStatusToSlug(contentStatusBySlug[status])
      : status && isContentStatus(status)
        ? contentStatusToSlug(status)
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
  view?: "all" | "today" | "week" | "next7" | "archived";
  client?: string | null;
  status?: TaskStatus | TaskStatusSlug | null;
  priority?: TaskPriority | null;
  owner?: string | null;
  until?: string | null;
} = {}) {
  const statusValue =
    status && Object.values(taskStatusBySlug).includes(status as TaskStatus)
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
