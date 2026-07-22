import assert from "node:assert/strict";
import {
  buildClientCode,
  clientLinkGroups,
  getEffectiveClientStatus,
  getClientListTab,
  isClientListTab,
  nextClientDisplayOrder,
  normalizeClientShortName,
} from "../src/lib/client-profile.ts";

assert.equal(normalizeClientShortName("Água & Luz"), "AGU");
assert.equal(normalizeClientShortName("  2030 Invest  "), "203");
assert.equal(buildClientCode(7, "água"), "07_AGU");
assert.equal(buildClientCode(103, "BlendByte"), "103_BLE");

assert.equal(nextClientDisplayOrder([]), 1);
assert.equal(
  nextClientDisplayOrder([{ display_order: 2 }, { display_order: null }, { display_order: 8 }]),
  9,
);

assert.equal(getClientListTab({ status: "active", type: "internal" }), "internal");
assert.equal(getClientListTab({ status: "active", type: "grupo_investe" }), "internal");
assert.equal(getClientListTab({ status: "active", type: "external" }), "external");
assert.equal(getClientListTab({ status: "active", type: "partner" }), "external");
assert.equal(getClientListTab({ status: "inactive", type: "internal" }), "inactive");
assert.equal(getClientListTab({ status: "inactive", type: "external" }), "inactive");
assert.equal(getClientListTab({ status: "paused", type: "external" }), "inactive");
assert.equal(getClientListTab({ status: "archived", type: "internal" }), "inactive");
assert.equal(getEffectiveClientStatus({ status: "active" }), "active");
assert.equal(getEffectiveClientStatus({ status: "setup" }), "inactive");

assert.equal(isClientListTab("internal"), true);
assert.equal(isClientListTab("inactive"), true);
assert.equal(isClientListTab("archived"), false);
assert.equal(isClientListTab(undefined), false);

const channelFields = clientLinkGroups
  .find((group) => group.id === "channels")
  ?.fields.map((field) => field.key);
assert.equal(channelFields?.includes("website_url"), false);

console.log("Client grouping, code and format checks passed.");
