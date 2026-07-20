import Link from "next/link";
import { TasksFiltersBar } from "@/components/live-filters";
import { TasksTable } from "@/components/tasks-table";
import {
  archiveTaskInlineAction,
  deleteTaskInlineAction,
  sendTaskToDesignInlineAction,
  updateTaskStatusInlineAction,
  updateTaskInlineAction,
} from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { getClients, getTasks, getTeamMembers, uniqueValues } from "@/lib/data";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/labels";
import { parseTaskPriorityParam, parseTaskStatusParam } from "@/lib/smart-links";
import { taskStatusTones } from "@/lib/status-styles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { taskStatuses } from "@/lib/types";
import { Panel } from "@/components/ui";
import { requireCurrentOperationalProfile } from "@/lib/auth";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

type TasksView = "all" | "today" | "week" | "archived";

const viewOptions: Array<{ value: TasksView; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "archived", label: "Arquivadas" },
];

const emptyStateLabels: Record<TasksView, string> = {
  all: "Sem tarefas ativas.",
  today: "Sem tarefas para hoje.",
  week: "Sem tarefas para esta semana.",
  archived: "Sem tarefas arquivadas.",
};

function parseView(value: string | undefined): TasksView {
  if (value === "today" || value === "week" || value === "archived") return value;
  return "all";
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
    today: localDateString(today),
  };
}

function taskInView(task: Awaited<ReturnType<typeof getTasks>>[number], view: TasksView) {
  const dates = currentWeekRange();

  if (view === "archived") return task.status === "archived";
  if (task.status === "archived") return false;
  if (view === "today") return task.due_date === dates.today;
  if (view === "week") {
    return Boolean(task.due_date && task.due_date >= dates.start && task.due_date <= dates.end);
  }

  return true;
}

function hrefForView(params: Record<string, string | string[] | undefined>, view: TasksView) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, rawValue]) => {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) nextParams.set(key, value);
  });

  if (view === "all") {
    nextParams.delete("view");
  } else {
    nextParams.set("view", view);
  }

  const query = nextParams.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

export default async function TasksPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const profile = await requireCurrentOperationalProfile();
  const requestedAssignee = valueOf(params, "assignee") ?? valueOf(params, "owner");
  const currentView = parseView(valueOf(params, "view"));
  const requestedStatus = parseTaskStatusParam(valueOf(params, "status"));
  const filters = {
    assignee: requestedAssignee === "all" ? "" : requestedAssignee ?? profile.name,
    client: valueOf(params, "client") ?? "",
    priority: parseTaskPriorityParam(valueOf(params, "priority")),
    status: requestedStatus,
    due: valueOf(params, "due") ?? valueOf(params, "until") ?? "",
  };
  const [clients, teamMembers, tasksForOptions, filteredTasks] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getTasks(),
    getTasks(filters),
  ]);
  const tasks = filteredTasks.filter((task) => taskInView(task, currentView));
  const today = currentWeekRange().today;
  const assignees = uniqueValues(tasksForOptions, (task) => task.assignee_name);
  const tableKey = [
    currentView,
    JSON.stringify(filters),
    tasks.map((task) => `${task.id}:${task.status}:${task.priority}:${task.updated_at}`).join("|"),
  ].join(":");

  return (
    <>
      <Panel className="mb-5 p-3.5">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => {
              const active = option.value === currentView;

              return (
                <Link
                  key={option.value}
                  href={hrefForView(params, option.value)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-extrabold transition ${
                    active
                      ? "border-[rgba(83,183,223,0.42)] bg-[var(--bb-primary)] text-[var(--bb-black)]"
                      : "border-[var(--bb-border)] bg-white/65 text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <TasksFiltersBar
            key={JSON.stringify(filters)}
            filters={filters}
            clientOptions={[
              { value: "", label: "Todos os clientes" },
              ...clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
            ]}
            ownerOptions={[
              { value: "", label: "Todos" },
              ...Array.from(new Set([...teamMembers.map((member) => member.name), ...assignees]))
                .sort((a, b) => a.localeCompare(b, "pt"))
                .map((name) => ({ value: name, label: name })),
            ]}
            priorityOptions={[
              { value: "", label: "Todas" },
              { value: "normal", label: taskPriorityLabels.normal },
              { value: "urgent", label: taskPriorityLabels.urgent },
            ]}
            statusOptions={[
              { value: "", label: "Todos os estados" },
              ...taskStatuses.map((status) => ({
                value: status,
                label: taskStatusLabels[status],
                tone: taskStatusTones[status],
              })),
            ]}
          />
        </div>
      </Panel>

      <TasksTable
        key={tableKey}
        tasks={tasks}
        clients={clients}
        teamMembers={teamMembers}
        view={currentView}
        today={today}
        emptyTitle={emptyStateLabels[currentView]}
        canPersist={isSupabaseConfigured()}
        canDelete={profile.authRole !== "design"}
        updateTaskAction={updateTaskInlineAction}
        updateStatusAction={updateTaskStatusInlineAction}
        sendToDesignAction={sendTaskToDesignInlineAction}
        archiveTaskAction={archiveTaskInlineAction}
        deleteTaskAction={deleteTaskInlineAction}
      />
    </>
  );
}
