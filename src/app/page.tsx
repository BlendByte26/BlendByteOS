import Link from "next/link";
import { DashboardOverview } from "@/components/dashboard-agenda";
import { QuickTodosPanel } from "@/components/quick-todos";
import { Panel } from "@/components/ui";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import {
  getClients,
  getContentItems,
  getMentionedContentComments,
  getMentionedTaskComments,
  getPersonalQuickNotes,
  getPersonalQuickTodos,
  getTasks,
  getTeamMembers,
} from "@/lib/data";
import {
  buildDashboardItems,
  lisbonDate,
  lisbonGreeting,
  type DashboardFocus,
  type DashboardScope,
} from "@/lib/dashboard";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { ContentMention, TaskMention } from "@/lib/types";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseFocus(value: string | undefined): DashboardFocus | null {
  return value === "overdue" || value === "near" || value === "next7" ? value : null;
}

function personalHeaderDate(now: Date) {
  const today = lisbonDate(now);
  const date = new Date(`${today}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(date);
  const fullDate = new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${fullDate}`;
}

function excerpt(value: string, length = 92) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
}

function mentionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scopeHref(scope: DashboardScope) {
  return scope === "team" ? "/?scope=team" : "/";
}

function ScopeSelector({ scope }: { scope: DashboardScope }) {
  return (
    <nav aria-label="Âmbito do Painel" className="flex rounded-full border border-[var(--bb-border)] bg-white/62 p-1 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
      {([
        ["personal", "O meu trabalho"],
        ["team", "Equipa"],
      ] as const).map(([value, label]) => (
        <Link
          key={value}
          href={scopeHref(value)}
          aria-current={scope === value ? "page" : undefined}
          className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold transition ${
            scope === value
              ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_8px_18px_rgba(83,183,223,0.24)]"
              : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function MentionsPanel({
  mentions,
  hasMore,
  showAll,
  scope,
}: {
  mentions: Array<ContentMention | TaskMention>;
  hasMore: boolean;
  showAll: boolean;
  scope: DashboardScope;
}) {
  const params = new URLSearchParams();
  if (scope === "team") params.set("scope", "team");
  if (!showAll) params.set("mentions", "all");
  const href = `/?${params.toString()}#mencoes`;

  return (
    <Panel className="mt-3 p-3.5">
      <div id="mencoes" className="flex scroll-mt-5 items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold">Menções</h2>
        </div>
        {hasMore || showAll ? (
          <Link href={href} className="min-h-8 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 py-1.5 text-xs font-extrabold hover:bg-[var(--bb-primary-soft)]">
            {showAll ? "Mostrar menos" : "Ver todas"}
          </Link>
        ) : null}
      </div>
      {mentions.length ? (
        <div className="mt-2.5 grid gap-1.5 md:grid-cols-2">
          {mentions.map((mention) => {
            const content = "content_id" in mention ? mention.content_items : null;
            const task = "task_id" in mention ? mention.tasks : null;
            const client = content?.clients ?? task?.clients ?? null;
            const title = task
              ? getTaskDisplayTitle(task)
              : content
                ? cleanPrefixedTitle(content.title, client)
                : "Item";
            const itemHref = task ? `/tasks/${task.id}/edit` : content ? `/content/${content.id}/edit` : null;
            return (
              <article key={mention.id} className="grid min-w-0 gap-2 rounded-[14px] border border-[var(--bb-border)] bg-white/52 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-[var(--bb-muted)]">
                    <strong className="text-[var(--bb-charcoal)]">{mention.author_name}</strong>
                    <span>·</span>
                    <span>{mentionDate(mention.created_at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-bold">{excerpt(mention.body)}</p>
                  <p className="truncate text-[11px] font-bold text-[var(--bb-muted)]">
                    {title}{client ? ` · ${client.short_name ?? client.client_code ?? client.name}` : ""}
                  </p>
                </div>
                {itemHref ? (
                  <Link href={itemHref} className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--bb-border)] bg-white/72 px-3 text-xs font-extrabold hover:bg-[var(--bb-primary-soft)]">
                    Abrir
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <p className="py-3 text-sm font-bold text-[var(--bb-muted)]">Sem menções recentes.</p>}
    </Panel>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const currentProfile = await requireCurrentOperationalProfile();
  const canSeeTeam = currentProfile.key === "guilherme";
  const scope: DashboardScope = canSeeTeam && valueOf(params, "scope") === "team" ? "team" : "personal";
  const focus = parseFocus(valueOf(params, "focus"));
  const showAll = valueOf(params, "show") === "all";
  const showAllMentions = valueOf(params, "mentions") === "all";
  const expandedWeekDay = valueOf(params, "weekDay") ?? null;
  const now = new Date();
  const mentionLimit = showAllMentions ? 50 : 6;

  const [clients, content, tasks, teamMembers, quickTodos, quickNotes, contentMentions, taskMentions] = await Promise.all([
    getClients(),
    getContentItems(),
    getTasks(),
    getTeamMembers(),
    getPersonalQuickTodos(currentProfile.key),
    getPersonalQuickNotes(currentProfile.key),
    getMentionedContentComments(currentProfile.key, mentionLimit),
    getMentionedTaskComments(currentProfile.key, mentionLimit),
  ]);
  const activeTeamNames = teamMembers.filter((member) => member.active).map((member) => member.name);
  const items = buildDashboardItems({
    tasks,
    content,
    clients,
    scope,
    profileName: currentProfile.name,
    activeTeamNames,
  });
  const allMentions = [...contentMentions, ...taskMentions].sort((first, second) => second.created_at.localeCompare(first.created_at));
  const hasMoreMentions = allMentions.length > 5;
  const visibleMentions = showAllMentions ? allMentions : allMentions.slice(0, 5);

  return (
    <>
      <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--bb-charcoal)] md:text-3xl">
            {lisbonGreeting(now)}, {currentProfile.name}
          </h1>
          <p className="mt-1 text-sm font-bold text-[var(--bb-muted)]">{personalHeaderDate(now)}</p>
        </div>
        {canSeeTeam ? <ScopeSelector scope={scope} /> : null}
      </header>

      <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0">
          <DashboardOverview
            items={items}
            scope={scope}
            focus={focus}
            showAll={showAll}
            expandedWeekDay={expandedWeekDay}
            now={now}
          />
        </main>
        <QuickTodosPanel profile={currentProfile} todos={quickTodos} notes={quickNotes} />
      </div>

      <MentionsPanel
        mentions={visibleMentions}
        hasMore={hasMoreMentions}
        showAll={showAllMentions}
        scope={scope}
      />
    </>
  );
}
