import { notFound } from "next/navigation";
import { deleteTaskAction, sendTaskToDesignAction, updateTaskAction } from "@/lib/actions";
import { getClients, getTask, getTeamMembers } from "@/lib/data";
import { DesignHandoffForm } from "@/components/design-handoff-form";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";
import { FormFrame, TaskForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { isDesignAssigneeName } from "@/lib/operational-profiles";
import { requireCurrentOperationalProfile } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;
  const activeProfile = await requireCurrentOperationalProfile();
  const canDelete = activeProfile.authRole !== "design";
  const [clients, teamMembers, task] = await Promise.all([getClients(), getTeamMembers(), getTask(id)]);
  const showDesignHandoff = task ? task.status !== "archived" && !isDesignAssigneeName(task.assignee_name) : false;

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
          footerAction={
            showDesignHandoff ? (
              <DesignHandoffForm action={sendTaskToDesignAction.bind(null, task.id)} />
            ) : null
          }
        />
        {canDelete ? (
          <ConfirmSubmitForm
            action={deleteTaskAction.bind(null, task.id)}
            message={`Apagar definitivamente a tarefa "${task.title}"?\n\nEsta ação não pode ser anulada.`}
            className="mt-4 border-t border-[var(--bb-border)] pt-4"
          >
            <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-bold text-[#8f2415] transition hover:bg-[var(--bb-red-soft)]">
              Apagar definitivamente
            </button>
          </ConfirmSubmitForm>
        ) : null}
      </FormFrame>
    </>
  );
}
