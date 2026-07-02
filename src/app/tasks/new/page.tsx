import { createTaskAction } from "@/lib/actions";
import { getClients } from "@/lib/data";
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
  const clients = await getClients();
  const defaultClientId = valueOf(params, "client");

  return (
    <>
      <PageHeader title="Nova tarefa" description="Criar tarefa operacional." />
      <FormFrame title="Dados da tarefa">
        <TaskForm
          action={createTaskAction}
          clients={clients}
          defaultClientId={defaultClientId}
          submitLabel="Criar tarefa"
        />
      </FormFrame>
    </>
  );
}
