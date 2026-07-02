import { getArchiveData } from "@/lib/data";
import { contentStatusLabels, taskStatusLabels } from "@/lib/labels";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import { Badge, EditIconLink, EmptyState, ExternalLink, Panel, TableWrap } from "@/components/ui";

export default async function ArchivePage() {
  const archive = await getArchiveData();

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="border-b border-[var(--bb-border)] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Conteúdos</h2>
          </div>
          {archive.content.length ? (
            <TableWrap>
              <table className="w-full min-w-[680px] table-auto text-left text-sm">
                <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Publicação</th>
                    <th className="px-4 py-3 font-extrabold">Cliente</th>
                    <th className="px-4 py-3 font-extrabold">Título</th>
                    <th className="px-4 py-3 font-extrabold">Estado</th>
                    <th className="px-4 py-3 font-extrabold">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bb-border)]">
                  {archive.content.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--bb-muted)]">{item.publish_date ?? "-"}</td>
                      <td className="max-w-40 px-4 py-3 text-[var(--bb-muted)]">
                        <span className="block truncate">{item.clients?.name ?? "-"}</span>
                      </td>
                      <td className="max-w-60 break-words px-4 py-3 font-bold text-[var(--bb-charcoal)]">
                        {cleanPrefixedTitle(item.title, item.clients)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={item.status} label={contentStatusLabels[item.status]} />
                      </td>
                      <td className="px-4 py-3">
                        {item.published_url ? (
                          <ExternalLink href={item.published_url} label="Abrir" />
                        ) : (
                          <EditIconLink href={`/content/${item.id}/edit`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <EmptyState title="Sem conteúdos no arquivo." />
          )}
        </Panel>

        <Panel>
          <div className="border-b border-[var(--bb-border)] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Tarefas arquivadas</h2>
          </div>
          {archive.tasks.length ? (
            <TableWrap>
              <table className="w-full min-w-[560px] table-auto text-left text-sm">
                <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Tarefa</th>
                    <th className="px-4 py-3 font-extrabold">Cliente</th>
                    <th className="px-4 py-3 font-extrabold">Responsável</th>
                    <th className="px-4 py-3 font-extrabold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bb-border)]">
                  {archive.tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="max-w-64 break-words px-4 py-3 font-bold text-[var(--bb-charcoal)]">
                        {getTaskDisplayTitle(task)}
                      </td>
                      <td className="max-w-40 px-4 py-3 text-[var(--bb-muted)]">
                        <span className="block truncate">{task.clients?.name ?? "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--bb-muted)]">{task.assignee_name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge value={task.status} label={taskStatusLabels[task.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <EmptyState title="Sem tarefas arquivadas." />
          )}
        </Panel>
      </div>
    </>
  );
}
