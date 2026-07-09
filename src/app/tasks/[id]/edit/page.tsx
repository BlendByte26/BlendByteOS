import { notFound } from "next/navigation";
import { Send } from "lucide-react";
import { deleteTaskAction, sendTaskToDesignAction, updateTaskAction } from "@/lib/actions";
import { getClients, getTask, getTeamMembers } from "@/lib/data";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";
import { FormFrame, TaskForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

function isAssignedToDesign(assigneeName: string | null) {
  return assigneeName
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .includes("carlota") ?? false;
}

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;
  const [clients, teamMembers, task] = await Promise.all([getClients(), getTeamMembers(), getTask(id)]);
  const showDesignHandoff = task ? task.status !== "archived" && !isAssignedToDesign(task.assignee_name) : false;

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
        {showDesignHandoff ? (
          <ConfirmSubmitForm
            action={sendTaskToDesignAction.bind(null, task.id)}
            message="Enviar esta tarefa para a Carlota/Design?"
            className="mb-4 flex justify-end"
          >
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
            >
              <Send className="size-4" aria-hidden="true" />
              Enviar para Design
            </button>
          </ConfirmSubmitForm>
        ) : null}
        <TaskForm
          action={updateTaskAction.bind(null, task.id)}
          clients={clients}
          teamMembers={teamMembers}
          task={task}
          submitLabel="Guardar alterações"
        />
        <ConfirmSubmitForm
          action={deleteTaskAction.bind(null, task.id)}
          message={`Apagar definitivamente a tarefa "${task.title}"?\n\nEsta ação não pode ser anulada.`}
          className="mt-4 border-t border-[var(--bb-border)] pt-4"
        >
          <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-bold text-[#8f2415] transition hover:bg-[var(--bb-red-soft)]">
            Apagar definitivamente
          </button>
        </ConfirmSubmitForm>
      </FormFrame>
    </>
  );
}
