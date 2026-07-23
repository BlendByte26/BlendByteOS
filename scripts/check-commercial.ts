import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  commercialQuoteItemTotal,
  commercialQuoteTotal,
  isCommercialOpportunitySource,
  isCommercialOpportunityStatus,
  isCommercialQuoteStatus,
  isCommercialServicePriceStatus,
} from "../src/lib/commercial.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260723134336_add_commercial_workspace.sql", import.meta.url),
  "utf8",
);
const grantsMigration = readFileSync(
  new URL("../supabase/migrations/20260723135701_harden_commercial_grants.sql", import.meta.url),
  "utf8",
);
const nav = readFileSync(new URL("../src/components/top-nav.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../src/lib/commercial-actions.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/commercial/page.tsx", import.meta.url), "utf8");
const quotePage = readFileSync(
  new URL("../src/app/commercial/quotes/[id]/page.tsx", import.meta.url),
  "utf8",
);

assert.equal(commercialQuoteItemTotal({ quantity: 12, unit_price: 600 }), 7200);
assert.equal(
  commercialQuoteTotal([
    { quantity: 12, unit_price: 600 },
    { quantity: 1, unit_price: 900 },
  ]),
  8100,
);
assert.equal(isCommercialOpportunitySource("invest2030"), true);
assert.equal(isCommercialOpportunitySource("grant"), false);
assert.equal(isCommercialOpportunityStatus("won"), true);
assert.equal(isCommercialQuoteStatus("accepted"), true);
assert.equal(isCommercialServicePriceStatus("approved"), true);

for (const table of [
  "commercial_services",
  "commercial_opportunities",
  "commercial_quotes",
  "commercial_quote_items",
]) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`));
  assert.match(
    migration,
    new RegExp(`grant select, insert, update, delete on public\\.${table} to authenticated, service_role`),
  );
  assert.match(
    grantsMigration,
    new RegExp(`revoke all on public\\.${table} from anon, authenticated`),
  );
  assert.match(
    grantsMigration,
    new RegExp(`grant select, insert, update, delete on public\\.${table} to authenticated`),
  );
}

assert.match(migration, /public\.current_user_profile_key\(\) = 'guilherme'/);
assert.match(migration, /public\.current_user_profile_role\(\) = 'admin'/);
assert.doesNotMatch(migration, /current_user_profile_role\(\) in \('admin', 'marketing'\)/);
assert.match(migration, /\('SOC-BASE'/);
assert.match(migration, /\('WEB-INST'/);
assert.match(migration, /\('CONS-HOUR'/);
assert.match(migration, /price_status,\s*version_label/);

assert.match(nav, /href: "\/commercial"[\s\S]*roles: \["admin"\][\s\S]*profileKeys: \["guilherme"\]/);
assert.match(auth, /profile\?\.key === "guilherme" && profile\.authRole === "admin"/);
assert.match(actions, /await requireCommercialAccess\(\)/);
assert.match(actions, /assertNotAdminPreviewMode/);
assert.match(actions, /unitPrice < Number\(service\.minimum_price\) && !overrideReason/);
assert.match(actions, /status === "accepted"[\s\S]*status: "won"/);
assert.match(page, /await requireCommercialAccess\(\)/);
assert.match(quotePage, /await requireCommercialAccess\(\)/);

console.log("Commercial checks passed.");
