import { notFound } from "next/navigation";
import { Invest2030NewsletterWorkspace } from "@/components/invest2030-newsletter-workspace";
import {
  markInvest2030WebinarExportedAction,
  markInvest2030WebinarScheduledAction,
  markInvest2030WebinarSentAction,
  saveInvest2030WebinarDraftAction,
} from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { getInvest2030CampaignByTaskId, getTask } from "@/lib/data";
import {
  initialInvest2030WebinarContent,
  isInvest2030WebinarTask,
  parseInvest2030TaskNotes,
  type Invest2030Newsletter,
} from "@/lib/invest2030-newsletter";
import { getTaskDisplayTitle } from "@/lib/task-display";

type Props = {
  params: Promise<{ id: string }>;
};

function coerceNewsletter(value: Awaited<ReturnType<typeof getInvest2030CampaignByTaskId>>) {
  if (!value) return null;
  return value as unknown as Invest2030Newsletter;
}

export default async function Invest2030WebinarPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin", "marketing", "design"]);
  const [task, storedNewsletter] = await Promise.all([
    getTask(id),
    getInvest2030CampaignByTaskId(id, "webinar"),
  ]);

  if (!task) notFound();
  if (!isInvest2030WebinarTask(task)) notFound();

  const parsedRequest = parseInvest2030TaskNotes(task.notes);
  const newsletter = coerceNewsletter(storedNewsletter);
  const normalizedNewsletter = newsletter
    ? {
        ...newsletter,
        content_json: {
          ...initialInvest2030WebinarContent(parsedRequest),
          ...newsletter.content_json,
        },
      }
    : null;
  const title = getTaskDisplayTitle(task);

  return (
    <Invest2030NewsletterWorkspace
      taskId={id}
      campaignTitle={title}
      taskSummary={{
        title: getTaskDisplayTitle(task),
        clientName: task.clients?.name ?? task.clients?.short_name ?? "-",
        assigneeName: task.assignee_name ?? "-",
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString("pt-PT") : "-",
        status: task.status,
        notes: task.notes ?? "",
      }}
      parsedRequest={parsedRequest}
      newsletter={normalizedNewsletter}
      variant="webinar"
      gptUrl={process.env.NEXT_PUBLIC_INVEST2030_WEBINAR_GPT_URL ?? null}
      saveAction={saveInvest2030WebinarDraftAction.bind(null, id)}
      markScheduledAction={markInvest2030WebinarScheduledAction.bind(null, id)}
      markExportedAction={markInvest2030WebinarExportedAction.bind(null, id)}
      markSentAction={markInvest2030WebinarSentAction.bind(null, id)}
    />
  );
}
