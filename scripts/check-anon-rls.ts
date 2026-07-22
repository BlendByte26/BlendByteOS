import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadEnv(".env.local");
loadEnv(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing public Supabase config.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function loadEnv(path: string) {
  let content = "";
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function countRows(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    count: count ?? 0,
    error: error?.code ?? null,
  };
}

async function main() {
  const privateReviewTables = [
    "content_review_rounds",
    "content_review_blocks",
    "content_review_block_items",
    "content_review_assets",
    "content_review_asset_items",
  ];
  const tables = [
    "clients",
    "content_items",
    "content_comments",
    "tasks",
    "team_members",
    "company_contacts",
    "quick_todos",
    "quick_notes",
    "user_profiles",
    ...privateReviewTables,
  ];

  const results = await Promise.all(tables.map(countRows));
  console.table(results);

  const exposedReviewTable = results.find(
    (result) => privateReviewTables.includes(result.table) && result.count > 0,
  );
  if (exposedReviewTable) {
    throw new Error(`Anonymous access unexpectedly reached ${exposedReviewTable.table}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown RLS check error");
  process.exit(1);
});
