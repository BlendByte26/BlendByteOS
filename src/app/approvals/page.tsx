import Link from "next/link";
import { CalendarDays, Check, Clock3, RefreshCw } from "lucide-react";
import { ContentReviewBuilder } from "@/components/content-review-builder";
import { EmptyState, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { currentLisbonContentMonth, formatContentMonthLabel } from "@/lib/content-month";
import { getContentReviewSummaries } from "@/lib/content-review-data";
import { contentReviewStatusLabels } from "@/lib/content-reviews";
import { getClients, getContentItems } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }).format(new Date(value))
    : "—";
}

export default async function ApprovalsPage() {
  const profile = await requireRole(["admin", "marketing"]);
  const [reviews, clients, items] = await Promise.all([
    getContentReviewSummaries(),
    getClients(),
    getContentItems(),
  ]);
  const awaiting = reviews.filter((review) => review.status === "open").length;
  const changes = reviews.filter((review) => review.status === "changes_requested").length;
  const approved = reviews.filter((review) => review.status === "approved").length;

  return (
    <>
      <div className="mb-6 flex justify-end">
        <ContentReviewBuilder
          clients={clients}
          items={items}
          defaultMonth={currentLisbonContentMonth()}
          ownerName={profile.name}
          canPersist={isSupabaseConfigured()}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]"><Clock3 className="size-4" />A aguardar cliente</div>
          <div className="mt-2 text-3xl font-extrabold text-[var(--bb-charcoal)]">{awaiting}</div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#9f493c]"><RefreshCw className="size-4" />Alterações pedidas</div>
          <div className="mt-2 text-3xl font-extrabold text-[var(--bb-charcoal)]">{changes}</div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#2f7650]"><Check className="size-4" />Aprovadas</div>
          <div className="mt-2 text-3xl font-extrabold text-[var(--bb-charcoal)]">{approved}</div>
        </Panel>
      </div>

      <section aria-label="Aprovações partilhadas">
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Link key={review.id} href={`/approvals/${review.id}`} className="group block">
              <Panel className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">{review.client_name}</div>
                    <h3 className="mt-1 text-xl font-extrabold text-[var(--bb-charcoal)]">{formatContentMonthLabel(review.month)} · versão {review.version}</h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />Partilhado em {formatDate(review.published_at)}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{review.owner_name}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${review.status === "approved" ? "bg-[#e7f3e9] text-[#2f7650]" : review.status === "changes_requested" ? "bg-[var(--bb-red-soft)] text-[#9f493c]" : "bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]"}`}>{contentReviewStatusLabels[review.status]}</span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#f5f5f1] px-3 py-2 text-sm font-extrabold">{review.block_count} blocos</div>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-[#edf8ef] px-3 py-2 text-sm font-extrabold text-[#2f7650]"><Check className="size-4" />{review.approved_count} aprovados</div>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bb-red-soft)] px-3 py-2 text-sm font-extrabold text-[#9f493c]"><RefreshCw className="size-4" />{review.changes_count} com alterações</div>
                </div>
              </Panel>
            </Link>
          ))}
          {!reviews.length ? <Panel><EmptyState title="Ainda não existem aprovações partilhadas." /></Panel> : null}
        </div>
      </section>
    </>
  );
}
