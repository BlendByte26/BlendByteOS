import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { ClientBadge } from "@/components/client-badge";
import { ClientDeleteControl } from "@/components/client-delete-control";
import { ClientLogo } from "@/components/client-logo";
import { getClientDisplayCode, getClientVisualToken } from "@/lib/client-visuals";
import {
  getEffectiveClientStatus,
  getClientListTab,
  isClientListTab,
  type ClientListTab,
} from "@/lib/client-profile";
import { clientStatusLabels, clientTypeLabels } from "@/lib/labels";
import { getClients, getContentItems, getTasks } from "@/lib/data";
import {
  canDeleteClients,
  canManageClients,
  requireCurrentOperationalProfile,
} from "@/lib/auth";
import { Badge, EditIconLink, EmptyState, ExternalLink, Panel, TableWrap } from "@/components/ui";

function getStaticClientLogoPath(clientCode: string | null) {
  if (!clientCode) return null;

  for (const extension of ["png", "svg"]) {
    const fileName = `${clientCode}.${extension}`;
    const filePath = join(process.cwd(), "public", "clients", fileName);

    if (existsSync(filePath)) return `/clients/${fileName}`;
  }

  return null;
}

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const clientTabs: Array<{ value: ClientListTab; label: string }> = [
  { value: "internal", label: "Internos" },
  { value: "external", label: "Externos" },
  { value: "inactive", label: "Inativos" },
];

export default async function ClientsPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const selectedTab = isClientListTab(tab) ? tab : "internal";
  const [profile, clients, content, tasks] = await Promise.all([
    requireCurrentOperationalProfile(),
    getClients(),
    getContentItems(),
    getTasks(),
  ]);
  const canEdit = canManageClients(profile);
  const canDelete = canDeleteClients(profile);
  const contentCountByClient = new Map<string, number>();
  const taskCountByClient = new Map<string, number>();

  content.forEach((item) => {
    contentCountByClient.set(item.client_id, (contentCountByClient.get(item.client_id) ?? 0) + 1);
  });
  tasks.forEach((task) => {
    if (!task.client_id) return;
    taskCountByClient.set(task.client_id, (taskCountByClient.get(task.client_id) ?? 0) + 1);
  });
  const clientCountByTab = new Map<ClientListTab, number>();
  clients.forEach((client) => {
    const clientTab = getClientListTab(client);
    clientCountByTab.set(clientTab, (clientCountByTab.get(clientTab) ?? 0) + 1);
  });
  const visibleClients = clients.filter((client) => getClientListTab(client) === selectedTab);
  const selectedTabLabel = clientTabs.find((item) => item.value === selectedTab)?.label ?? "Clientes";

  return (
    <div className="grid gap-5">
      <nav
        aria-label="Tipos de cliente"
        className="grid gap-2 rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.07)] sm:grid-cols-3"
      >
        {clientTabs.map((item) => {
          const active = item.value === selectedTab;

          return (
            <Link
              key={item.value}
              href={`/clients?tab=${item.value}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-between rounded-full px-4 text-sm font-extrabold transition ${
                active
                  ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_24px_rgba(83,183,223,0.24)]"
                  : "bg-white/45 text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs text-[var(--bb-charcoal)] ring-1 ring-[var(--bb-border)]">
                {clientCountByTab.get(item.value) ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      <Panel>
        {visibleClients.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[860px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Cliente</th>
                  <th className="px-5 py-4 font-extrabold">Tipo</th>
                  <th className="px-5 py-4 font-extrabold">Estado</th>
                  <th className="px-5 py-4 font-extrabold">Responsável</th>
                  <th className="px-5 py-4 font-extrabold">Plataformas</th>
                  <th className="px-5 py-4 font-extrabold">Links</th>
                  {canEdit || canDelete ? (
                    <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {visibleClients.map((client) => {
                  const effectiveStatus = getEffectiveClientStatus(client);
                  const clientToken = getClientVisualToken({
                    clientCode: client.client_code,
                    clientName: client.name,
                    shortName: client.short_name,
                    colorKey: client.color_key,
                  });
                  const displayCode = getClientDisplayCode({
                    clientCode: client.client_code,
                    clientName: client.name,
                    shortName: client.short_name,
                  });
                  const logoPath = client.logo_url ?? getStaticClientLogoPath(client.client_code);

                  return (
                    <tr key={client.id} className="odd:bg-white/18">
                      <td className={`border-l-4 px-5 py-4 ${clientToken.borderStrong}`}>
                        <div className="flex items-center gap-3">
                          <ClientLogo
                            logoPath={logoPath}
                            fallback={displayCode}
                            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--bb-border)] bg-white/60 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
                            imageClassName="h-full w-full object-cover"
                          />
                          <ClientBadge
                            clientId={client.id}
                            clientCode={client.client_code}
                            clientName={client.name}
                            shortName={client.short_name}
                            logoUrl={client.logo_url}
                            colorKey={client.color_key}
                            href={`/clients/${client.id}`}
                            variant="default"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{clientTypeLabels[client.type]}</td>
                      <td className="px-5 py-4">
                        <Badge value={effectiveStatus} label={clientStatusLabels[effectiveStatus]} />
                      </td>
                      <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{client.owner_name ?? "-"}</td>
                      <td className="max-w-48 break-words px-5 py-4 font-medium text-[var(--bb-muted)]">{client.platforms?.join(", ") || "-"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <ExternalLink href={client.drive_url} label="Drive" />
                          <ExternalLink href={client.figma_url} label="Figma" />
                          <ExternalLink href={client.meta_url} label="Meta Business Suite" />
                        </div>
                      </td>
                      {canEdit || canDelete ? (
                        <td className="bb-actions-col sticky right-0 px-2 py-4">
                          <div className="bb-actions-row">
                            {canEdit ? <EditIconLink href={`/clients/${client.id}/edit`} /> : null}
                            {canDelete ? (
                              <ClientDeleteControl
                                clientId={client.id}
                                clientName={client.name}
                                contentCount={contentCountByClient.get(client.id) ?? 0}
                                taskCount={taskCountByClient.get(client.id) ?? 0}
                              />
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title={`Sem clientes ${selectedTabLabel.toLowerCase()}.`} />
        )}
      </Panel>
    </div>
  );
}
