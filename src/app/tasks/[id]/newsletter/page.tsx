import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Invest2030NewsletterWorkspace } from "@/components/invest2030-newsletter-workspace";
import {
  markInvest2030NewsletterExportedAction,
  markInvest2030NewsletterScheduledAction,
  markInvest2030NewsletterSentAction,
  saveInvest2030NewsletterDraftAction,
  saveInvest2030NewsletterFormAction,
} from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { getInvest2030NewsletterByTaskId, getTask } from "@/lib/data";
import {
  initialInvest2030NewsletterContent,
  invest2030NewsletterStatusLabels,
  isInvest2030NewsletterTask,
  parseInvest2030TaskNotes,
  type Invest2030Newsletter,
} from "@/lib/invest2030-newsletter";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { PageHeader } from "@/components/ui";

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
  const statusLabel = normalizedNewsletter
    ? invest2030NewsletterStatusLabels[normalizedNewsletter.status]
    : "Novo rascunho";

  return (
    <>
      <PageHeader
        title="Newsletter Invest2030"
        description={title}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-10 items-center rounded-full bg-[var(--bb-primary-soft)] px-4 text-sm font-extrabold text-[var(--bb-charcoal)]">
              {statusLabel}
            </span>
            <Link
              href={`/tasks/${id}/edit`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar à tarefa
            </Link>
            <form action={saveInvest2030NewsletterFormAction.bind(null, id)}>
              <input
                type="hidden"
                name="content_json"
                value={JSON.stringify(normalizedNewsletter?.content_json ?? initialInvest2030NewsletterContent(parsedRequest))}
              />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
              >
                <Save className="size-4" aria-hidden="true" />
                Guardar rascunho
              </button>
            </form>
          </div>
        }
      />
      <Invest2030NewsletterWorkspace
        parsedRequest={parsedRequest}
        newsletter={normalizedNewsletter}
        gptUrl={process.env.NEXT_PUBLIC_INVEST2030_GPT_URL ?? null}
        saveAction={saveInvest2030NewsletterDraftAction.bind(null, id)}
        markScheduledAction={markInvest2030NewsletterScheduledAction.bind(null, id)}
        markExportedAction={markInvest2030NewsletterExportedAction.bind(null, id)}
        markSentAction={markInvest2030NewsletterSentAction.bind(null, id)}
      />
    </>
  );
}
