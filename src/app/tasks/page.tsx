import { TasksFiltersBar } from "@/components/live-filters";
import { TasksTable } from "@/components/tasks-table";
import { deleteTaskInlineAction, updateTaskInlineAction } from "@/lib/actions";
import { getClientLabel } from "@/lib/client-display";
import { getClients, getTasks } from "@/lib/data";
import { taskStatusLabels } from "@/lib/labels";
import { isSupabaseConfigured } from "@/lib/supabase";
import { taskStatuses } from "@/lib/types";
import { Panel } from "@/components/ui";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const filters = {
    assignee: valueOf(params, "assignee") ?? "",
    client: valueOf(params, "client") ?? "",
    status: valueOf(params, "status") ?? "",
    due: valueOf(params, "due") ?? "",
  };
  const [clients, tasks] = await Promise.all([getClients(), getTasks(filters)]);
  const tableKey = [
    JSON.stringify(filters),
    tasks.map((task) => `${task.id}:${task.status}:${task.priority}:${task.updated_at}`).join("|"),
  ].join(":");

  return (
    <>
      <Panel className="mb-5 p-4">
        <TasksFiltersBar
          key={JSON.stringify(filters)}
          filters={filters}
          clientOptions={[
            { value: "", label: "Todos os clientes" },
            ...clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
          ]}
          statusOptions={[
            { value: "", label: "Todos os estados" },
            ...taskStatuses.map((status) => ({ value: status, label: taskStatusLabels[status] })),
          ]}
        />
      </Panel>

      <TasksTable
        key={tableKey}
        tasks={tasks}
        clients={clients}
        canPersist={isSupabaseConfigured()}
        updateTaskAction={updateTaskInlineAction}
        deleteTaskAction={deleteTaskInlineAction}
      />
    </>
  );
}
