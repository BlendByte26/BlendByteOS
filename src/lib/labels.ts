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
  setup: "Em setup",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  idea: "Ideia",
  todo: "A Fazer",
  in_progress: "Em Produção",
  ready_to_publish: "Pronto para Publicar",
  published: "Publicado",
  archived: "Arquivado",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "A Fazer",
  in_progress: "Em Produção",
  done: "Concluído",
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
  low: "Baixa",
  normal: "Normal",
  urgent: "Urgente",
};

export const statusTone: Record<string, string> = {
  idea: "bg-[var(--bb-primary-soft)] text-[var(--bb-black)] ring-[rgba(83,183,223,0.28)]",
  todo: "bg-[rgba(0,0,0,0.05)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  in_progress: "bg-[var(--bb-orange-soft)] text-[var(--bb-black)] ring-[rgba(254,112,35,0.26)]",
  review: "bg-[var(--bb-secondary-soft)] text-[var(--bb-black)] ring-[rgba(140,101,199,0.24)]",
  approved: "bg-[var(--bb-yellow-soft)] text-[var(--bb-black)] ring-[rgba(236,254,84,0.5)]",
  ready_to_publish: "bg-[var(--bb-primary-soft)] text-[var(--bb-black)] ring-[rgba(83,183,223,0.28)]",
  published: "bg-[var(--bb-black)] text-white ring-[var(--bb-black)]",
  delivered: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  archived: "bg-[rgba(0,0,0,0.06)] text-[var(--bb-muted)] ring-[rgba(0,0,0,0.08)]",
  blocked: "bg-[var(--bb-red-soft)] text-[#8f2415] ring-[rgba(232,76,49,0.24)]",
  setup: "bg-[var(--bb-yellow-soft)] text-[var(--bb-black)] ring-[rgba(236,254,84,0.5)]",
  active: "bg-[var(--bb-primary-soft)] text-[var(--bb-black)] ring-[rgba(83,183,223,0.28)]",
  paused: "bg-[var(--bb-orange-soft)] text-[var(--bb-black)] ring-[rgba(254,112,35,0.22)]",
  done: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  urgent: "bg-[var(--bb-red-soft)] text-[#8f2415] ring-[rgba(232,76,49,0.24)]",
  normal: "bg-[rgba(0,0,0,0.05)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.08)]",
  low: "bg-[var(--bb-gray-blue-soft)] text-[var(--bb-black)] ring-[rgba(0,0,0,0.06)]",
};
