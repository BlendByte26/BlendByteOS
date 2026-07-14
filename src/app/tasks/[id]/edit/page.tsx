import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { deleteTaskAction, sendTaskToDesignAction, updateTaskAction } from "@/lib/actions";
import { getClients, getInvest2030NewsletterByTaskId, getTask, getTeamMembers } from "@/lib/data";
import { DesignHandoffForm } from "@/components/design-handoff-form";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";
import { FormFrame, TaskForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { isDesignAssigneeName } from "@/lib/operational-profiles";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { invest2030NewsletterStatusLabels, isInvest2030NewsletterTask } from "@/lib/invest2030-newsletter";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;
  const activeProfile = await requireCurrentOperationalProfile();
  const canDelete = activeProfile.authRole !== "design";
  const [clients, teamMembers, task, newsletter] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getTask(id),
    getInvest2030NewsletterByTaskId(id),
  ]);
  const showDesignHandoff = task ? task.status !== "archived" && !isDesignAssigneeName(task.assignee_name) : false;

  if (!task) notFound();
  const showNewsletterPreparation = task.status !== "archived" && isInvest2030NewsletterTask(task);

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
            showNewsletterPreparation || showDesignHandoff ? (
              <>
                {showNewsletterPreparation ? (
                  <Link
                    href={`/tasks/${task.id}/newsletter`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    Preparar newsletter
                  </Link>
                ) : null}
                {showDesignHandoff ? (
                  <DesignHandoffForm action={sendTaskToDesignAction.bind(null, task.id)} />
                ) : null}
              </>
            ) : null
          }
        />
        {newsletter ? (
          <div className="mt-4 rounded-[18px] border border-[var(--bb-border)] bg-white/60 px-4 py-3">
            <div className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">Newsletter</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[var(--bb-charcoal)]">
              <span>Estado: {invest2030NewsletterStatusLabels[newsletter.status] ?? newsletter.status}</span>
              {newsletter.scheduled_at ? (
                <span>Envio: {new Date(newsletter.scheduled_at).toLocaleString("pt-PT")}</span>
              ) : null}
              <Link href={`/tasks/${task.id}/newsletter`} className="font-extrabold underline underline-offset-4">
                Ver newsletter
              </Link>
            </div>
          </div>
        ) : null}
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
