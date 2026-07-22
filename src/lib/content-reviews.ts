import { contentItemsForPlanningPeriod } from "./content-planning-export";
import type {
  Client,
  ContentItem,
  ContentReviewAsset,
  ContentReviewBlock,
  ContentReviewBlockItem,
  ContentReviewRound,
} from "./types";

export const CONTENT_REVIEW_ASSETS_BUCKET = "content-review-assets";
export const CONTENT_REVIEW_ASSET_MAX_BYTES = 8 * 1024 * 1024;
export const CONTENT_REVIEW_TOTAL_MAX_BYTES = 28 * 1024 * 1024;
export const contentReviewAssetMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export type ContentReviewBuilderAsset = {
  key: string;
  appliesToContentIds: string[];
};

export type ContentReviewBuilderBlock = {
  key: string;
  title: string;
  contentIds: string[];
  assets: ContentReviewBuilderAsset[];
};

export type ContentReviewBuilderPayload = {
  clientId: string;
  month: string;
  recipientName: string | null;
  recipientEmail: string | null;
  approvalDeadline: string | null;
  introduction: string | null;
  blocks: ContentReviewBuilderBlock[];
};

export type ContentReviewAssetView = ContentReviewAsset & {
  url: string;
  applies_to_item_ids: string[];
};

export type ContentReviewBlockView = ContentReviewBlock & {
  items: ContentReviewBlockItem[];
  assets: ContentReviewAssetView[];
};

export type ContentReviewView = ContentReviewRound & {
  blocks: ContentReviewBlockView[];
};

export type ContentReviewSummary = ContentReviewRound & {
  block_count: number;
  approved_count: number;
  changes_count: number;
};

export const contentReviewStatusLabels: Record<ContentReviewRound["status"], string> = {
  draft: "Rascunho",
  open: "A aguardar cliente",
  submitted: "Resposta recebida",
  approved: "Aprovada",
  changes_requested: "Alterações pedidas",
  superseded: "Substituída",
  revoked: "Revogada",
};

export const contentReviewDecisionLabels: Record<ContentReviewBlock["decision"], string> = {
  pending: "Por validar",
  approved: "Aprovado",
  changes_requested: "Necessita de alterações",
};

export function isContentReviewAssetMimeType(value: string): value is (typeof contentReviewAssetMimeTypes)[number] {
  return contentReviewAssetMimeTypes.includes(value as (typeof contentReviewAssetMimeTypes)[number]);
}

export function contentReviewSourceItems(items: ContentItem[], clientId: string, month: string) {
  return contentItemsForPlanningPeriod(items, clientId, month).filter(
    (item) => item.status !== "published" && item.status !== "archived",
  );
}

export function defaultContentReviewIntroduction(client: Pick<Client, "name">, monthLabel: string) {
  return `Partilhamos o planeamento de conteúdos da ${client.name} para ${monthLabel}. Comece pela tabela-resumo do planeamento e valide depois cada bloco de conteúdos.`;
}

export function contentReviewDecisionSummary(blocks: Array<Pick<ContentReviewBlock, "decision">>) {
  const approved = blocks.filter((block) => block.decision === "approved").length;
  const changes = blocks.filter((block) => block.decision === "changes_requested").length;
  return {
    approved,
    changes,
    pending: blocks.length - approved - changes,
  };
}

export function contentReviewPublicPath(token: string) {
  return `/validar-conteudos/${encodeURIComponent(token)}`;
}

export function isValidContentReviewToken(token: string | null | undefined) {
  return Boolean(token && /^[a-f0-9]{64}$/i.test(token));
}
