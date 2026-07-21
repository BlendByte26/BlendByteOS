import type {
  ClientStatus,
  ClientType,
  ContentStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./types";

export const clientTypeLabels: Record<ClientType, string> = {
  internal: "Interno",
  external: "Externo",
  grupo_investe: "Grupo Investe",
  partner: "Parceiro",
};

export const clientStatusLabels: Record<ClientStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  pending: "Pendente",
  in_progress: "Em Design",
  ready_to_publish: "Pronto para Agendar/Publicar",
  published: "Agendado/Publicado",
  archived: "Arquivado",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em curso",
  done: "Feito",
  archived: "Arquivado",
};

export const taskTypeLabels: Record<TaskType, string> = {
  design: "Design",
  copy: "Copy",
  publishing: "Publicação",
  reporting: "Relatórios",
  operations: "Operações",
  other: "Outro",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Normal",
  normal: "Normal",
  urgent: "Urgente",
};

export const statusTone: Record<string, string> = {
  pending: "bg-[rgba(0,0,0,0.05)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  in_progress: "bg-[var(--bb-secondary-soft)] text-[var(--bb-black)] ring-[rgba(140,101,199,0.24)]",
  review: "bg-[var(--bb-secondary-soft)] text-[var(--bb-black)] ring-[rgba(140,101,199,0.24)]",
  approved: "bg-[var(--bb-yellow-soft)] text-[var(--bb-black)] ring-[rgba(236,254,84,0.5)]",
  ready_to_publish: "bg-[var(--bb-yellow-soft)] text-[var(--bb-black)] ring-[rgba(236,254,84,0.5)]",
  published: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  delivered: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  archived: "bg-[rgba(0,0,0,0.06)] text-[var(--bb-muted)] ring-[rgba(0,0,0,0.08)]",
  blocked: "bg-[var(--bb-red-soft)] text-[#8f2415] ring-[rgba(232,76,49,0.24)]",
  active: "bg-[var(--bb-primary-soft)] text-[var(--bb-black)] ring-[rgba(83,183,223,0.28)]",
  inactive: "bg-[rgba(0,0,0,0.06)] text-[var(--bb-muted)] ring-[rgba(0,0,0,0.08)]",
  done: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  urgent: "bg-[var(--bb-red-soft)] text-[#8f2415] ring-[rgba(232,76,49,0.24)]",
  normal: "bg-[rgba(0,0,0,0.05)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  low: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.06)]",
};
