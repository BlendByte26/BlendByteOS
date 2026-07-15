import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getContentItems, getTasks } from "@/lib/data";
import { displayContentPlatform } from "@/lib/content-platform";
import {
  createDefaultClientChecklistAction,
  updateClientLinksAction,
  updateClientSetupChecklistAction,
} from "@/lib/actions";
import { ClientBadge } from "@/components/client-badge";
import { ClientOperationalControls } from "@/components/client-operational-controls";
import { LinksList } from "@/components/links";
import { getClientVisualToken } from "@/lib/client-visuals";
import {
  clientStatusLabels,
  clientTypeLabels,
  contentStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from "@/lib/labels";
import { buildContentUrl, buildTasksUrl } from "@/lib/smart-links";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import { Badge, EmptyState, Panel, SecondaryLink, TableWrap } from "@/components/ui";
import type { Client } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function compactDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function servicesFor(client: Client) {
  return client.service_types?.length
    ? client.service_types
    : client.service_type
      ? [client.service_type]
      : [];
}

function contractValueFor(client: Client) {
  if (client.contract_value) return client.contract_value;
  if (!client.monthly_value) return null;

  return `${Number(client.monthly_value).toLocaleString("pt-PT")} €`;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const [client, content, tasks] = await Promise.all([
    getClient(id),
    getContentItems({ client: id }),
    getTasks({ client: id }),
  ]);

  if (!client) notFound();

  const openTasks = tasks.filter((task) => !["done", "archived"].includes(task.status));
  const services = servicesFor(client);
  const newTaskHref = `/tasks/new?client=${encodeURIComponent(client.id)}`;
  const newContentHref = `/content/new?client=${encodeURIComponent(client.id)}`;
  const clientToken = getClientVisualToken({
    clientCode: client.client_code,
    clientName: client.name,
    shortName: client.short_name,
    colorKey: client.color_key,
  });

  return (
    <div className="grid gap-6">
      <section className={`min-w-0 rounded-[24px] border border-l-4 border-[var(--bb-border)] bg-[var(--bb-surface)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.07)] backdrop-blur-xl ${clientToken.borderStrong}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ClientBadge
                  clientId={client.id}
                  clientCode={client.client_code}
                  clientName={client.name}
                  shortName={client.short_name}
                  logoUrl={client.logo_url}
                  colorKey={client.color_key}
                  variant="header"
                />
                <Badge value={client.status} label={clientStatusLabels[client.status]} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--bb-charcoal)] md:text-4xl">
                {client.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--bb-muted)]">
                Perfil operacional com links, setup, tarefas e conteúdos associados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryLink href="/clients">Voltar</SecondaryLink>
            <SecondaryLink href={`/clients/${client.id}/edit`}>Editar cliente</SecondaryLink>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Tipo" value={clientTypeLabels[client.type]} />
          <Info label="Responsável interno" value={client.owner_name ?? "-"} />
          <Info label="Serviços contratados" value={services.join(", ") || "-"} />
          <Info label="Valor contratado" value={contractValueFor(client) ?? "-"} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <OperationalShortcut href={buildContentUrl({ client: client.id })}>
            Conteúdos ativos
          </OperationalShortcut>
          <OperationalShortcut href={buildContentUrl({ client: client.id, status: "ready" })}>
            Prontos a publicar
          </OperationalShortcut>
          <OperationalShortcut href={buildContentUrl({ client: client.id, attention: true })}>
            Atenções
          </OperationalShortcut>
          <OperationalShortcut href={buildTasksUrl({ client: client.id })}>
            Tarefas ativas
          </OperationalShortcut>
          <OperationalShortcut href={buildTasksUrl({ client: client.id, priority: "urgent" })}>
            Tarefas urgentes
          </OperationalShortcut>
        </div>
      </section>

      <ClientOperationalControls
        client={client}
        tasks={tasks}
        content={content}
        updateChecklistAction={updateClientSetupChecklistAction}
        createChecklistAction={createDefaultClientChecklistAction}
        updateLinksAction={updateClientLinksAction}
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-[var(--bb-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <PanelHeader title="Tarefas ativas" />
          <SecondaryLink href={newTaskHref}>Nova tarefa</SecondaryLink>
        </div>
        {openTasks.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[860px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Tarefa</th>
                  <th className="px-4 py-4 font-extrabold">Estado</th>
                  <th className="px-4 py-4 font-extrabold">Prioridade</th>
                  <th className="px-4 py-4 font-extrabold">Owner</th>
                  <th className="px-4 py-4 font-extrabold">Prazo</th>
                  <th className="px-4 py-4 font-extrabold">Link</th>
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {openTasks.map((task) => (
                  <tr key={task.id} className={task.is_blocked ? "bg-[var(--bb-red-soft)]" : ""}>
                    <td className="max-w-[320px] px-5 py-4 font-bold text-[var(--bb-charcoal)]">
                      <span className="bb-line-clamp-2">{getTaskDisplayTitle(task)}</span>
                      {task.is_blocked ? (
                        <div className="mt-1 text-xs font-bold leading-5 text-[#8f2415]">
                          Bloqueado: {task.blocker_reason ?? "Motivo por adicionar"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <Badge value={task.status} label={taskStatusLabels[task.status]} statusKind="task" />
                    </td>
                    <td className="px-4 py-4">
                      <Badge value={task.priority} label={taskPriorityLabels[task.priority]} />
                    </td>
                    <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{task.assignee_name ?? "-"}</td>
                    <td className="px-4 py-4 font-medium text-[var(--bb-muted)] whitespace-nowrap">{formatDate(task.due_date)}</td>
                    <td className="px-4 py-4">
                      {task.links.length ? (
                        <LinksList links={task.links} />
                      ) : task.related_url ? (
                        <LinkPill href={task.related_url} label="Abrir" />
                      ) : (
                        <span className="text-xs font-bold text-[var(--bb-muted)]">-</span>
                      )}
                    </td>
                    <td className="bb-actions-col sticky right-0 px-2 py-4">
                      <Link href={`/tasks/${task.id}/edit`} className="text-sm font-extrabold text-[var(--bb-charcoal)] hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Sem tarefas ativas para este cliente." />
        )}
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-[var(--bb-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <PanelHeader title="Conteúdos" />
          <SecondaryLink href={newContentHref}>Novo conteúdo</SecondaryLink>
        </div>
        {content.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[820px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Publicação</th>
                  <th className="px-4 py-4 font-extrabold">Plataforma</th>
                  <th className="px-4 py-4 font-extrabold">Formato</th>
                  <th className="px-4 py-4 font-extrabold">Título</th>
                  <th className="px-4 py-4 font-extrabold">Estado</th>
                  <th className="px-4 py-4 font-extrabold">Owner</th>
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {content.map((item) => (
                  <tr key={item.id} className={item.is_blocked ? "bg-[var(--bb-red-soft)]" : ""}>
                    <td className="px-5 py-4 font-medium whitespace-nowrap text-[var(--bb-muted)]">{compactDate(item.publish_date)}</td>
                    <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{displayContentPlatform(item.platform)}</td>
                    <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{item.format ?? "-"}</td>
                    <td className="max-w-[320px] px-4 py-4 font-bold text-[var(--bb-charcoal)]">
                      <span className="bb-line-clamp-2">{cleanPrefixedTitle(item.title, item.clients)}</span>
                      {item.is_blocked ? (
                        <div className="mt-1 text-xs font-bold leading-5 text-[#8f2415]">
                          Bloqueado: {item.blocker_reason ?? "Motivo por adicionar"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <Badge value={item.status} label={contentStatusLabels[item.status]} statusKind="content" />
                    </td>
                    <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{item.assignee_name ?? "-"}</td>
                    <td className="bb-actions-col sticky right-0 px-2 py-4">
                      <Link href={`/content/${item.id}/edit`} className="text-sm font-extrabold text-[var(--bb-charcoal)] hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Sem conteúdos associados a este cliente." />
        )}
      </Panel>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[var(--bb-border)] bg-white/42 px-4 py-3">
      <div className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{label}</div>
      <div className="mt-1 min-w-0 text-sm font-bold leading-5 text-[var(--bb-charcoal)]">
        {value}
      </div>
    </div>
  );
}

function OperationalShortcut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/58 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
    >
      {children}
    </Link>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-8 max-w-full items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition hover:border-[rgba(83,183,223,0.44)] hover:bg-[var(--bb-primary-soft)]"
    >
      <span className="truncate">{label}</span>
    </a>
  );
}
