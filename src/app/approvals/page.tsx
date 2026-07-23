import Link from "next/link";
import { CalendarDays, Check, Clock3, ListFilter, RefreshCw } from "lucide-react";
import { ContentReviewBuilder } from "@/components/content-review-builder";
import { EmptyState, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { currentLisbonContentMonth, formatContentMonthLabel } from "@/lib/content-month";
import { getContentReviewSummaries } from "@/lib/content-review-data";
import { contentReviewStatusLabels } from "@/lib/content-reviews";
import { getClients, getContentItems } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

type ApprovalView = "all" | "open" | "changes_requested" | "approved";

function isApprovalView(value: string | undefined): value is ApprovalView {
  return ["all", "open", "changes_requested", "approved"].includes(value ?? "");
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }).format(new Date(value))
    : "—";
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = await requireRole(["admin", "marketing"]);
  const params = await searchParams;
  const [reviews, clients, items] = await Promise.all([
    getContentReviewSummaries(),
    getClients(),
    getContentItems(),
  ]);
  const awaiting = reviews.filter((review) => review.status === "open").length;
  const changes = reviews.filter((review) => review.status === "changes_requested").length;
  const approved = reviews.filter((review) => review.status === "approved").length;
  const selectedView: ApprovalView = isApprovalView(params.view) ? params.view : "all";
  const visibleReviews = selectedView === "all"
    ? reviews
    : reviews.filter((review) => review.status === selectedView);
  const filters = [
    { value: "all", label: "Todas", count: reviews.length, icon: ListFilter, active: "bg-[var(--bb-black)] text-white", inactive: "text-[var(--bb-charcoal)]" },
    { value: "open", label: "A aguardar cliente", count: awaiting, icon: Clock3, active: "bg-[var(--bb-primary)] text-[var(--bb-black)]", inactive: "text-[var(--bb-muted)]" },
    { value: "changes_requested", label: "Alterações pedidas", count: changes, icon: RefreshCw, active: "bg-[var(--bb-red-soft)] text-[#9f493c]", inactive: "text-[#9f493c]" },
    { value: "approved", label: "Aprovadas", count: approved, icon: Check, active: "bg-[#e7f3e9] text-[#2f7650]", inactive: "text-[#2f7650]" },
  ] as const;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filtrar aprovações por estado" className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = selectedView === filter.value;
            const Icon = filter.icon;
            const href = filter.value === "all" ? "/approvals" : `/approvals?view=${filter.value}`;
            return (
              <Link
                key={filter.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--bb-border)] px-3.5 text-xs font-extrabold shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 ${active ? filter.active : `bg-white/75 ${filter.inactive}`}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{filter.label}</span>
                <span className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[11px] ${active ? "bg-white/55 text-inherit" : "bg-[#f1f1ed] text-[var(--bb-charcoal)]"}`}>
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </nav>
        <ContentReviewBuilder
          clients={clients}
          items={items}
          defaultMonth={currentLisbonContentMonth()}
          ownerName={profile.name}
          canPersist={isSupabaseConfigured()}
        />
      </div>

      <section aria-label="Aprovações partilhadas">
        <div className="grid gap-3">
          {visibleReviews.map((review) => (
            <Link key={review.id} href={`/approvals/${review.id}`} className="group block">
              <Panel className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bb-muted)]">{review.client_name}</div>
                      <h3 className="text-base font-extrabold text-[var(--bb-charcoal)]">{formatContentMonthLabel(review.month)} · versão {review.version}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-[var(--bb-muted)]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(review.published_at)}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{review.owner_name}</span>
                      <span className="font-extrabold text-[var(--bb-charcoal)]">{review.block_count} {review.block_count === 1 ? "bloco" : "blocos"}</span>
                      <span className="inline-flex items-center gap-1 font-extrabold text-[#2f7650]"><Check className="size-3.5" />{review.approved_count} {review.approved_count === 1 ? "aprovado" : "aprovados"}</span>
                      <span className="inline-flex items-center gap-1 font-extrabold text-[#9f493c]"><RefreshCw className="size-3.5" />{review.changes_count} com alterações</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${review.status === "approved" ? "bg-[#e7f3e9] text-[#2f7650]" : review.status === "changes_requested" ? "bg-[var(--bb-red-soft)] text-[#9f493c]" : "bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]"}`}>{contentReviewStatusLabels[review.status]}</span>
                </div>
              </Panel>
            </Link>
          ))}
          {!visibleReviews.length ? (
            <Panel>
              <EmptyState title={selectedView === "all" ? "Ainda não existem aprovações partilhadas." : "Não existem aprovações nesta vista."} />
            </Panel>
          ) : null}
        </div>
      </section>
    </>
  );
}
