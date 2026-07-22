import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentReviewPresentation } from "@/components/content-review-presentation";
import { ContentReviewRevisionControl } from "@/components/content-review-revision-control";
import { ContentReviewLinkControl } from "@/components/content-review-link-control";
import { PageHeader, SecondaryLink } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getContentReview } from "@/lib/content-review-data";
import { contentReviewDecisionSummary, contentReviewStatusLabels } from "@/lib/content-reviews";

export default async function ContentValidationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "marketing"]);
  const { id } = await params;
  const review = await getContentReview(id);
  if (!review) notFound();
  const summary = contentReviewDecisionSummary(review.blocks);

  return (
    <>
      <PageHeader title={`Validação · ${review.client_name}`} description={`${contentReviewStatusLabels[review.status]} · ${summary.approved} aprovados · ${summary.changes} com alterações`} action={<SecondaryLink href="/content/validations">Ver histórico</SecondaryLink>} />

      {review.status === "open" ? <ContentReviewLinkControl roundId={review.id} /> : null}

      {review.status === "changes_requested" ? (
        <section className="mb-6 rounded-[24px] border border-[rgba(232,76,49,0.25)] bg-[var(--bb-red-soft)] p-5">
          <h2 className="text-lg font-extrabold text-[#8f2415]">Alterações pedidas pelo cliente</h2>
          <p className="mt-1 text-sm font-semibold text-[#8f2415]/80">Inicia uma revisão por bloco. A ação reabre os conteúdos originais e cria uma tarefa operacional — nunca uma tarefa de Design.</p>
          <div className="mt-4 grid gap-3">
            {review.blocks.filter((block) => block.decision === "changes_requested").map((block) => (
              <article key={block.id} className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-[var(--bb-charcoal)]">{block.title}</h3>
                    {block.client_comment ? <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--bb-muted)]">{block.client_comment}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">{block.items.flatMap((item) => item.content_item_id ? [<Link key={item.id} href={`/content/${item.content_item_id}/edit`} className="rounded-full border border-[var(--bb-border)] bg-white px-3 py-1.5 text-xs font-extrabold underline-offset-4 hover:underline">Editar {item.title}</Link>] : [])}</div>
                  </div>
                  <ContentReviewRevisionControl blockId={block.id} taskId={block.revision_task_id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <ContentReviewPresentation review={review} />
    </>
  );
}
