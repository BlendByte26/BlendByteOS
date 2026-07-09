import { existsSync } from "node:fs";
import { join } from "node:path";
import { ClientBadge } from "@/components/client-badge";
import { ClientDeleteControl } from "@/components/client-delete-control";
import { ClientLogo } from "@/components/client-logo";
import { getClientDisplayCode, getClientVisualToken } from "@/lib/client-visuals";
import { clientStatusLabels, clientTypeLabels } from "@/lib/labels";
import { getClients, getContentItems, getTasks } from "@/lib/data";
import { Badge, EditIconLink, EmptyState, ExternalLink, Panel, TableWrap } from "@/components/ui";

function getStaticClientLogoPath(clientCode: string | null) {
  if (!clientCode) return null;

  const fileName = `${clientCode}.svg`;
  const filePath = join(process.cwd(), "public", "clients", fileName);

  return existsSync(filePath) ? `/clients/${fileName}` : null;
}

export default async function ClientsPage() {
  const [clients, content, tasks] = await Promise.all([
    getClients(),
    getContentItems(),
    getTasks(),
  ]);
  const contentCountByClient = new Map<string, number>();
  const taskCountByClient = new Map<string, number>();

  content.forEach((item) => {
    contentCountByClient.set(item.client_id, (contentCountByClient.get(item.client_id) ?? 0) + 1);
  });
  tasks.forEach((task) => {
    if (!task.client_id) return;
    taskCountByClient.set(task.client_id, (taskCountByClient.get(task.client_id) ?? 0) + 1);
  });

  return (
    <>
      <Panel>
        {clients.length ? (
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
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {clients.map((client) => {
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
                  const staticLogoPath = getStaticClientLogoPath(client.client_code);

                  return (
                    <tr key={client.id} className="odd:bg-white/18">
                      <td className={`border-l-4 px-5 py-4 ${clientToken.borderStrong}`}>
                        <div className="flex items-center gap-3">
                          <ClientLogo
                            logoPath={staticLogoPath}
                            fallback={displayCode}
                            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--bb-border)] bg-white/60 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
                            imageClassName="h-full w-full object-contain p-1.5"
                          />
                          <ClientBadge
                            clientId={client.id}
                            clientCode={client.client_code}
                            clientName={client.name}
                            shortName={client.short_name}
                            colorKey={client.color_key}
                            href={`/clients/${client.id}`}
                            variant="default"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{clientTypeLabels[client.type]}</td>
                      <td className="px-5 py-4">
                        <Badge value={client.status} label={clientStatusLabels[client.status]} />
                      </td>
                      <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{client.owner_name ?? "-"}</td>
                      <td className="max-w-48 break-words px-5 py-4 font-medium text-[var(--bb-muted)]">{client.platforms?.join(", ") || "-"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <ExternalLink href={client.google_drive_url ?? client.drive_url} label="Drive" />
                          <ExternalLink href={client.onedrive_url} label="OneDrive" />
                          <ExternalLink href={client.figma_project_url ?? client.figma_url} label="Figma" />
                          <ExternalLink href={client.meta_url} label="Meta" />
                        </div>
                      </td>
                      <td className="bb-actions-col sticky right-0 px-2 py-4">
                        <div className="bb-actions-row">
                          <EditIconLink href={`/clients/${client.id}/edit`} />
                          <ClientDeleteControl
                            clientId={client.id}
                            clientName={client.name}
                            contentCount={contentCountByClient.get(client.id) ?? 0}
                            taskCount={taskCountByClient.get(client.id) ?? 0}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Ainda não existem clientes." />
        )}
      </Panel>
    </>
  );
}
