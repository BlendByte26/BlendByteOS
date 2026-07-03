import { createTaskAction } from "@/lib/actions";
import { getClients, getTeamMembers } from "@/lib/data";
import { FormFrame, TaskForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewTaskPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const [clients, teamMembers] = await Promise.all([getClients(), getTeamMembers()]);
  const defaultClientId = valueOf(params, "client");

  return (
    <>
      <PageHeader title="Nova tarefa" description="Criar tarefa operacional." />
      <FormFrame title="Dados da tarefa">
        <TaskForm
          action={createTaskAction}
          clients={clients}
          teamMembers={teamMembers}
          defaultClientId={defaultClientId}
          submitLabel="Criar tarefa"
        />
      </FormFrame>
    </>
  );
}
