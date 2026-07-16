import Link from "next/link";
import { cookies } from "next/headers";
import { ClientBadge } from "@/components/client-badge";
import { QuickTodosPanel } from "@/components/quick-todos";
import { Badge, ExternalLink, Panel } from "@/components/ui";
import { APP_ACCESS_VIEW_COOKIE, isAppAccessView } from "@/lib/app-access";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { getClientVisualToken } from "@/lib/client-visuals";
import {
  getClients,
  getContentItems,
  getInvest2030Requests,
  getMentionedContentComments,
  getQuickNotes,
  getQuickTodos,
  getTasks,
} from "@/lib/data";
import {
  contentStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from "@/lib/labels";
import { buildContentUrl, buildTasksUrl } from "@/lib/smart-links";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { Client, ContentItem, ContentMention, Invest2030Request, Task } from "@/lib/types";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DashboardView = "marketing" | "design";
type DashboardMetric = {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "blocked" | "warning";
};
type DashboardItem = {
  key: string;
  source: "task" | "content";
  task?: Task;
  content?: ContentItem;
  chip: "Tarefa" | "Conteúdo" | "Atenção" | "Pronto";
  date: string | null;
  href: string;
  actionLabel: string;
  note?: string;
  sort: {
    urgent: boolean;
    attention: boolean;
    ready: boolean;
  };
};

const activeContentStatuses = ["pending", "in_progress", "ready_to_publish"];
const activeTaskStatuses = ["pending", "in_progress"];
const prepareContentStatuses = ["pending", "in_progress"];
const priorityOrder = { urgent: 0, normal: 1, low: 2 };
const QUEUE_LIMIT = 5;

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseView(value: string | undefined, preferredView: string | undefined): DashboardView {
  if (isAppAccessView(value)) return value;
  if (isAppAccessView(preferredView)) return preferredView;
  return "marketing";
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ownerMatches(value: string | null | undefined, owner: string) {
  if (!owner) return true;
  const source = normalize(value);
  const target = normalize(owner);
  return Boolean(source && (source === target || source.includes(target) || target.includes(source)));
}

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

function compactDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function excerpt(value: string, maxLength = 110) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function sortByDate(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeekRange() {
  const today = new Date();
  const start = new Date(today);
  const day = (today.getDay() + 6) % 7;
  start.setDate(today.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: localDateString(start),
    end: localDateString(end),
  };
}

function isThisWeek(value: string | null) {
  if (!value) return false;
  const week = currentWeekRange();
  return value >= week.start && value <= week.end;
}

function clientFor(item: Pick<Task | ContentItem, "client_id">, clientsById: Map<string, Client>) {
  return item.client_id ? clientsById.get(item.client_id) ?? null : null;
}

function isActiveTask(task: Task) {
  return activeTaskStatuses.includes(task.status);
}

function isActiveContent(item: ContentItem) {
  return activeContentStatuses.includes(item.status);
}

function hasAnyWord(value: string, words: string[]) {
  const source = normalize(value);
  return words.some((word) => source.includes(normalize(word)));
}

function taskSearchText(task: Task) {
  return [
    task.title,
    task.type,
    task.notes,
    task.related_url,
    ...task.links.flatMap((link) => [link.label, link.url]),
  ]
    .filter(Boolean)
    .join(" ");
}

function contentSearchText(item: ContentItem) {
  return [
    item.title,
    item.format,
    item.platform,
    item.creative_brief,
    item.copy_text,
    item.description,
    item.notes,
    item.design_status,
    item.media_url,
    item.figma_url,
    item.internal_review_notes,
    item.client_feedback,
    item.blocker_reason,
  ]
    .filter(Boolean)
    .join(" ");
}

function isDesignTask(task: Task) {
  return (
    task.type === "design" ||
    hasAnyWord(taskSearchText(task), [
      "design",
      "criativo",
      "criativos",
      "branding",
      "website",
      "landing",
      "apresentação",
      "apresentacao",
      "figma",
    ])
  );
}

function needsDesignWork(item: ContentItem) {
  const designState = normalize(item.design_status);
  const hasOpenDesignState = Boolean(
    designState &&
      !["feito", "done", "concluido", "concluído", "aprovado", "approved"].some((state) =>
        designState.includes(state),
      ),
  );

  return (
    (item.needs_design && prepareContentStatuses.includes(item.status)) ||
    hasOpenDesignState ||
    hasAnyWord(contentSearchText(item), ["design", "criativo", "figma"])
  );
}

function contentMissingFields(item: ContentItem) {
  const missing: string[] = [];
  if (!item.platform?.trim()) missing.push("plataforma");
  if (!item.format?.trim()) missing.push("formato");
  if (!item.assignee_name?.trim()) missing.push("owner");
  if (["pending", "in_progress", "ready_to_publish"].includes(item.status)) {
    if (!item.creative_brief?.trim() && !item.brief_url?.trim()) missing.push("briefing");
    if (!item.copy_text?.trim()) missing.push("copy");
  }
  return missing;
}

function attentionLabel(item: ContentItem) {
  if (item.is_blocked) return item.blocker_reason ?? "Bloqueio";
  const missing = contentMissingFields(item);
  if (missing.length) return missing.join(", ");
  return "Atenção";
}

function isDesignAttention(item: ContentItem) {
  return (
    item.is_blocked ||
    hasAnyWord(contentSearchText(item), [
      "asset",
      "assets",
      "imagem",
      "imagens",
      "visual",
      "design",
      "figma",
      "criativo",
      "aprovação visual",
      "aprovacao visual",
    ])
  );
}

function contentActionDate(item: ContentItem) {
  return item.publish_date ?? item.publishing_due_date ?? item.approval_due_date ?? item.design_due_date;
}

function designActionDate(item: ContentItem) {
  return item.design_due_date ?? item.approval_due_date ?? item.publish_date ?? item.publishing_due_date;
}

function sortDashboardTasks(a: Task, b: Task) {
  return priorityOrder[a.priority] - priorityOrder[b.priority] || sortByDate(a.due_date, b.due_date);
}

function sortDashboardItems(a: DashboardItem, b: DashboardItem) {
  if (a.sort.urgent !== b.sort.urgent) return a.sort.urgent ? -1 : 1;
  const dateSort = sortByDate(a.date, b.date);
  if (dateSort !== 0) return dateSort;
  if (a.sort.attention !== b.sort.attention) return a.sort.attention ? -1 : 1;
  if (a.sort.ready !== b.sort.ready) return a.sort.ready ? -1 : 1;
  return a.key.localeCompare(b.key);
}

function taskDashboardItem(task: Task, chip: DashboardItem["chip"] = "Tarefa"): DashboardItem {
  const href =
    task.priority === "urgent"
      ? buildTasksUrl({ client: task.client_id, priority: "urgent" })
      : isThisWeek(task.due_date)
        ? buildTasksUrl({ view: "week", client: task.client_id })
        : buildTasksUrl({ client: task.client_id });

  return {
    key: `task-${task.id}`,
    source: "task",
    task,
    chip,
    date: task.due_date,
    href,
    actionLabel: "Ver em Tarefas",
    note: task.is_blocked ? task.blocker_reason ?? "Precisa de atenção" : undefined,
    sort: {
      urgent: task.priority === "urgent",
      attention: task.is_blocked,
      ready: false,
    },
  };
}

function contentDashboardItem(
  item: ContentItem,
  chip: DashboardItem["chip"] = "Conteúdo",
  note?: string,
  date = contentActionDate(item),
): DashboardItem {
  const attention = chip === "Atenção" || item.is_blocked;

  return {
    key: `content-${item.id}`,
    source: "content",
    content: item,
    chip,
    date,
    href: buildContentUrl({
      client: item.client_id,
      status: item.status,
      attention,
    }),
    actionLabel: "Ver em Conteúdos",
    note,
    sort: {
      urgent: false,
      attention,
      ready: chip === "Pronto" || item.status === "ready_to_publish",
    },
  };
}

function firstByDate<T>(items: T[], dateOf: (item: T) => string | null) {
  return [...items].sort((a, b) => sortByDate(dateOf(a), dateOf(b)))[0] ?? null;
}

function uniqueDashboardItems(items: DashboardItem[]) {
  return Array.from(new Map(items.map((item) => [item.key, item])).values());
}

function isInvest2030Client(client: Client | null) {
  if (!client) return false;
  return hasAnyWord(
    [client.name, client.client_code, client.short_name].filter(Boolean).join(" "),
    ["invest2030", "invest 2030", "i2030"],
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const currentProfile = await requireCurrentOperationalProfile();
  const currentView = parseView(
    valueOf(params, "view"),
    cookieStore.get(APP_ACCESS_VIEW_COOKIE)?.value ?? currentProfile.defaultView,
  );
  const [clients, content, tasks, invest2030Requests] = await Promise.all([
    getClients(),
    getContentItems(),
    getTasks(),
    getInvest2030Requests(),
  ]);
  const [quickTodos, quickNotes, mentionedComments] = await Promise.all([
    getQuickTodos(currentView, currentProfile.key),
    getQuickNotes(currentView, currentProfile.key),
    getMentionedContentComments(currentProfile.key, 5),
  ]);
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const activeTasks = tasks.filter(isActiveTask);
  const activeContent = content.filter(isActiveContent);
  const attentionContent = activeContent.filter(
    (item) => item.is_blocked || contentMissingFields(item).length > 0,
  );
  const readyContent = activeContent.filter((item) => item.status === "ready_to_publish");
  const designContent = activeContent.filter((item) => item.status === "in_progress" || needsDesignWork(item));
  const designTasks = activeTasks.filter(isDesignTask);
  const designAttention = designContent.filter(isDesignAttention);
  const readyForValidation = readyContent.filter(
    (item) =>
      item.needs_design ||
      Boolean(item.design_status?.trim()) ||
      Boolean(item.figma_url?.trim()) ||
      ownerMatches(item.assignee_name, "design"),
  );
  const marketingMetrics: DashboardMetric[] = [
    {
      label: "Atenções",
      value: attentionContent.length,
      href: buildContentUrl({ attention: true }),
      tone: attentionContent.length ? "warning" : "default",
    },
    {
      label: "Prontos a publicar",
      value: readyContent.length,
      href: buildContentUrl({ status: "ready" }),
    },
    {
      label: "Tarefas urgentes",
      value: activeTasks.filter((task) => task.priority === "urgent").length,
      href: buildTasksUrl({ priority: "urgent" }),
      tone: activeTasks.some((task) => task.priority === "urgent") ? "warning" : "default",
    },
    {
      label: "Pendentes",
      value: activeContent.filter((item) => item.status === "pending").length,
      href: buildContentUrl({ status: "pending" }),
    },
    {
      label: "Em design",
      value: activeContent.filter((item) => item.status === "in_progress").length,
      href: buildContentUrl({ status: "design" }),
    },
  ];
  const designMetrics: DashboardMetric[] = [
    { label: "Em design", value: designContent.length },
    {
      label: "Atenções de design",
      value: designAttention.length,
      tone: designAttention.length ? "warning" : "default",
    },
    { label: "Prontos para validar", value: readyForValidation.length },
    { label: "Tarefas de design", value: designTasks.length },
    {
      label: "Próximos prazos",
      value:
        designContent.filter((item) => isThisWeek(designActionDate(item))).length +
        designTasks.filter((task) => isThisWeek(task.due_date)).length,
    },
  ];

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {(currentView === "design" ? designMetrics : marketingMetrics).map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>

      <QuickTodosPanel
        view={currentView}
        profile={currentProfile}
        todos={quickTodos}
        notes={quickNotes}
      />

      <MentionsPanel mentions={mentionedComments} />

      {currentView === "design" ? (
        <DesignView
          clientsById={clientsById}
          designAttention={designAttention}
          designContent={designContent}
          designTasks={designTasks}
          readyForValidation={readyForValidation}
        />
      ) : (
        <MarketingManagementView
          activeContent={activeContent}
          activeTasks={activeTasks}
          attentionContent={attentionContent}
          clients={clients}
          clientsById={clientsById}
          invest2030Requests={invest2030Requests}
          readyContent={readyContent}
        />
      )}
    </>
  );
}

function MentionsPanel({ mentions }: { mentions: ContentMention[] }) {
  return (
    <div className="mt-3">
      <DashboardBlock title="Menções">
        {mentions.length ? (
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-5">
            {mentions.map((mention) => {
              const content = mention.content_items;
              const client = content?.clients ?? null;
              const clientToken = getClientVisualToken({
                clientCode: client?.client_code,
                clientName: client?.name,
                shortName: client?.short_name,
                colorKey: client?.color_key,
              });
              const title = content ? cleanPrefixedTitle(content.title, client) : "Conteúdo";

              return (
                <div
                  key={mention.id}
                  className={`rounded-[14px] border border-l-4 border-[var(--bb-border)] bg-white/58 px-3 py-2 ${clientToken.borderStrong}`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold text-[var(--bb-muted)]">
                    <span className="text-[var(--bb-charcoal)]">{mention.author_name}</span>
                    <span>·</span>
                    <span>{compactDateTime(mention.created_at)}</span>
                  </div>
                  <p className="bb-line-clamp-2 text-sm font-bold leading-5 text-[var(--bb-charcoal)]">
                    {excerpt(mention.body)}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs font-bold text-[var(--bb-muted)]">
                    <span className="bb-line-clamp-1">{title}</span>
                    {client ? (
                      <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 ${clientToken.bg} ${clientToken.text}`}>
                        {client.short_name ?? client.client_code ?? client.name}
                      </span>
                    ) : null}
                  </div>
                  {content ? (
                    <div className="mt-2">
                      <ActionLink href={`/content/${content.id}/edit`} label="Abrir" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <CompactEmpty title="Sem menções por agora." />
        )}
      </DashboardBlock>
    </div>
  );
}

function MarketingManagementView({
  activeContent,
  activeTasks,
  attentionContent,
  clients,
  clientsById,
  invest2030Requests,
  readyContent,
}: {
  activeContent: ContentItem[];
  activeTasks: Task[];
  attentionContent: ContentItem[];
  clients: Client[];
  clientsById: Map<string, Client>;
  invest2030Requests: Invest2030Request[];
  readyContent: ContentItem[];
}) {
  const urgentTasks = activeTasks.filter((task) => task.priority === "urgent").sort(sortDashboardTasks);
  const todayTasks = activeTasks
    .filter((task) => task.due_date === localDateString(new Date()))
    .sort(sortDashboardTasks);
  const nextTask = urgentTasks[0] ?? todayTasks[0] ?? null;
  const nextPriority =
    nextTask ? taskDashboardItem(nextTask) :
      firstByDate(attentionContent, contentActionDate)
        ? contentDashboardItem(firstByDate(attentionContent, contentActionDate)!, "Atenção", attentionLabel(firstByDate(attentionContent, contentActionDate)!))
        : firstByDate(readyContent, contentActionDate)
          ? contentDashboardItem(firstByDate(readyContent, contentActionDate)!, "Pronto")
          : null;
  const weekTasks = activeTasks.filter((task) => task.priority === "urgent" || isThisWeek(task.due_date));
  const actionQueue = uniqueDashboardItems([
    ...urgentTasks.map((task) => taskDashboardItem(task)),
    ...weekTasks.map((task) => taskDashboardItem(task)),
    ...attentionContent.map((item) => contentDashboardItem(item, "Atenção", attentionLabel(item))),
    ...readyContent.map((item) => contentDashboardItem(item, "Pronto")),
  ])
    .sort(sortDashboardItems)
    .slice(0, QUEUE_LIMIT);
  const investClientIds = new Set(
    Array.from(clientsById.values())
      .filter(isInvest2030Client)
      .map((client) => client.id),
  );
  const investClientId = Array.from(investClientIds)[0] ?? null;
  const investContent = activeContent.filter((item) => investClientIds.has(item.client_id));
  const investTasks = activeTasks.filter((task) => task.client_id && investClientIds.has(task.client_id));
  const openInvestRequests = invest2030Requests
    .filter((request) => !request.tasks || !["done", "archived"].includes(request.tasks.status))
    .slice(0, 5);
  const hasInvestData = investContent.length > 0 || investTasks.length > 0 || openInvestRequests.length > 0;
  const investAttention = investContent.filter((item) => item.is_blocked || contentMissingFields(item).length > 0);
  const investReady = investContent.filter((item) => item.status === "ready_to_publish");
  const investNext = uniqueDashboardItems([
    ...investTasks.map((task) => taskDashboardItem(task)),
    ...investAttention.map((item) => contentDashboardItem(item, "Atenção", attentionLabel(item))),
    ...investReady.map((item) => contentDashboardItem(item, "Pronto")),
    ...investContent.map((item) => contentDashboardItem(item)),
  ]).sort(sortDashboardItems)[0] ?? null;
  const contentWithoutOwner = activeContent.filter((item) => !item.assignee_name?.trim());
  const setupClients = clients.filter((client) => client.status === "setup");
  const alerts = [
    contentWithoutOwner.length
      ? {
          title: "Conteúdos sem owner",
          detail: `${contentWithoutOwner.length} por atribuir`,
          href: buildContentUrl({ attention: true }),
        }
      : null,
    setupClients.length
      ? {
          title: "Clientes em setup",
          detail: `${setupClients.length} a completar`,
          href: "/clients",
        }
      : null,
    urgentTasks.length
      ? {
          title: "Tarefas urgentes",
          detail: `${urgentTasks.length} ativas`,
          href: buildTasksUrl({ priority: "urgent" }),
        }
      : null,
    attentionContent.length
      ? {
          title: "Conteúdos com atenção",
          detail: `${attentionContent.length} a resolver`,
          href: buildContentUrl({ attention: true }),
        }
      : null,
    readyContent.length
      ? {
          title: "Prontos por publicar",
          detail: `${readyContent.length} para agendar/publicar`,
          href: buildContentUrl({ status: "ready" }),
        }
      : null,
  ].filter(Boolean).slice(0, QUEUE_LIMIT) as Array<{ title: string; detail: string; href: string }>;

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
      <DashboardBlock title="Próxima prioridade" className="xl:col-span-2">
        {nextPriority ? (
          <PriorityCard item={nextPriority} clientsById={clientsById} actionLabel="Abrir" />
        ) : (
          <CompactEmpty title="Sem prioridades imediatas." />
        )}
      </DashboardBlock>

      <DashboardBlock title="Fila de ação" action={<SmallLink href={actionQueue.some((item) => item.source === "task") ? buildTasksUrl() : buildContentUrl()}>Ver todos</SmallLink>}>
        {actionQueue.length ? (
          <div className="grid gap-1.5">
            {actionQueue.map((item) => (
              <QueueItem key={item.key} item={item} clientsById={clientsById} />
            ))}
          </div>
        ) : (
          <CompactEmpty title="Sem ações pendentes." />
        )}
      </DashboardBlock>

      <DashboardBlock
        title="Pedidos Invest2030"
        action={<SmallLink href={buildTasksUrl({ client: investClientId })}>Ver tarefas</SmallLink>}
      >
        {hasInvestData ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <MiniStat label="Pedidos" value={openInvestRequests.length} tone={openInvestRequests.some((request) => request.tasks?.is_blocked || request.information_status !== "Informação completa") ? "warning" : "default"} />
              <MiniStat label="Conteúdos" value={investContent.length} href={buildContentUrl({ client: investClientId })} />
              <MiniStat label="Atenções" value={investAttention.length} href={buildContentUrl({ client: investClientId, attention: true })} tone={investAttention.length ? "warning" : "default"} />
              <MiniStat label="Tarefas" value={investTasks.length} href={buildTasksUrl({ client: investClientId })} />
            </div>
            {openInvestRequests.length ? (
              <div className="grid gap-1.5">
                {openInvestRequests.map((request) => (
                  <Invest2030RequestMiniItem key={request.id} request={request} />
                ))}
              </div>
            ) : investNext ? (
              <QueueItem item={investNext} clientsById={clientsById} />
            ) : (
              <CompactEmpty title="Sem próxima ação Invest2030." />
            )}
          </div>
        ) : (
          <CompactEmpty title="Sem pedidos Invest2030 em aberto." />
        )}
      </DashboardBlock>

      <DashboardBlock title="Alertas operacionais" className="xl:col-span-2">
        {alerts.length ? (
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-5">
            {alerts.map((alert) => (
              <Link
                key={alert.title}
                href={alert.href}
                className="rounded-[14px] border border-[var(--bb-border)] bg-white/58 px-3 py-2 transition hover:bg-white/82"
              >
                <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{alert.title}</div>
                <div className="mt-0.5 text-xs font-bold text-[var(--bb-muted)]">{alert.detail}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-[var(--bb-border)] bg-white/46 px-3 py-2 text-sm font-bold text-[var(--bb-muted)]">
            Operação sem alertas críticos.
          </div>
        )}
      </DashboardBlock>
    </div>
  );
}

function DesignView({
  clientsById,
  designAttention,
  designContent,
  designTasks,
  readyForValidation,
}: {
  clientsById: Map<string, Client>;
  designAttention: ContentItem[];
  designContent: ContentItem[];
  designTasks: Task[];
  readyForValidation: ContentItem[];
}) {
  const sortedDesignContent = [...designContent].sort((a, b) => sortByDate(designActionDate(a), designActionDate(b)));
  const sortedDesignTasks = [...designTasks].sort(sortDashboardTasks);
  const nextDesignContent = sortedDesignContent.find((item) => item.status === "in_progress") ?? null;
  const nextAttention = firstByDate(designAttention, designActionDate);
  const nextDesignTask = sortedDesignTasks[0] ?? null;
  const nextWork =
    nextDesignContent ? contentDashboardItem(nextDesignContent, "Conteúdo", undefined, designActionDate(nextDesignContent)) :
      nextAttention ? contentDashboardItem(nextAttention, "Atenção", attentionLabel(nextAttention), designActionDate(nextAttention)) :
        nextDesignTask ? taskDashboardItem(nextDesignTask) :
          null;
  const designByClient = Array.from(
    designContent.reduce((map, item) => {
      const client = clientFor(item, clientsById);
      const key = client?.id ?? "sem-cliente";
      const current = map.get(key) ?? { client, count: 0 };
      map.set(key, { client, count: current.count + 1 });
      return map;
    }, new Map<string, { client: Client | null; count: number }>()),
  )
    .map(([, row]) => row)
    .sort((a, b) => b.count - a.count)
    .slice(0, QUEUE_LIMIT);
  const maxDesignCount = Math.max(...designByClient.map((row) => row.count), 1);
  const designQueue = uniqueDashboardItems([
    ...sortedDesignContent.map((item) => contentDashboardItem(item, "Conteúdo", undefined, designActionDate(item))),
    ...designAttention.map((item) => contentDashboardItem(item, "Atenção", attentionLabel(item), designActionDate(item))),
    ...sortedDesignTasks.map((task) => taskDashboardItem(task)),
  ])
    .sort(sortDashboardItems)
    .slice(0, QUEUE_LIMIT);
  const validationItems = [...readyForValidation]
    .sort((a, b) => sortByDate(contentActionDate(a), contentActionDate(b)))
    .slice(0, 3);

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
      <DashboardBlock title="Próximo trabalho de design" className="xl:col-span-2">
        {nextWork ? (
          <PriorityCard item={nextWork} clientsById={clientsById} actionLabel="Abrir" showQuickLinks />
        ) : (
          <CompactEmpty title="Sem trabalho de design imediato." />
        )}
      </DashboardBlock>

      <DashboardBlock title="Carga de design por cliente">
        {designByClient.length ? (
          <div className="grid gap-2">
            {designByClient.map((row) => (
              <div key={row.client?.id ?? "sem-cliente"} className="rounded-[14px] border border-[var(--bb-border)] bg-white/52 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <ClientLink client={row.client} />
                  <span className="text-sm font-extrabold text-[var(--bb-charcoal)]">{row.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-[var(--bb-primary)]"
                    style={{ width: `${Math.max(12, Math.round((row.count / maxDesignCount) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmpty title="Sem conteúdos em design por cliente." />
        )}
      </DashboardBlock>

      <DashboardBlock title="Fila de design" action={<SmallLink href="/content">Ver todos</SmallLink>}>
        {designQueue.length ? (
          <div className="grid gap-1.5">
            {designQueue.map((item) => (
              <QueueItem key={item.key} item={item} clientsById={clientsById} showQuickLinks />
            ))}
          </div>
        ) : (
          <CompactEmpty title="Sem fila de design." />
        )}
      </DashboardBlock>

      <DashboardBlock title="Prontos para validar" className="xl:col-span-2">
        {validationItems.length ? (
          <div className="grid gap-1.5 md:grid-cols-3">
            {validationItems.map((item) => (
              <ContentCard key={item.id} item={item} clientsById={clientsById} compact showQuickLinks />
            ))}
          </div>
        ) : (
          <CompactEmpty title="Sem conteúdos prontos para validar." />
        )}
      </DashboardBlock>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "blocked" | "warning";
}) {
  const barClass =
    tone === "blocked"
      ? "bg-[var(--bb-red)] shadow-[0_0_24px_rgba(232,76,49,0.28)]"
      : tone === "warning"
        ? "bg-[var(--bb-orange)] shadow-[0_0_24px_rgba(254,112,35,0.28)]"
        : "bg-[var(--bb-primary)] shadow-[0_0_24px_rgba(83,183,223,0.45)]";

  const content = (
    <Panel className={`relative overflow-hidden px-4 py-3 ${href ? "cursor-pointer" : ""}`}>
      <div className={`mb-3 h-1.5 w-8 rounded-full ${barClass}`} />
      <div className="text-xs font-bold text-[var(--bb-muted)]">{label}</div>
      <div className="mt-0.5 text-3xl font-extrabold tracking-tight text-[var(--bb-charcoal)]">{value}</div>
    </Panel>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={`Abrir ${label}`} title={`Abrir ${label}`} className="block">
      {content}
    </Link>
  );
}

function DashboardBlock({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`p-3.5 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Panel>
  );
}

function CompactEmpty({ title }: { title: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--bb-border)] bg-white/38 px-3 py-2 text-sm font-bold text-[var(--bb-muted)]">
      {title}
    </div>
  );
}

function Invest2030RequestMiniItem({ request }: { request: Invest2030Request }) {
  const needsAttention = request.tasks?.is_blocked || request.information_status !== "Informação completa";

  return (
    <div className="rounded-[14px] border border-[var(--bb-border)] bg-white/58 px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
            {request.campaign_name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--bb-muted)]">
            <span>{request.period_label}</span>
            <span>·</span>
            <span>{request.requested_by}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {request.tasks ? <Badge value={request.tasks.status} label={taskStatusLabels[request.tasks.status]} statusKind="task" /> : null}
          {needsAttention ? <Badge value="blocked" label="Atenção" /> : null}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--bb-muted)]">
        <span>{request.action_type}</span>
        <ActionLink href={request.task_id ? `/tasks/${request.task_id}/edit` : "/invest2030/pedidos"} label="Abrir" />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "warning";
}) {
  const className = `rounded-[14px] border px-3 py-2 transition ${tone === "warning" ? "border-[rgba(254,112,35,0.32)] bg-[var(--bb-orange-soft)]" : "border-[var(--bb-border)] bg-white/52"} ${href ? "hover:bg-white/82" : ""}`;
  const content = (
    <div className={className}>
      <div className="text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">{label}</div>
      <div className="text-xl font-extrabold text-[var(--bb-charcoal)]">{value}</div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={`Abrir Invest2030 ${label}`} title={`Abrir Invest2030 ${label}`}>
      {content}
    </Link>
  );
}

function SmallLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
    >
      {children}
    </Link>
  );
}

function ClientLink({
  client,
}: {
  client: Pick<Client, "id" | "name" | "client_code" | "short_name" | "logo_url" | "color_key"> | null;
}) {
  if (!client) return <span>-</span>;

  return (
    <ClientBadge
      clientId={client.id}
      clientCode={client.client_code}
      clientName={client.name}
      shortName={client.short_name}
      logoUrl={client.logo_url}
      colorKey={client.color_key}
      href={`/clients/${client.id}`}
      variant="pill"
      className="max-w-[220px]"
    />
  );
}

function ActionLink({ href, label = "Editar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
    >
      {label}
    </Link>
  );
}

function DesignQuickLinks({ client }: { client: Client | null }) {
  if (!client) return null;
  const figma = client.figma_project_url ?? client.figma_url;
  const drive = client.google_drive_url ?? client.drive_url ?? client.onedrive_url;

  if (!figma && !drive) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <ExternalLink href={figma} label="Figma" />
      <ExternalLink href={drive} label="Drive" />
    </div>
  );
}

function PriorityCard({
  item,
  clientsById,
  actionLabel,
  showQuickLinks = false,
}: {
  item: DashboardItem;
  clientsById: Map<string, Client>;
  actionLabel: string;
  showQuickLinks?: boolean;
}) {
  if (item.source === "task" && item.task) {
    return <TaskCard task={item.task} clientsById={clientsById} note={item.note} actionLabel={actionLabel} actionHref={item.href} showQuickLinks={showQuickLinks} />;
  }

  if (item.content) {
    return <ContentCard item={item.content} clientsById={clientsById} note={item.note} actionLabel={actionLabel} actionHref={item.href} showQuickLinks={showQuickLinks} />;
  }

  return null;
}

function QueueItem({
  item,
  clientsById,
  showQuickLinks = false,
}: {
  item: DashboardItem;
  clientsById: Map<string, Client>;
  showQuickLinks?: boolean;
}) {
  const entity = item.source === "task" ? item.task : item.content;
  if (!entity) return null;
  const client = clientFor(entity, clientsById);
  const title =
    item.source === "task" && item.task
      ? getTaskDisplayTitle(item.task)
      : item.content
        ? cleanPrefixedTitle(item.content.title, item.content.clients)
        : "";
  const statusBadge =
    item.source === "task" && item.task ? (
      <>
        <Badge value={item.task.status} label={taskStatusLabels[item.task.status]} statusKind="task" />
        <Badge value={item.task.priority} label={taskPriorityLabels[item.task.priority]} />
      </>
    ) : item.content ? (
      <Badge value={item.content.status} label={contentStatusLabels[item.content.status]} statusKind="content" />
    ) : null;
  const clientToken = getClientVisualToken({
    clientCode: client?.client_code,
    clientName: client?.name,
    shortName: client?.short_name,
    colorKey: client?.color_key,
  });

  return (
    <div className={`rounded-[14px] border border-l-4 border-[var(--bb-border)] bg-white/58 px-3 py-2 ${clientToken.borderStrong}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--bb-muted)]">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-extrabold text-[var(--bb-charcoal)] ring-1 ring-inset ring-[var(--bb-border)]">
              {item.chip}
            </span>
            <ClientLink client={client} />
            <span>·</span>
            <span>{formatDate(item.date)}</span>
          </div>
          <div className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
            {title}
          </div>
          {item.note ? (
            <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[var(--bb-muted)]">
              Atenção: {item.note}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">{statusBadge}</div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--bb-muted)]">
        <span>Owner: {entity.assignee_name ?? "-"}</span>
        <ActionLink href={item.href} label={item.actionLabel} />
      </div>
      {showQuickLinks ? <DesignQuickLinks client={client} /> : null}
    </div>
  );
}

function TaskCard({
  task,
  clientsById,
  compact = false,
  showQuickLinks = false,
  note,
  actionLabel = "Editar",
  actionHref,
}: {
  task: Task;
  clientsById: Map<string, Client>;
  compact?: boolean;
  showQuickLinks?: boolean;
  note?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const client = clientFor(task, clientsById);
  const clientToken = getClientVisualToken({
    clientCode: client?.client_code,
    clientName: client?.name,
    shortName: client?.short_name,
    colorKey: client?.color_key,
  });

  return (
    <div className={`rounded-[14px] border border-l-4 border-[var(--bb-border)] bg-white/58 px-3 ${clientToken.borderStrong} ${compact ? "py-2" : "py-2.5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--bb-muted)]">
            <span>Tarefa</span>
            <span>·</span>
            <ClientLink client={client} />
            <span>·</span>
            <span>{formatDate(task.due_date)}</span>
          </div>
          <div className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
            {getTaskDisplayTitle(task)}
          </div>
          {task.is_blocked || note ? (
            <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[var(--bb-muted)]">
              Atenção: {note ?? task.blocker_reason ?? "Nota por adicionar"}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <Badge value={task.status} label={taskStatusLabels[task.status]} statusKind="task" />
          <Badge value={task.priority} label={taskPriorityLabels[task.priority]} />
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--bb-muted)]">
        <span>Responsável: {task.assignee_name ?? "-"}</span>
        <ActionLink href={actionHref ?? `/tasks/${task.id}/edit`} label={actionLabel} />
      </div>
      {showQuickLinks ? <DesignQuickLinks client={client} /> : null}
    </div>
  );
}

function ContentCard({
  item,
  clientsById,
  compact = false,
  note,
  showQuickLinks = false,
  actionLabel = "Editar",
  actionHref,
}: {
  item: ContentItem;
  clientsById: Map<string, Client>;
  compact?: boolean;
  note?: string;
  showQuickLinks?: boolean;
  actionLabel?: string;
  actionHref?: string;
}) {
  const client = clientFor(item, clientsById);
  const clientToken = getClientVisualToken({
    clientCode: client?.client_code,
    clientName: client?.name,
    shortName: client?.short_name,
    colorKey: client?.color_key,
  });

  return (
    <div className={`rounded-[14px] border border-l-4 border-[var(--bb-border)] bg-white/58 px-3 ${clientToken.borderStrong} ${compact ? "py-2" : "py-2.5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--bb-muted)]">
            <span>Conteúdo</span>
            <span>·</span>
            <ClientLink client={client} />
            <span>·</span>
            <span>{compactDate(contentActionDate(item))}</span>
            {item.platform ? (
              <>
                <span>·</span>
                <span>{item.platform}</span>
              </>
            ) : null}
          </div>
          <div className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
            {cleanPrefixedTitle(item.title, item.clients)}
          </div>
          {item.format ? (
            <div className="mt-0.5 text-xs font-bold text-[var(--bb-muted)]">{item.format}</div>
          ) : null}
          {item.is_blocked ? (
            <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[var(--bb-muted)]">
              Atenção: {item.blocker_reason ?? "Nota por adicionar"}
            </div>
          ) : null}
          {note ? <div className="bb-line-clamp-2 mt-1 text-xs font-bold text-[var(--bb-muted)]">Atenção: {note}</div> : null}
        </div>
        <Badge value={item.status} label={contentStatusLabels[item.status]} statusKind="content" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--bb-muted)]">
        <span>Responsável: {item.assignee_name ?? "-"}</span>
        <ActionLink href={actionHref ?? `/content/${item.id}/edit`} label={actionLabel} />
      </div>
      {showQuickLinks ? <DesignQuickLinks client={client} /> : null}
    </div>
  );
}
