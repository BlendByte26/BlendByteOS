import { ContentTable } from "@/components/content-table";
import { ContentFiltersBar } from "@/components/live-filters";
import { deleteContentInlineAction, updateContentInlineAction, updateContentStatusAction } from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { getClients, getContentItems, uniqueValues } from "@/lib/data";
import { contentStatusLabels } from "@/lib/labels";
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

export default async function ContentPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const filters = {
    client: valueOf(params, "client") ?? "",
    month: valueOf(params, "month") ?? "",
    status: valueOf(params, "status") ?? "",
    platform: valueOf(params, "platform") ?? "",
    publishUntil: valueOf(params, "publishUntil") ?? "",
  };
  const [clients, itemsForOptions, items] = await Promise.all([
    getClients(),
    getContentItems(),
    getContentItems(filters),
  ]);
  const platforms = uniqueValues(itemsForOptions, (item) => item.platform);
  const months = Array.from(
    new Set([filters.month, ...itemsForOptions.map((item) => item.month)].filter(Boolean)),
  ).sort();
  const tableKey = [
    JSON.stringify(filters),
    items.map((item) => `${item.id}:${item.status}:${item.updated_at}`).join("|"),
  ].join(":");

  return (
    <>
      <Panel className="mb-5 p-4">
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
          statusOptions={[
            { value: "", label: "Todos os estados" },
            ...contentStatuses.map((status) => ({ value: status, label: contentStatusLabels[status] })),
          ]}
          platformOptions={[
            { value: "", label: "Todas as plataformas" },
            ...platforms.map((platform) => ({ value: platform, label: platform })),
          ]}
        />
      </Panel>

      <ContentTable
        key={tableKey}
        items={items}
        clients={clients}
        canPersist={isSupabaseConfigured()}
        updateContentAction={updateContentInlineAction}
        updateStatusAction={updateContentStatusAction}
        deleteContentAction={deleteContentInlineAction}
      />
    </>
  );
}
