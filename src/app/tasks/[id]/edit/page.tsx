import { notFound } from "next/navigation";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions";
import { getClients, getTask, getTeamMembers } from "@/lib/data";
import { FormFrame, TaskForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;
  const [clients, teamMembers, task] = await Promise.all([getClients(), getTeamMembers(), getTask(id)]);

  if (!task) notFound();

  return (
    <>
      <PageHeader title="Editar tarefa" description={task.title} />
      {task.is_blocked ? (
        <div className="mb-5 rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]">
          Bloqueado: {task.blocker_reason ?? "Motivo do bloqueio por adicionar"}
        </div>
      ) : null}
      <FormFrame title="Dados da tarefa">
        <TaskForm
          action={updateTaskAction.bind(null, task.id)}
          clients={clients}
          teamMembers={teamMembers}
          task={task}
          submitLabel="Guardar alterações"
        />
        <form action={deleteTaskAction.bind(null, task.id)} className="mt-4 border-t border-[var(--bb-border)] pt-4">
          <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-bold text-[#8f2415] transition hover:bg-[var(--bb-red-soft)]">
            Apagar tarefa
          </button>
        </form>
      </FormFrame>
    </>
  );
}
