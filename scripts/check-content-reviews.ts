import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actionSource = readFileSync(new URL("../src/lib/content-review-actions.ts", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/content-reviews.ts", import.meta.url), "utf8");
const builderSource = readFileSync(new URL("../src/components/content-review-builder.tsx", import.meta.url), "utf8");
const publicSource = readFileSync(new URL("../src/components/content-review-public-form.tsx", import.meta.url), "utf8");

assert.match(helperSource, /item\.status !== "published" && item\.status !== "archived"/);
assert.match(helperSource, /\^\[a-f0-9\]\{64\}\$/);
assert.match(builderSource, /Agrupar seleção/);
assert.match(builderSource, /Este bloco é intencionalmente apresentado sem visual/);
assert.match(publicSource, /Valide todos os blocos antes de enviar a resposta/);
assert.match(publicSource, /decision === "changes_requested" && !decision\.comment/);
assert.match(actionSource, /requireRole\(\["admin", "marketing"\]\)/);
assert.match(actionSource, /title: `Revisão: \$\{block\.title\}`/);
assert.match(actionSource, /status: "in_progress"/);
assert.match(actionSource, /rotateContentReviewLinkAction/);
assert.doesNotMatch(actionSource, /type: "design"/);

const migrationSource = readFileSync(new URL("../supabase/migrations/20260722114718_add_content_review_rounds.sql", import.meta.url), "utf8");
assert.match(migrationSource, /revoke all on public\.content_review_rounds from anon/);
assert.match(migrationSource, /public\.current_user_profile_role\(\) in \('admin', 'marketing'\)/);
assert.match(migrationSource, /'content-review-assets',[\s\S]*false,/);
assert.doesNotMatch(migrationSource, /to anon/);

console.log("Content review flow checks passed.");
