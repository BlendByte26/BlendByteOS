import { createHash } from "node:crypto";
import {
  CONTENT_REVIEW_ASSETS_BUCKET,
  contentReviewDecisionSummary,
  isValidContentReviewToken,
  type ContentReviewBlockView,
  type ContentReviewSummary,
  type ContentReviewView,
} from "./content-reviews";
import { getSupabase, getSupabaseAdmin, isSupabaseSchemaError } from "./supabase";
import type {
  ContentReviewAsset,
  ContentReviewAssetItem,
  ContentReviewBlock,
  ContentReviewBlockItem,
  ContentReviewRound,
} from "./types";

type ReviewSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabase>>> | NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function loadReviewRelations(client: ReviewSupabaseClient, round: ContentReviewRound): Promise<ContentReviewView | null> {
  const { data: blocksData, error: blocksError } = await client
    .from("content_review_blocks")
    .select("*")
    .eq("round_id", round.id)
    .order("position");
  if (blocksError) return null;
  const blocks = (blocksData ?? []) as ContentReviewBlock[];
  const blockIds = blocks.map((block) => block.id);
  if (!blockIds.length) return { ...round, blocks: [] };

  const [{ data: itemsData, error: itemsError }, { data: assetsData, error: assetsError }] = await Promise.all([
    client.from("content_review_block_items").select("*").in("block_id", blockIds).order("position"),
    client.from("content_review_assets").select("*").in("block_id", blockIds).order("position"),
  ]);
  if (itemsError || assetsError) return null;
  const items = (itemsData ?? []) as ContentReviewBlockItem[];
  const assets = (assetsData ?? []) as ContentReviewAsset[];
  const assetIds = assets.map((asset) => asset.id);
  const { data: linksData, error: linksError } = assetIds.length
    ? await client.from("content_review_asset_items").select("*").in("asset_id", assetIds)
    : { data: [] as ContentReviewAssetItem[], error: null };
  if (linksError) return null;
  const links = (linksData ?? []) as ContentReviewAssetItem[];

  const signedUrls = new Map<string, string>();
  await Promise.all(assets.map(async (asset) => {
    const { data, error } = await client.storage
      .from(CONTENT_REVIEW_ASSETS_BUCKET)
      .createSignedUrl(asset.storage_path, 15 * 60);
    if (!error && data?.signedUrl) signedUrls.set(asset.id, data.signedUrl);
  }));

  const blockViews: ContentReviewBlockView[] = blocks.map((block) => ({
    ...block,
    items: items.filter((item) => item.block_id === block.id),
    assets: assets
      .filter((asset) => asset.block_id === block.id)
      .map((asset) => ({
        ...asset,
        url: signedUrls.get(asset.id) ?? "",
        applies_to_item_ids: links
          .filter((link) => link.asset_id === asset.id)
          .map((link) => link.block_item_id),
      })),
  }));

  return { ...round, blocks: blockViews };
}

export async function getContentReviewSummaries(): Promise<ContentReviewSummary[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data: roundsData, error: roundsError } = await supabase
    .from("content_review_rounds")
    .select("*")
    .order("published_at", { ascending: false });
  if (roundsError) {
    if (isSupabaseSchemaError(roundsError)) return [];
    console.error("Erro ao carregar aprovações", { code: roundsError.code });
    return [];
  }
  const rounds = (roundsData ?? []) as ContentReviewRound[];
  if (!rounds.length) return [];
  const { data: blocksData, error: blocksError } = await supabase
    .from("content_review_blocks")
    .select("round_id, decision")
    .in("round_id", rounds.map((round) => round.id));
  if (blocksError) return [];

  return rounds.map((round) => {
    const blocks = (blocksData ?? []).filter((block) => block.round_id === round.id);
    const summary = contentReviewDecisionSummary(blocks);
    return {
      ...round,
      block_count: blocks.length,
      approved_count: summary.approved,
      changes_count: summary.changes,
    };
  });
}

export async function getContentReview(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("content_review_rounds")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return loadReviewRelations(supabase, data as ContentReviewRound);
}

export async function getPublicContentReview(token: string) {
  if (!isValidContentReviewToken(token)) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("content_review_rounds")
    .select("*")
    .eq("access_token_hash", tokenHash(token))
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return loadReviewRelations(admin, data as ContentReviewRound);
}
