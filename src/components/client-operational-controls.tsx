import Link from "next/link";
import { clientLinkGroups, type ClientLinkGroup } from "@/lib/client-profile";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import { EmptyState, Panel } from "@/components/ui";
import type { Client, ContentItem, Task } from "@/lib/types";

type VisibleLinkGroup = ClientLinkGroup & {
  links: Array<{ label: string; href: string }>;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function visibleLinkGroups(client: Client): VisibleLinkGroup[] {
  return clientLinkGroups
    .map((group) => ({
      ...group,
      links: group.fields
        .map((field) => ({ label: field.label, href: textValue(client[field.key]) }))
        .filter((link) => Boolean(link.href)),
    }))
    .filter((group) => group.links.length > 0);
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

export function ClientOperationalControls({
  client,
  tasks,
  content,
}: {
  client: Client;
  tasks: Task[];
  content: ContentItem[];
}) {
  const linkGroups = visibleLinkGroups(client);
  const blockers = [
    ...tasks
      .filter((task) => task.is_blocked)
      .map((task) => ({
        id: task.id,
        type: "Tarefa",
        title: getTaskDisplayTitle(task),
        reason: task.blocker_reason ?? "Motivo por adicionar",
        owner: task.assignee_name ?? "Sem responsável",
        date: task.due_date,
        href: `/tasks/${task.id}/edit`,
      })),
    ...content
      .filter((item) => item.is_blocked)
      .map((item) => ({
        id: item.id,
        type: "Conteúdo",
        title: cleanPrefixedTitle(item.title, item.clients),
        reason: item.blocker_reason ?? "Motivo por adicionar",
        owner: item.assignee_name ?? "Sem responsável",
        date: item.publish_date,
        href: `/content/${item.id}/edit`,
      })),
  ];
  const visibleBlockers = blockers.slice(0, 5);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel className="p-5">
          <PanelHeader title="Links e recursos" />
          {linkGroups.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {linkGroups.map((group) => (
                <QuickLinkGroup key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <EmptyState title="Ainda não há links preenchidos para este cliente." />
          )}
        </Panel>

        <Panel className="p-5">
          <PanelHeader title="Notas" />
          {client.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--bb-charcoal)]">
              {client.notes}
            </p>
          ) : (
            <EmptyState title="Sem notas sobre este cliente." />
          )}
        </Panel>
      </div>

      <Panel className="p-5">
        <div className="flex items-center justify-between gap-3">
          <PanelHeader title="Bloqueios" />
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-[var(--bb-muted)] ring-1 ring-[var(--bb-border)]">
            {blockers.length}
          </span>
        </div>
        {visibleBlockers.length ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {visibleBlockers.map((blocker) => (
              <Link
                key={`${blocker.type}-${blocker.id}`}
                href={blocker.href}
                className="rounded-[16px] border border-[rgba(232,76,49,0.18)] bg-[var(--bb-red-soft)] px-4 py-3 transition hover:bg-[rgba(232,76,49,0.2)]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#8f2415]">
                  <span>{blocker.type}</span>
                  <span>·</span>
                  <span>{formatDate(blocker.date)}</span>
                  <span>·</span>
                  <span>{blocker.owner}</span>
                </div>
                <div className="bb-line-clamp-2 mt-1 text-sm font-extrabold text-[var(--bb-charcoal)]">
                  {blocker.title}
                </div>
                <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[#8f2415]">
                  {blocker.reason}
                </div>
              </Link>
            ))}
            {blockers.length > visibleBlockers.length ? (
              <div className="rounded-full bg-white/55 px-3 py-2 text-xs font-extrabold text-[var(--bb-muted)]">
                +{blockers.length - visibleBlockers.length} bloqueios
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[var(--bb-muted)]">
            Sem bloqueios neste cliente.
          </p>
        )}
      </Panel>
    </>
  );
}

function PanelHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>;
}

function QuickLinkGroup({ group }: { group: VisibleLinkGroup }) {
  return (
    <div className="rounded-[18px] border border-[var(--bb-border)] bg-white/42 p-4">
      <h3 className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{group.title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.links.map((link) => (
          <a
            key={`${group.id}-${link.label}`}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 max-w-full items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition hover:border-[rgba(83,183,223,0.44)] hover:bg-[var(--bb-primary-soft)]"
          >
            <span className="truncate">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
