import Link from "next/link";
import { BulkContentModal } from "@/components/bulk-content-modal";
import { ContentTable } from "@/components/content-table";
import { ContentCalendarView, ContentPipelineView } from "@/components/content-views";
import { ContentFiltersBar } from "@/components/live-filters";
import {
  archiveContentInlineAction,
  bulkCreateContentAction,
  createContentCommentAction,
  deleteContentCommentAction,
  deleteContentInlineAction,
  listContentCommentsAction,
  updateContentInlineAction,
  updateContentStatusAction,
} from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { displayContentPlatform } from "@/lib/content-platform";
import { getClients, getContentItems, getTeamMembers, uniqueValues } from "@/lib/data";
import { contentStatusLabels } from "@/lib/labels";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { operationalProfiles } from "@/lib/operational-profiles";
import { parseContentStatusParams } from "@/lib/smart-links";
import { contentStatusTones } from "@/lib/status-styles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { contentStatuses } from "@/lib/types";
import { Panel } from "@/components/ui";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

type ContentView = "pipeline" | "table" | "calendar";

const viewOptions: Array<{ value: ContentView; label: string }> = [
  { value: "pipeline", label: "Pipeline" },
  { value: "table", label: "Tabela" },
  { value: "calendar", label: "Calendário" },
];

const monthOptions = [
  { value: "", label: "Todos os meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const contentOwnerNames = [
  operationalProfiles.guilherme.name,
  operationalProfiles.carlota.name,
  operationalProfiles.carolina.name,
  operationalProfiles.sofia.name,
];

function currentYearValue() {
  return String(new Date().getFullYear());
}

function currentMonthValue() {
  return String(new Date().getMonth() + 1).padStart(2, "0");
}

function isMonthOnlyValue(value: string | undefined) {
  return Boolean(value && /^(0[1-9]|1[0-2])$/.test(value));
}

function isYearValue(value: string | undefined) {
  return Boolean(value && /^\d{4}$/.test(value));
}

function parseMonthYearParams(params: Record<string, string | string[] | undefined>) {
  const currentYear = currentYearValue();
  const rawMonth = valueOf(params, "month");
  const rawYear = valueOf(params, "year");

  if (rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)) {
    return {
      month: rawMonth.slice(5, 7),
      year: rawMonth.slice(0, 4),
      currentYear,
    };
  }

  return {
    month: isMonthOnlyValue(rawMonth) ? rawMonth! : "",
    year: isYearValue(rawYear) ? rawYear! : currentYear,
    currentYear,
  };
}

function contentMonthFromParts(month: string, year: string) {
  return isMonthOnlyValue(month) && isYearValue(year) ? `${year}-${month}` : "";
}

function parseView(value: string | undefined): ContentView {
  if (value === "pipeline") return value;
  if (value === "table") return value;
  if (value === "calendar") return value;
  return "table";
}

function hrefForView(params: Record<string, string | string[] | undefined>, view: ContentView) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach((value) => {
      if (value) nextParams.append(key, value);
    });
  });

  if (view === "table") {
    nextParams.delete("view");
  } else {
    nextParams.set("view", view);
  }

  const query = nextParams.toString();
  return query ? `/content?${query}` : "/content";
}

