import Link from "next/link";
import { getClientLabel } from "@/lib/client-display";
import { contentStatusLabels } from "@/lib/labels";
import { getDashboardData } from "@/lib/data";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { Badge, ClientAvatar, EmptyState, Panel, TableWrap } from "@/components/ui";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Hoje" value={dashboard.dueToday.length} />
        <Metric label="Esta semana" value={dashboard.dueThisWeek.length} />
        <Metric label="Atrasados" value={dashboard.overdue.length} />
        <Metric label="Bloqueados" value={dashboard.blockedContent.length + dashboard.blockedTasks.length} tone="blocked" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <BlockedPanel
          content={dashboard.blockedContent}
          tasks={dashboard.blockedTasks}
        />
        <SetupClientsPanel clients={dashboard.clientsInSetup} />
        <ContentPanel title="Conteúdos para hoje" items={dashboard.dueToday} />
        <ContentPanel title="Conteúdos atrasados" items={dashboard.overdue} />
        <ContentPanel title="Pronto para publicar" items={dashboard.ready} />
        <Panel>
          <div className="border-b border-[var(--bb-border)] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Tarefas esta semana</h2>
          </div>
          {dashboard.tasksThisWeek.length ? (
            <TableWrap>
              <table className="w-full table-auto text-left text-sm">
                <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
                  <tr>
                    <th className="px-5 py-4 font-extrabold">Tarefa</th>
                    <th className="px-4 py-4 font-extrabold">Cliente</th>
                    <th className="px-4 py-4 font-extrabold">Responsável</th>
                    <th className="py-4 pl-4 pr-6 font-extrabold">Prazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bb-border)]">
                  {dashboard.tasksThisWeek.map((task) => (
                    <tr key={task.id} className={task.is_blocked ? "bg-[var(--bb-red-soft)]" : ""}>
                      <td className="max-w-[320px] px-5 py-4 font-bold text-[var(--bb-charcoal)]">
                        <span className="bb-line-clamp-2">{getTaskDisplayTitle(task)}</span>
                        {task.is_blocked ? (
                          <div className="mt-1 text-xs font-bold text-[#8f2415]">
                            Bloqueado: {task.blocker_reason ?? "Motivo por adicionar"}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{task.clients ? getClientLabel(task.clients) : "-"}</td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{task.assignee_name ?? "-"}</td>
                      <td className="py-4 pl-4 pr-6 font-medium whitespace-nowrap text-[var(--bb-muted)]">{task.due_date ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <EmptyState title="Sem tarefas com prazo esta semana." />
          )}
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="border-b border-[var(--bb-border)] px-5 py-4">
          <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Resumo por cliente</h2>
        </div>
        <TableWrap>
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
              <tr>
                <th className="px-5 py-4 font-extrabold">Cliente</th>
                <th className="px-4 py-4 text-right font-extrabold">Conteúdos</th>
                <th className="px-4 py-4 text-right font-extrabold">Prontos</th>
                <th className="px-4 py-4 text-right font-extrabold">Bloqueados</th>
                <th className="py-4 pl-4 pr-6 text-right font-extrabold">Tarefas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bb-border)]">
              {dashboard.summaryByClient.map((row) => (
                <tr key={row.client.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ClientAvatar client={row.client} size="xs" />
                      <Link href={`/clients/${row.client.id}`} className="font-medium hover:underline">
                        {getClientLabel(row.client)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-[var(--bb-muted)]">{row.content}</td>
                  <td className="px-4 py-4 text-right font-medium text-[var(--bb-muted)]">{row.ready}</td>
                  <td className="px-4 py-4 text-right font-medium text-[var(--bb-muted)]">{row.blocked}</td>
                  <td className="py-4 pl-4 pr-6 text-right font-medium text-[var(--bb-muted)]">{row.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "blocked" }) {
  return (
    <Panel className="relative overflow-hidden p-5">
      <div className="absolute right-4 top-4 text-5xl font-extrabold text-[rgba(0,0,0,0.04)]">
        BB
      </div>
      <div className={`mb-5 h-1.5 w-8 rounded-full ${tone === "blocked" ? "bg-[var(--bb-red)] shadow-[0_0_24px_rgba(232,76,49,0.28)]" : "bg-[var(--bb-primary)] shadow-[0_0_24px_rgba(83,183,223,0.45)]"}`} />
      <div className="text-sm font-bold text-[var(--bb-muted)]">{label}</div>
      <div className="mt-2 text-5xl font-extrabold tracking-tight text-[var(--bb-charcoal)]">{value}</div>
    </Panel>
  );
}

function BlockedPanel({
  content,
  tasks,
}: {
  content: Awaited<ReturnType<typeof getDashboardData>>["blockedContent"];
  tasks: Awaited<ReturnType<typeof getDashboardData>>["blockedTasks"];
}) {
  const hasBlocked = content.length > 0 || tasks.length > 0;

  return (
    <Panel>
      <div className="border-b border-[var(--bb-border)] px-5 py-4">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Bloqueados</h2>
      </div>
      {hasBlocked ? (
        <div className="divide-y divide-[var(--bb-border)]">
          {content.map((item) => (
            <Link
              key={item.id}
              href={`/content/${item.id}/edit`}
              className="block bg-[var(--bb-red-soft)] px-5 py-4 transition hover:bg-[rgba(232,76,49,0.2)]"
            >
              <div className="bb-line-clamp-2 text-sm font-extrabold text-[var(--bb-charcoal)]">{item.title}</div>
              <div className="mt-1 text-xs font-bold text-[#8f2415]">
                Conteúdo · {item.blocker_reason ?? "Motivo do bloqueio por adicionar"}
              </div>
            </Link>
          ))}
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}/edit`}
              className="block bg-[var(--bb-red-soft)] px-5 py-4 transition hover:bg-[rgba(232,76,49,0.2)]"
            >
              <div className="bb-line-clamp-2 text-sm font-extrabold text-[var(--bb-charcoal)]">{getTaskDisplayTitle(task)}</div>
              <div className="mt-1 text-xs font-bold text-[#8f2415]">
                Tarefa · {task.blocker_reason ?? "Motivo do bloqueio por adicionar"}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Sem bloqueios neste momento." />
      )}
    </Panel>
  );
}

function SetupClientsPanel({
  clients,
}: {
  clients: Awaited<ReturnType<typeof getDashboardData>>["clientsInSetup"];
}) {
  return (
    <Panel>
      <div className="border-b border-[var(--bb-border)] px-5 py-4">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Clientes em setup</h2>
      </div>
      {clients.length ? (
        <div className="divide-y divide-[var(--bb-border)]">
          {clients.slice(0, 6).map((row) => (
            <Link
              key={row.client.id}
              href={`/clients/${row.client.id}`}
              className="block px-5 py-4 transition hover:bg-white/45"
            >
              <div className="bb-line-clamp-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
                {getClientLabel(row.client)}
              </div>
              <div className="mt-1 text-xs font-bold leading-5 text-[var(--bb-muted)]">
                <span className="bb-line-clamp-2">Em falta: {row.missing.slice(0, 4).join(", ")}
                {row.missing.length > 4 ? ` +${row.missing.length - 4}` : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Sem clientes ativos com setup pendente." />
      )}
    </Panel>
  );
}

function ContentPanel({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getDashboardData>>["dueToday"];
}) {
  return (
    <Panel>
      <div className="border-b border-[var(--bb-border)] px-5 py-4">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
      </div>
      {items.length ? (
        <TableWrap>
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
              <tr>
                <th className="px-5 py-4 font-extrabold">Conteúdo</th>
                <th className="px-4 py-4 font-extrabold">Cliente</th>
                <th className="px-4 py-4 font-extrabold">Data</th>
                <th className="w-48 py-4 pl-4 pr-6 font-extrabold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bb-border)]">
              {items.map((item) => (
                <tr key={item.id} className={item.is_blocked ? "bg-[var(--bb-red-soft)]" : ""}>
                  <td className="max-w-[320px] px-5 py-4 font-bold text-[var(--bb-charcoal)]">
                    <span className="bb-line-clamp-2">{item.title}</span>
                    {item.is_blocked ? (
                      <div className="mt-1 text-xs font-bold text-[#8f2415]">
                        Bloqueado: {item.blocker_reason ?? "Motivo por adicionar"}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{item.clients ? getClientLabel(item.clients) : "-"}</td>
                  <td className="px-4 py-4 font-medium whitespace-nowrap text-[var(--bb-muted)]">{item.publish_date ?? "-"}</td>
                  <td className="w-48 py-4 pl-4 pr-6">
                    <Badge value={item.status} label={contentStatusLabels[item.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="Nada para mostrar aqui." />
      )}
    </Panel>
  );
}
