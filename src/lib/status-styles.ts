import type { ContentStatus, TaskStatus } from "./types";

export type StatusTone =
  | "queued"
  | "active"
  | "design"
  | "ready"
  | "completed"
  | "archived";

export type StatusStyle = {
  pill: string;
  dot: string;
  subtleBackground: string;
  subtleBorder: string;
};

export const statusToneStyles: Record<StatusTone, StatusStyle> = {
  queued: {
    pill: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    subtleBackground: "bg-slate-50",
    subtleBorder: "border-slate-200",
  },
  active: {
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    subtleBackground: "bg-sky-50",
    subtleBorder: "border-sky-200",
  },
  design: {
    pill: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    subtleBackground: "bg-violet-50",
    subtleBorder: "border-violet-200",
  },
  ready: {
    pill: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    subtleBackground: "bg-amber-50",
    subtleBorder: "border-amber-200",
  },
  completed: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    subtleBackground: "bg-emerald-50",
    subtleBorder: "border-emerald-200",
  },
  archived: {
    pill: "border-zinc-200 bg-zinc-100 text-zinc-600",
    dot: "bg-zinc-400",
    subtleBackground: "bg-zinc-100",
    subtleBorder: "border-zinc-200",
  },
};

export const taskStatusTones: Record<TaskStatus, StatusTone> = {
  pending: "queued",
  in_progress: "active",
  done: "completed",
  archived: "archived",
};

export const contentStatusTones: Record<ContentStatus, StatusTone> = {
  pending: "queued",
  in_progress: "design",
  ready_to_publish: "ready",
  published: "completed",
  archived: "archived",
};

export function getStatusStyle(tone: StatusTone): StatusStyle {
  return statusToneStyles[tone];
}

export function getTaskStatusStyle(status: TaskStatus): StatusStyle {
  return getStatusStyle(taskStatusTones[status]);
}

export function getContentStatusStyle(status: ContentStatus): StatusStyle {
  return getStatusStyle(contentStatusTones[status]);
}
