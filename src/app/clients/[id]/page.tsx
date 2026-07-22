import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getContentItems, getTasks } from "@/lib/data";
import { displayContentPlatform } from "@/lib/content-platform";
import { ClientBadge } from "@/components/client-badge";
import { ClientDetailsSlider } from "@/components/client-details-slider";
import { ClientOperationalControls } from "@/components/client-operational-controls";
import { LinksList } from "@/components/links";
import { getClientVisualToken } from "@/lib/client-visuals";
import { getEffectiveClientStatus } from "@/lib/client-profile";
import {
  clientStatusLabels,
  clientTypeLabels,
  contentStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from "@/lib/labels";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import { canManageClients, requireCurrentOperationalProfile } from "@/lib/auth";
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
  const [profile, client, content, tasks] = await Promise.all([
    requireCurrentOperationalProfile(),
    getClient(id),
    getContentItems({ client: id }),
    getTasks({ client: id }),
  ]);

  if (!client) notFound();

  const canEdit = canManageClients(profile);
  const effectiveStatus = getEffectiveClientStatus(client);
  const openTasks = tasks.filter((task) => !["done", "archived"].includes(task.status));
  const activeContent = content.filter((item) => !["published", "archived"].includes(item.status));
  const services = servicesFor(client);
  const phoneHref = client.contact_phone
    ? `tel:${client.contact_phone.replace(/[^\d+]/g, "")}`
    : undefined;
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
                <Badge value={effectiveStatus} label={clientStatusLabels[effectiveStatus]} />
                <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)]">
                  {clientTypeLabels[client.type]}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--bb-charcoal)] md:text-4xl">
                {client.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--bb-muted)]">
                Informação, recursos e contexto operacional do cliente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryLink href="/clients">Voltar</SecondaryLink>
            {canEdit ? (
              <SecondaryLink href={`/clients/${client.id}/edit`}>Editar cliente</SecondaryLink>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <ContactInfo label="Responsável BlendByte" value={client.owner_name} />
          <ContactInfo
            label="Email da empresa"
            value={client.contact_email}
            href={client.contact_email ? `mailto:${client.contact_email}` : undefined}
          />
          <ContactInfo
            label="Telefone"
            value={client.contact_phone}
            href={phoneHref}
          />
          <ContactInfo label="Pessoa de contacto" value={client.contact_name} />
          <ContactInfo
            label="Website"
            value={client.website_url}
            href={client.website_url ?? undefined}
            external
          />
        </div>

        <ClientDetailsSlider
          items={[
            { label: "Serviços contratados", value: services.join(", ") || "-" },
            { label: "Valor contratado", value: contractValueFor(client) ?? "-" },
            { label: "Início", value: formatDate(client.start_date) },
            { label: "Duração", value: client.contract_duration ?? "-" },
          ]}
        />
      </section>

      <ClientOperationalControls
        client={client}
        tasks={tasks}
        content={content}
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
                  <th className="px-4 py-4 font-extrabold">Responsável</th>
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
          <PanelHeader title="Conteúdos ativos" />
          <SecondaryLink href={newContentHref}>Novo conteúdo</SecondaryLink>
        </div>
        {activeContent.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[820px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Publicação</th>
                  <th className="px-4 py-4 font-extrabold">Plataforma</th>
                  <th className="px-4 py-4 font-extrabold">Formato</th>
                  <th className="px-4 py-4 font-extrabold">Título</th>
                  <th className="px-4 py-4 font-extrabold">Estado</th>
                  <th className="px-4 py-4 font-extrabold">Responsável</th>
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {activeContent.map((item) => (
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
          <EmptyState title="Sem conteúdos ativos para este cliente." />
        )}
      </Panel>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>;
}

function ContactInfo({
  label,
  value,
  href,
  external = false,
}: {
  label: string;
  value: string | null;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[var(--bb-border)] bg-white/42 px-4 py-3">
      <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">{label}</div>
      {href && value ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="mt-1 block truncate text-sm font-bold leading-5 text-[var(--bb-charcoal)] hover:underline"
        >
          {value}
        </a>
      ) : (
        <div className="mt-1 truncate text-sm font-bold leading-5 text-[var(--bb-charcoal)]">
          {value || "-"}
        </div>
      )}
    </div>
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
