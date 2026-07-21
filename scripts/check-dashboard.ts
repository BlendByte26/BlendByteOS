import assert from "node:assert/strict";
import {
  assigneeMatches,
  buildDashboardItems,
  dashboardDateState,
  dashboardDates,
  filterDashboardItems,
  getContentOperationalDate,
  lisbonDate,
  sortDashboardItems,
  type DashboardItem,
} from "../src/lib/dashboard.ts";
import { operationalProfiles } from "../src/lib/operational-profiles.ts";
import { sampleClients, sampleContent, sampleTasks } from "../src/lib/sample-data.ts";
import type { ContentItem } from "../src/lib/types.ts";

const now = new Date("2026-07-21T10:00:00.000Z");
assert.equal(lisbonDate(new Date("2026-07-20T23:30:00.000Z")), "2026-07-21");
assert.deepEqual(dashboardDates(now), {
  today: "2026-07-21",
  tomorrow: "2026-07-22",
  nextSevenEnd: "2026-07-27",
  weekStart: "2026-07-20",
  weekEnd: "2026-07-26",
});

assert.equal(assigneeMatches("Carolina", "Carolina"), true);
assert.equal(assigneeMatches("Sofia, Carolina", "Carolina"), true);
assert.equal(assigneeMatches("Carolina Silva", "Carolina"), false);
assert.equal(assigneeMatches("Carlota", "Carolina"), false);

const datedItems: DashboardItem[] = [
  { key: "no-date", type: "Tarefa", title: "Sem data", client: null, owner: "Guilherme", date: null, href: "/" },
  { key: "future", type: "Tarefa", title: "Futuro", client: null, owner: "Guilherme", date: "2026-08-10", href: "/" },
  { key: "next7", type: "Conteúdo", title: "Semana", client: null, owner: "Guilherme", date: "2026-07-25", href: "/" },
  { key: "tomorrow", type: "Tarefa", title: "Amanhã", client: null, owner: "Guilherme", date: "2026-07-22", href: "/" },
  { key: "today", type: "Conteúdo", title: "Hoje", client: null, owner: "Guilherme", date: "2026-07-21", href: "/" },
  { key: "older", type: "Tarefa", title: "Antigo", client: null, owner: "Guilherme", date: "2026-07-10", href: "/" },
  { key: "recent", type: "Tarefa", title: "Recente", client: null, owner: "Guilherme", date: "2026-07-20", href: "/" },
];
assert.deepEqual(sortDashboardItems(datedItems, now).map((item) => item.key), [
  "older",
  "recent",
  "today",
  "tomorrow",
  "next7",
  "future",
  "no-date",
]);
assert.equal(filterDashboardItems(datedItems, "overdue", now).length, 2);
assert.equal(filterDashboardItems(datedItems, "near", now).length, 2);
assert.equal(filterDashboardItems(datedItems, "next7", now).length, 3);
assert.equal(dashboardDateState("2026-07-20", now).overdue, true);
assert.equal(dashboardDateState("2026-07-21", now).today, true);
assert.equal(dashboardDateState("2026-07-22", now).tomorrow, true);
assert.equal(dashboardDateState("2026-07-25", now).thisWeek, true);
assert.equal(dashboardDateState("2026-07-27", now).thisWeek, false);
assert.equal(dashboardDateState(null, now).next7, false);

const operationalFixture = {
  status: "pending",
  needs_copy: true,
  copy_status: null,
  copy_due_date: "2026-07-22",
  publish_date: "2026-07-25",
  publishing_due_date: "2026-07-24",
  needs_client_approval: false,
  approval_status: null,
  approval_due_date: null,
  design_due_date: "2026-07-20",
} as ContentItem;
assert.equal(getContentOperationalDate(operationalFixture), "2026-07-22");
assert.equal(getContentOperationalDate({ ...operationalFixture, copy_status: "feito" }), "2026-07-24");

const activeNames = Object.values(operationalProfiles).map((profile) => profile.name);
for (const profile of Object.values(operationalProfiles)) {
  const personal = buildDashboardItems({
    tasks: sampleTasks,
    content: sampleContent,
    clients: sampleClients,
    scope: "personal",
    profileName: profile.name,
    activeTeamNames: activeNames,
  });
  assert.ok(personal.every((item) => assigneeMatches(item.owner, profile.name)));
}
const demoTeam = buildDashboardItems({
  tasks: sampleTasks,
  content: sampleContent,
  clients: sampleClients,
  scope: "team",
  profileName: "Guilherme",
  activeTeamNames: activeNames,
});
assert.ok(demoTeam.length > 0);
assert.ok(demoTeam.every((item) => activeNames.some((name) => assigneeMatches(item.owner, name))));

console.log("Dashboard calculation and profile checks passed.");
