import Link from "next/link";
import { deleteClientAction } from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { clientStatusLabels, clientTypeLabels } from "@/lib/labels";
import { getClients } from "@/lib/data";
import { Badge, ClientAvatar, DeleteIconButton, EditIconLink, EmptyState, ExternalLink, Panel, TableWrap } from "@/components/ui";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <>
      <Panel>
        {clients.length ? (
          <TableWrap>
            <table className="w-full min-w-[860px] table-auto text-left text-sm">
              <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Cliente</th>
                  <th className="px-5 py-4 font-extrabold">Tipo</th>
                  <th className="px-5 py-4 font-extrabold">Estado</th>
                  <th className="px-5 py-4 font-extrabold">Responsável</th>
                  <th className="px-5 py-4 font-extrabold">Plataformas</th>
                  <th className="px-5 py-4 font-extrabold">Links</th>
                  <th className="sticky right-0 w-24 bg-white/80 px-5 py-4 font-extrabold backdrop-blur">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <ClientAvatar client={client} />
                        <div>
                          <Link href={`/clients/${client.id}`} className="font-bold text-[var(--bb-charcoal)] hover:underline">
                            {getClientLabel(client)}
                          </Link>
                          {client.short_name ? (
                            <div className="text-xs font-bold text-[var(--bb-muted)]">{client.short_name}</div>
                          ) : null}
                        </div>
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
                    <td className="sticky right-0 w-24 bg-[rgba(255,255,255,0.82)] px-5 py-4 backdrop-blur">
                      <div className="flex items-center gap-2">
                        <EditIconLink href={`/clients/${client.id}/edit`} />
                        <form action={deleteClientAction.bind(null, client.id)}>
                          <DeleteIconButton />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
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
