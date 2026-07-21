import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Mail, Video } from "lucide-react";
import {
  createContentFromTaskAction,
  createTaskCommentAction,
  deleteTaskAction,
  deleteTaskCommentAction,
  listTaskCommentsAction,
  sendTaskToDesignAction,
  updateTaskAction,
} from "@/lib/actions";
import { getClients, getInvest2030NewsletterByTaskId, getTask, getTaskComments, getTeamMembers } from "@/lib/data";
import { DesignHandoffForm } from "@/components/design-handoff-form";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";
import { FormFrame } from "@/components/forms";
import { TaskEditorTabs } from "@/components/task-editor-tabs";
import { PageHeader } from "@/components/ui";
import { isDesignAssigneeName } from "@/lib/operational-profiles";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  INVEST2030_WEBINAR_TEMPLATE_VERSION,
  invest2030NewsletterStatusLabels,
  isInvest2030NewsletterTask,
  isInvest2030SocialContentTask,
  isInvest2030WebinarTask,
} from "@/lib/invest2030-newsletter";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;
  const activeProfile = await requireCurrentOperationalProfile();
  const canDelete = activeProfile.authRole !== "design";
  const [clients, teamMembers, task, newsletter, comments] = await Promise.all([
    getClients(),
    getTeamMembers(),
    getTask(id),
    getInvest2030NewsletterByTaskId(id),
    getTaskComments(id),
  ]);

  if (!task) notFound();
  const invest2030ClientId = clients.find((client) => client.client_code === "02_I2030")?.id ?? null;
  const isInvestNewsletter = isInvest2030NewsletterTask(task, { invest2030ClientId });
  const isInvestWebinar = isInvest2030WebinarTask(task, { invest2030ClientId });
  const hasInvestSocialContent = isInvest2030SocialContentTask(task, { invest2030ClientId });
  const showNewsletterPreparation =
    task.status !== "archived" && isInvestNewsletter;
  const showWebinarPreparation =
    task.status !== "archived" && isInvestWebinar;
  const showDesignHandoff =
    !isInvestNewsletter && !isInvestWebinar && task.status !== "archived" && !isDesignAssigneeName(task.assignee_name);
  const storedCampaignLabel = newsletter?.template_version === INVEST2030_WEBINAR_TEMPLATE_VERSION ? "Webinar" : "Newsletter";
  const storedCampaignHref = newsletter?.template_version === INVEST2030_WEBINAR_TEMPLATE_VERSION
    ? `/tasks/${task.id}/webinar`
    : `/tasks/${task.id}/newsletter`;

  return (
    <>
      <PageHeader title="Editar tarefa" description={task.title} />
      {task.is_blocked ? (
        <div className="mb-5 rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]">
          Bloqueado: {task.blocker_reason ?? "Motivo do bloqueio por adicionar"}
        </div>
      ) : null}
      <FormFrame title="Dados da tarefa">
        <TaskEditorTabs
          taskAction={updateTaskAction.bind(null, task.id)}
          clients={clients}
          teamMembers={teamMembers}
          task={task}
          activeProfile={activeProfile}
          canPersist={isSupabaseConfigured()}
          submitLabel="Guardar alterações"
          initialComments={comments}
          listCommentsAction={listTaskCommentsAction}
          createCommentAction={createTaskCommentAction}
          deleteCommentAction={deleteTaskCommentAction}
          footerAction={
            showNewsletterPreparation || showWebinarPreparation || hasInvestSocialContent || showDesignHandoff ? (
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
                {showWebinarPreparation ? (
                  <Link
                    href={`/tasks/${task.id}/webinar`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                  >
                    <Video className="size-4" aria-hidden="true" />
                    Preparar webinar
                  </Link>
                ) : null}
                {hasInvestSocialContent ? (
                  <button
                    type="submit"
                    formAction={createContentFromTaskAction.bind(null, task.id)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                  >
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Criar conteúdo
                  </button>
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
            <div className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{storedCampaignLabel}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[var(--bb-charcoal)]">
              <span>Estado: {invest2030NewsletterStatusLabels[newsletter.status] ?? newsletter.status}</span>
              {newsletter.scheduled_at ? (
                <span>Envio: {new Date(newsletter.scheduled_at).toLocaleString("pt-PT")}</span>
              ) : null}
              <Link href={storedCampaignHref} className="font-extrabold underline underline-offset-4">
                Ver {storedCampaignLabel.toLowerCase()}
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
