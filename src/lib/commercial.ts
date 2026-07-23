import {
  commercialOpportunitySources,
  commercialOpportunityStatuses,
  commercialQuoteStatuses,
  commercialServicePriceStatuses,
  type CommercialOpportunitySource,
  type CommercialOpportunityStatus,
  type CommercialQuoteItem,
  type CommercialQuoteStatus,
  type CommercialServicePriceStatus,
} from "./types.ts";

export const commercialServiceCategories = [
  "Redes sociais",
  "Conteúdo",
  "Performance",
  "SEO",
  "Web",
  "Branding",
  "Email marketing",
  "Influência",
  "Design",
  "Estratégia",
  "Automação",
  "Eventos",
  "Outro",
] as const;

export const commercialOpportunitySourceLabels: Record<CommercialOpportunitySource, string> = {
  direct: "Direto",
  referral: "Recomendação",
  invest2030: "Invest2030",
  partner: "Outro parceiro",
  other: "Outro",
};

export const commercialOpportunityStatusLabels: Record<CommercialOpportunityStatus, string> = {
  qualification: "Qualificação",
  quoting: "Em orçamento",
  negotiation: "Negociação",
  won: "Ganha",
  lost: "Perdida",
};

export const commercialQuoteStatusLabels: Record<CommercialQuoteStatus, string> = {
  draft: "Rascunho",
  ready: "Pronto a enviar",
  sent: "Enviado",
  accepted: "Aceite",
  rejected: "Recusado",
  expired: "Expirado",
};

export const commercialServicePriceStatusLabels: Record<CommercialServicePriceStatus, string> = {
  draft: "Rascunho",
  approved: "Aprovado",
  archived: "Arquivado",
};

export function isCommercialOpportunitySource(value: string): value is CommercialOpportunitySource {
  return commercialOpportunitySources.includes(value as CommercialOpportunitySource);
}

export function isCommercialOpportunityStatus(value: string): value is CommercialOpportunityStatus {
  return commercialOpportunityStatuses.includes(value as CommercialOpportunityStatus);
}

export function isCommercialQuoteStatus(value: string): value is CommercialQuoteStatus {
  return commercialQuoteStatuses.includes(value as CommercialQuoteStatus);
}

export function isCommercialServicePriceStatus(value: string): value is CommercialServicePriceStatus {
  return commercialServicePriceStatuses.includes(value as CommercialServicePriceStatus);
}

export function formatCommercialMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function commercialQuoteItemTotal(item: Pick<CommercialQuoteItem, "quantity" | "unit_price">) {
  return Number(item.quantity) * Number(item.unit_price);
}

export function commercialQuoteTotal(items: Array<Pick<CommercialQuoteItem, "quantity" | "unit_price">>) {
  return items.reduce((total, item) => total + commercialQuoteItemTotal(item), 0);
}

export function commercialStatusTone(status: string) {
  if (["won", "accepted", "approved"].includes(status)) return "bg-[#e7f3e9] text-[#2f7650]";
  if (["lost", "rejected", "expired", "archived"].includes(status)) return "bg-[var(--bb-red-soft)] text-[#9f493c]";
  if (["quoting", "ready", "sent"].includes(status)) return "bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]";
  return "bg-[#efefe9] text-[var(--bb-muted)]";
}
