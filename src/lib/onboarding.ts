import type { Client, Task } from "./types";

export type ChecklistItem = {
  label: string;
  completed?: boolean;
};

export const baseChecklist = [
  "Criar pasta Drive/OneDrive",
  "Criar ficheiro/projeto Figma",
  "Guardar proposta",
  "Guardar contrato/adjudicação",
  "Recolher brand assets",
  "Definir responsável interno",
  "Confirmar plataformas/canais",
  "Definir processo de aprovação",
  "Criar primeiro plano de conteúdos, se aplicável",
  "Criar primeiras tarefas",
];

export const defaultSetupTasks = [
  "Setup operacional do cliente",
  "Criar estrutura Drive/Figma",
  "Recolher materiais da marca",
  "Validar processo de aprovação",
  "Preparar plano inicial",
  "Criar primeira tarefa de design",
  "Criar primeira tarefa de publicação",
  "Criar primeira tarefa de reporting",
];

function servicesFrom(value?: string | string[] | null) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function getChecklistLabels(services?: string | string[] | null) {
  void services;
  return baseChecklist;
}

export function getSuggestedSetupTasks(services?: string | string[] | null) {
  const selectedServices = servicesFrom(services);
  const serviceTasks = selectedServices.includes("Gestão de Redes Sociais")
    ? ["Criar primeira tarefa de publicação", "Criar primeira tarefa de reporting"]
    : [];

  return Array.from(new Set([...defaultSetupTasks, ...serviceTasks]));
}

export function getClientMissingSetup(client: Client) {
  const missing: string[] = [];

  if (!client.owner_name) missing.push("responsável interno");
  if (!client.service_types?.length && !client.service_type) missing.push("serviço contratado");
  if (!client.start_date) missing.push("data de início");
  if (!client.platforms?.length) missing.push("canais/plataformas");
  if (!client.drive_url) missing.push("Drive de materiais");
  if (!client.figma_url) missing.push("Figma");
  if (!client.proposal_url) missing.push("proposta");
  if (!client.contract_url && !client.adjudication_url) missing.push("contrato/adjudicação");
  if (!client.brand_assets_url) missing.push("brand assets");
  if (!client.final_deliverables_url) missing.push("entregáveis aprovados");

  return missing;
}

export function getClientChecklist(client: Client, tasks: Task[], contentCount: number) {
  if (client.setup_checklist?.length) {
    return client.setup_checklist.map((item): ChecklistItem => ({
      label: item.label,
      completed: item.done,
    }));
  }

  void tasks;
  void contentCount;
  return [];
}

export function getDerivedClientChecklist(client: Client, tasks: Task[], contentCount: number) {
  return getChecklistLabels(client.service_types?.length ? client.service_types : client.service_type).map((label): ChecklistItem => {
    const completed =
      (label === "Criar pasta Drive/OneDrive" && Boolean(client.drive_url)) ||
      (label === "Criar ficheiro/projeto Figma" && Boolean(client.figma_url)) ||
      (label === "Guardar proposta" && Boolean(client.proposal_url)) ||
      (label === "Guardar contrato/adjudicação" && Boolean(client.contract_url || client.adjudication_url)) ||
      (label === "Recolher brand assets" && Boolean(client.brand_assets_url)) ||
      (label === "Definir responsável interno" && Boolean(client.owner_name)) ||
      (label === "Confirmar plataformas/canais" && Boolean(client.platforms?.length)) ||
      (label === "Definir processo de aprovação" && Boolean(client.notes?.toLowerCase().includes("aprovação"))) ||
      (label === "Criar primeiras tarefas" && tasks.length > 0) ||
      (label === "Criar primeiro plano de conteúdos, se aplicável" && contentCount > 0) ||
      tasks.some((task) => task.title.toLowerCase().includes(label.toLowerCase()));

    return { label, completed };
  });
}
