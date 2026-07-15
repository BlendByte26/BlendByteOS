import { notFound } from "next/navigation";
import { Invest2030NewsletterWorkspace } from "@/components/invest2030-newsletter-workspace";
import {
  markInvest2030NewsletterExportedAction,
  markInvest2030NewsletterScheduledAction,
  markInvest2030NewsletterSentAction,
  saveInvest2030NewsletterDraftAction,
} from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { getInvest2030NewsletterByTaskId, getTask } from "@/lib/data";
import {
  initialInvest2030NewsletterContent,
  isInvest2030NewsletterTask,
  parseInvest2030TaskNotes,
  type Invest2030Newsletter,
} from "@/lib/invest2030-newsletter";
import { getTaskDisplayTitle } from "@/lib/task-display";

type Props = {
  params: Promise<{ id: string }>;
};

function coerceNewsletter(value: Awaited<ReturnType<typeof getInvest2030NewsletterByTaskId>>) {
  if (!value) return null;
  return value as unknown as Invest2030Newsletter;
}

export default async function Invest2030NewsletterPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin", "marketing", "design"]);
  const [task, storedNewsletter] = await Promise.all([
    getTask(id),
    getInvest2030NewsletterByTaskId(id),
  ]);

  if (!task) notFound();
  if (!isInvest2030NewsletterTask(task)) notFound();

  const parsedRequest = parseInvest2030TaskNotes(task.notes);
  const newsletter = coerceNewsletter(storedNewsletter);
  const normalizedNewsletter = newsletter
    ? {
        ...newsletter,
        content_json: {
          ...initialInvest2030NewsletterContent(parsedRequest),
          ...newsletter.content_json,
        },
      }
    : null;
  const title = parsedRequest.campaignName || getTaskDisplayTitle(task);

  return (
    <Invest2030NewsletterWorkspace
      taskId={id}
      campaignTitle={title}
      parsedRequest={parsedRequest}
      newsletter={normalizedNewsletter}
      gptUrl={process.env.NEXT_PUBLIC_INVEST2030_GPT_URL ?? null}
      saveAction={saveInvest2030NewsletterDraftAction.bind(null, id)}
      markScheduledAction={markInvest2030NewsletterScheduledAction.bind(null, id)}
      markExportedAction={markInvest2030NewsletterExportedAction.bind(null, id)}
      markSentAction={markInvest2030NewsletterSentAction.bind(null, id)}
    />
  );
}
