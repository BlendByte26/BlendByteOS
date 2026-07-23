import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentLisbonContentMonth } from "../src/lib/content-month.ts";

const actionSource = readFileSync(new URL("../src/lib/content-review-actions.ts", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/content-reviews.ts", import.meta.url), "utf8");
const builderSource = readFileSync(new URL("../src/components/content-review-builder.tsx", import.meta.url), "utf8");
const blockTabsSource = readFileSync(new URL("../src/components/content-review-block-tabs.tsx", import.meta.url), "utf8");
const presentationSource = readFileSync(new URL("../src/components/content-review-presentation.tsx", import.meta.url), "utf8");
const publicSource = readFileSync(new URL("../src/components/content-review-public-form.tsx", import.meta.url), "utf8");
const approvalsPageSource = readFileSync(new URL("../src/app/approvals/page.tsx", import.meta.url), "utf8");
const reviewDataSource = readFileSync(new URL("../src/lib/content-review-data.ts", import.meta.url), "utf8");
const approvalDetailSource = readFileSync(new URL("../src/app/approvals/[id]/page.tsx", import.meta.url), "utf8");
const publicApprovalSource = readFileSync(new URL("../src/app/aprovar-conteudos/[token]/page.tsx", import.meta.url), "utf8");
const legacyPublicSource = readFileSync(new URL("../src/app/validar-conteudos/[token]/page.tsx", import.meta.url), "utf8");
const navSource = readFileSync(new URL("../src/components/top-nav.tsx", import.meta.url), "utf8");

assert.match(helperSource, /item\.status !== "published" && item\.status !== "archived"/);
assert.match(helperSource, /\^\[a-f0-9\]\{64\}\$/);
assert.match(builderSource, /Agrupar seleção/);
assert.match(builderSource, /Este bloco é intencionalmente apresentado sem visual/);
assert.match(builderSource, /Link criado e pronto a partilhar/);
assert.match(builderSource, /<SelectField/);
assert.match(builderSource, /<MonthPicker/);
assert.match(builderSource, /<DatePicker/);
assert.match(builderSource, /Email sugerido/);
assert.match(builderSource, /Copiar email/);
assert.match(builderSource, /max-h-\[calc\(100dvh-1\.5rem\)\] overflow-y-auto/);
assert.match(builderSource, /sticky top-0 z-30/);
assert.match(helperSource, /contentReviewEmailSuggestion/);
assert.match(blockTabsSource, /role="tablist"/);
assert.match(blockTabsSource, /Conteúdo/);
assert.match(blockTabsSource, />Descrição</);
assert.match(blockTabsSource, /Visual/);
assert.doesNotMatch(blockTabsSource, /Este bloco é apresentado sem visual/);
assert.doesNotMatch(presentationSource, /Este bloco é apresentado sem visual/);
assert.match(publicSource, /Indique a sua decisão em todos os blocos antes de enviar a resposta/);
assert.match(publicSource, /decision === "changes_requested" && !decision\.comment/);
assert.match(publicSource, /Concluir revisão/);
assert.match(publicSource, /Confirme os seus dados e envie as decisões tomadas nos blocos acima/);
assert.match(publicSource, /Nota geral para a BlendByte \(opcional\)/);
assert.match(publicSource, /reviewer-identity-error/);
assert.match(publicSource, /Enviar decisões/);
assert.doesNotMatch(publicSource, /Enviar aprovação/);
assert.match(navSource, /Tarefas[\s\S]*Aprovações/);
assert.match(navSource, /"\/approvals"[\s\S]*roles: \["admin", "marketing"\]/);
assert.match(approvalsPageSource, /<ContentReviewBuilder/);
assert.match(approvalsPageSource, /aria-label="Aprovações partilhadas"/);
assert.match(approvalsPageSource, /Filtrar aprovações por estado/);
assert.match(approvalsPageSource, /visibleReviews/);
assert.match(approvalsPageSource, /value: "changes_requested"/);
assert.match(approvalsPageSource, /value: "archived"/);
assert.match(approvalsPageSource, /archiveContentReviewAction/);
assert.doesNotMatch(approvalsPageSource, /<PageHeader/);
assert.match(approvalDetailSource, /href="\/approvals"/);
assert.match(publicApprovalSource, /Aprovação de conteúdos/);
assert.match(legacyPublicSource, /redirect\(`\/aprovar-conteudos/);
assert.match(helperSource, /return `\/aprovar-conteudos/);
assert.doesNotMatch(builderSource, /Validação do cliente/);
assert.doesNotMatch(publicSource, /Enviar validação/);
assert.match(actionSource, /requireRole\(\["admin", "marketing"\]\)/);
assert.match(actionSource, /title: `Revisão: \$\{block\.title\}`/);
assert.match(actionSource, /status: "in_progress"/);
assert.match(actionSource, /rotateContentReviewLinkAction/);
assert.match(actionSource, /archived_at: new Date\(\)\.toISOString\(\)/);
assert.match(reviewDataSource, /\.is\("archived_at", null\)/);
assert.doesNotMatch(actionSource, /type: "design"/);
assert.equal(currentLisbonContentMonth(new Date("2026-07-31T23:30:00Z")), "2026-08");
assert.equal(currentLisbonContentMonth(new Date("2026-12-31T23:30:00Z")), "2026-12");

const createActionSource = actionSource.slice(
  actionSource.indexOf("export async function createContentReviewAction"),
  actionSource.indexOf("function parseSubmission"),
);
assert.doesNotMatch(createActionSource, /revalidatePath\("\/content"\)/);
assert.match(createActionSource, /revalidatePath\("\/approvals"\)/);

const migrationSource = readFileSync(new URL("../supabase/migrations/20260722114718_add_content_review_rounds.sql", import.meta.url), "utf8");
assert.match(migrationSource, /revoke all on public\.content_review_rounds from anon/);
assert.match(migrationSource, /public\.current_user_profile_role\(\) in \('admin', 'marketing'\)/);
assert.match(migrationSource, /'content-review-assets',[\s\S]*false,/);
assert.doesNotMatch(migrationSource, /to anon/);

console.log("Content approval flow checks passed.");