export default async function ContentPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const activeProfile = await requireCurrentOperationalProfile();
  const requestedAssignee = valueOf(params, "assignee") ?? valueOf(params, "owner");
  const currentView = parseView(valueOf(params, "view"));
  const bulkOpen = valueOf(params, "bulk") === "1";
  const status = parseContentStatusParams(params.status);
  const monthYear = parseMonthYearParams(params);
  const selectedContentMonth = contentMonthFromParts(monthYear.month, monthYear.year);
  const defaultContentMonth = selectedContentMonth || `${monthYear.year}-${currentMonthValue()}`;
  const filtersForBar = {
    assignee: requestedAssignee === "all" ? "" : requestedAssignee ?? activeProfile.name,
    client: valueOf(params, "client") ?? "",
    month: monthYear.month,
    status,
    platform: valueOf(params, "platform") ?? "",
    publishUntil: valueOf(params, "publishUntil") ?? valueOf(params, "until") ?? "",
    year: monthYear.year,
  };
  const filters = {
    ...filtersForBar,
    month: selectedContentMonth,
  };
  const [clients, teamMembers, itemsForOptions, filteredItems] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getContentItems(),
    getContentItems(filters),
  ]);
  const platformFilteredItems =
    filters.platform === "Sem plataforma"
      ? filteredItems.filter((item) => displayContentPlatform(item.platform) === "Sem plataforma")
      : filteredItems;
  const items = platformFilteredItems;
  const platforms = uniqueValues(itemsForOptions, (item) => displayContentPlatform(item.platform));
  const yearOptions = [monthYear.currentYear, String(Number(monthYear.currentYear) + 1)].map((year) => ({
    value: year,
    label: year,
  }));
  const ownerOptions = [
    { value: "", label: "Todos" },
    ...contentOwnerNames.map((name) => ({ value: name, label: name })),
  ];
  const tableKey = [
    JSON.stringify(filters),
    items.map((item) => `${item.id}:${item.status}:${item.updated_at}`).join("|"),
  ].join(":");

  return (
    <>
      <Panel className="relative z-40 mb-5 p-3.5">
        <div data-content-filter-card className="grid min-w-0 gap-3">
          <div
            data-content-filter-top
            className="flex min-w-0 flex-wrap items-center gap-2.5"
          >
            <div className="flex shrink-0 flex-wrap gap-1.5 rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
              {viewOptions.map((option) => {
                const active = option.value === currentView;

                return (
                  <Link
                    key={option.value}
                    href={hrefForView(params, option.value)}
                    className={`inline-flex min-h-9 items-center rounded-2xl px-3.5 text-sm font-extrabold transition ${
                      active
                        ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_24px_rgba(83,183,223,0.25)]"
                        : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <ContentFiltersBar
            filters={filtersForBar}
            clientOptions={[
              { value: "", label: "Todos os clientes" },
              ...clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
            ]}
            monthOptions={monthOptions}
            ownerOptions={ownerOptions}
            statusOptions={[
              { value: "", label: "Todos os estados" },
              ...contentStatuses.map((status) => ({
                value: status,
                label: contentStatusLabels[status],
                tone: contentStatusTones[status],
              })),
            ]}
            platformOptions={[
              { value: "", label: "Todas as plataformas" },
              ...platforms.map((platform) => ({ value: platform, label: platform })),
            ]}
            yearOptions={yearOptions}
            defaultYear={monthYear.currentYear}
          />
        </div>
      </Panel>

      {currentView === "pipeline" ? (
        <ContentPipelineView
          items={items}
          clients={clients}
          teamMembers={teamMembers}
          activeProfile={activeProfile}
          canPersist={isSupabaseConfigured()}
          updateContentAction={updateContentInlineAction}
          updateStatusAction={updateContentStatusAction}
          listCommentsAction={listContentCommentsAction}
          createCommentAction={createContentCommentAction}
          deleteCommentAction={deleteContentCommentAction}
        />
      ) : null}

      {currentView === "calendar" ? (
        <ContentCalendarView items={items} month={defaultContentMonth} />
      ) : null}

      {currentView === "table" ? (
        <ContentTable
          key={tableKey}
          items={items}
          clients={clients}
          teamMembers={teamMembers}
          activeProfile={activeProfile}
          canPersist={isSupabaseConfigured()}
          updateContentAction={updateContentInlineAction}
          updateStatusAction={updateContentStatusAction}
          archiveContentAction={archiveContentInlineAction}
          deleteContentAction={deleteContentInlineAction}
          listCommentsAction={listContentCommentsAction}
          createCommentAction={createContentCommentAction}
          deleteCommentAction={deleteContentCommentAction}
        />
      ) : null}

      <BulkContentModal
        action={bulkCreateContentAction}
        clients={clients}
        teamMembers={teamMembers}
        canPersist={isSupabaseConfigured()}
        defaultClientId={filters.client}
        defaultMonth={defaultContentMonth}
        initialOpen={bulkOpen}
      />
    </>
  );
}
