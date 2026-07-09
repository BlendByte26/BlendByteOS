import Link from "next/link";
import { cookies } from "next/headers";
import { BulkContentModal } from "@/components/bulk-content-modal";
import { ContentTable } from "@/components/content-table";
import { ContentCalendarView, ContentPipelineView } from "@/components/content-views";
import { ContentFiltersBar } from "@/components/live-filters";
import {
  bulkCreateContentAction,
  createContentCommentAction,
  deleteContentCommentAction,
  deleteContentInlineAction,
  listContentCommentsAction,
  updateContentInlineAction,
  updateContentStatusAction,
} from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { getClients, getContentItems, getTeamMembers, uniqueValues } from "@/lib/data";
import { contentStatusLabels } from "@/lib/labels";
import {
  OPERATIONAL_PROFILE_COOKIE,
  fallbackOperationalProfile,
  getOperationalProfile,
} from "@/lib/operational-profiles";
import { parseContentStatusParam } from "@/lib/smart-links";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ContentItem } from "@/lib/types";
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

function parseView(value: string | undefined): ContentView {
  if (value === "pipeline") return value;
  if (value === "table") return value;
  if (value === "calendar") return value;
  return "table";
}

function isAttentionParam(value: string | undefined) {
  return value === "true" || value === "1";
}

function contentMissingFields(item: ContentItem) {
  const missing: string[] = [];
  if (!item.platform?.trim()) missing.push("plataforma");
  if (!item.format?.trim()) missing.push("formato");
  if (!item.assignee_name?.trim()) missing.push("owner");
  if (["todo", "in_progress", "ready_to_publish"].includes(item.status)) {
    if (!item.creative_brief?.trim() && !item.brief_url?.trim()) missing.push("briefing");
    if (!item.copy_text?.trim()) missing.push("copy");
  }
  return missing;
}

function contentNeedsAttention(item: ContentItem) {
  return item.is_blocked || contentMissingFields(item).length > 0;
}

function hrefForView(params: Record<string, string | string[] | undefined>, view: ContentView) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, rawValue]) => {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) nextParams.set(key, value);
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
  const cookieStore = await cookies();
  const activeProfile =
    getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value) ??
    fallbackOperationalProfile();
  const currentView = parseView(valueOf(params, "view"));
  const attention = isAttentionParam(valueOf(params, "attention"));
  const bulkOpen = valueOf(params, "bulk") === "1";
  const status = parseContentStatusParam(valueOf(params, "status"));
  const filters = {
    assignee: valueOf(params, "assignee") ?? valueOf(params, "owner") ?? "",
    client: valueOf(params, "client") ?? "",
    month: valueOf(params, "month") ?? "",
    status,
    platform: valueOf(params, "platform") ?? "",
    publishUntil: valueOf(params, "publishUntil") ?? valueOf(params, "until") ?? "",
  };
  const [clients, teamMembers, itemsForOptions, filteredItems] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getContentItems(),
    getContentItems(filters),
  ]);
  const items = attention ? filteredItems.filter(contentNeedsAttention) : filteredItems;
  const platforms = uniqueValues(itemsForOptions, (item) => item.platform);
  const months = Array.from(
    new Set([filters.month, ...itemsForOptions.map((item) => item.month)].filter(Boolean)),
  ).sort();
  const tableKey = [
    JSON.stringify(filters),
    attention ? "attention" : "",
    items.map((item) => `${item.id}:${item.status}:${item.updated_at}`).join("|"),
  ].join(":");

  return (
    <>
      <Panel className="relative z-40 mb-5 p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
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
          <ContentFiltersBar
            key={JSON.stringify(filters)}
            filters={filters}
            clientOptions={[
              { value: "", label: "Todos os clientes" },
              ...clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
            ]}
            monthOptions={[
              { value: "", label: "Todos os meses" },
              ...months.map((month) => ({ value: month, label: month })),
            ]}
            ownerOptions={[
              { value: "", label: "Todos" },
              ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
            ]}
            statusOptions={[
              { value: "", label: "Todos os estados" },
              ...contentStatuses.map((status) => ({ value: status, label: contentStatusLabels[status] })),
            ]}
            platformOptions={[
              { value: "", label: "Todas as plataformas" },
              ...platforms.map((platform) => ({ value: platform, label: platform })),
            ]}
          />
        </div>
      </Panel>

      {currentView === "pipeline" ? (
        <ContentPipelineView
          items={items}
          canPersist={isSupabaseConfigured()}
          updateStatusAction={updateContentStatusAction}
        />
      ) : null}

      {currentView === "calendar" ? (
        <ContentCalendarView items={items} month={filters.month} />
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
        defaultMonth={filters.month}
        initialOpen={bulkOpen}
      />
    </>
  );
}
