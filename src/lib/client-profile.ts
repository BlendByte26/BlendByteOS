import type { Client, ClientStatus } from "./types";

export const clientPlatformOptions = [
  "Website",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Meta Business Suite",
  "Metricool",
  "CRM / Newsletter",
  "Outro",
] as const;

export type ClientLinkKey = Extract<keyof Client, `${string}_url`>;

export type ClientLinkField = {
  key: ClientLinkKey;
  label: string;
};

export type ClientLinkGroup = {
  id: "brand" | "work" | "publishing" | "channels" | "documents";
  title: string;
  description: string;
  fields: ClientLinkField[];
};

export const clientLinkGroups: ClientLinkGroup[] = [
  {
    id: "brand",
    title: "Marca",
    description: "Identidade e materiais oficiais da marca.",
    fields: [
      { key: "brand_guidelines_url", label: "Manual de normas" },
      { key: "brand_assets_url", label: "Brand assets" },
    ],
  },
  {
    id: "work",
    title: "Trabalho",
    description: "Pastas e ficheiros usados pela equipa BlendByte.",
    fields: [
      { key: "drive_url", label: "Drive de materiais" },
      { key: "figma_url", label: "Figma" },
      { key: "content_calendar_url", label: "Calendário de conteúdos" },
      { key: "final_deliverables_url", label: "Entregáveis aprovados" },
      { key: "reporting_url", label: "Reporting" },
      { key: "initial_briefing_url", label: "Briefing inicial" },
    ],
  },
  {
    id: "publishing",
    title: "Gestão e publicação",
    description: "Ferramentas para coordenar, agendar e publicar.",
    fields: [
      { key: "meta_url", label: "Meta Business Suite" },
      { key: "metricool_url", label: "Metricool" },
      { key: "linkedin_campaign_manager_url", label: "LinkedIn Campaign Manager" },
      { key: "crm_newsletter_url", label: "CRM / Newsletter" },
    ],
  },
  {
    id: "channels",
    title: "Canais",
    description: "Website e perfis públicos do cliente.",
    fields: [
      { key: "website_url", label: "Website" },
      { key: "instagram_url", label: "Instagram" },
      { key: "facebook_url", label: "Facebook" },
      { key: "linkedin_url", label: "LinkedIn" },
      { key: "tiktok_url", label: "TikTok" },
      { key: "youtube_url", label: "YouTube" },
      { key: "platform_other_url", label: "Outra plataforma" },
    ],
  },
  {
    id: "documents",
    title: "Documentos",
    description: "Documentos comerciais e condições do cliente.",
    fields: [
      { key: "proposal_url", label: "Proposta" },
      { key: "contract_url", label: "Contrato" },
      { key: "adjudication_url", label: "Adjudicação" },
      { key: "budget_url", label: "Orçamento" },
      { key: "conditions_url", label: "Condições" },
      { key: "other_documents_url", label: "Outros documentos" },
    ],
  },
];

export type ClientListTab = "internal" | "external" | "inactive";

export function isClientListTab(value: string | undefined): value is ClientListTab {
  return value === "internal" || value === "external" || value === "inactive";
}

export function getEffectiveClientStatus(client: { status: unknown }): ClientStatus {
  return client.status === "active" ? "active" : "inactive";
}

export function getClientListTab(
  client: Pick<Client, "type"> & { status: unknown },
): ClientListTab {
  if (getEffectiveClientStatus(client) === "inactive") return "inactive";
  return client.type === "internal" || client.type === "grupo_investe" ? "internal" : "external";
}

export function normalizeClientShortName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function buildClientCode(displayOrder: number, shortName: string) {
  return `${String(displayOrder).padStart(2, "0")}_${normalizeClientShortName(shortName)}`;
}

export function nextClientDisplayOrder(clients: Array<Pick<Client, "display_order">>) {
  const currentMaximum = clients.reduce(
    (maximum, client) => Math.max(maximum, client.display_order ?? 0),
    0,
  );

  return currentMaximum + 1;
}
