import Link from "next/link";
import { notFound } from "next/navigation";
import { CommercialQuoteEditForm } from "@/components/commercial-forms";
import { CommercialQuoteItemsEditor } from "@/components/commercial-quote-builder";
import { CommercialServicePicker } from "@/components/commercial-service-picker";
import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { requireCommercialAccess } from "@/lib/auth";
import {
  updateCommercialQuoteAction,
} from "@/lib/commercial-actions";
import {
  getCommercialQuote,
  getCommercialQuoteItems,
  getCommercialWorkspaceData,
} from "@/lib/commercial-data";
import {
  commercialQuoteStatusLabels,
  commercialQuoteTotal,
  commercialStatusTone,
  formatCommercialMoney,
} from "@/lib/commercial";

export default async function CommercialQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCommercialAccess();
  const { id } = await params;
  const [quote, items, workspace] = await Promise.all([
    getCommercialQuote(id),
    getCommercialQuoteItems(id),
    getCommercialWorkspaceData(),
  ]);
  if (!quote) notFound();

  const opportunity = quote.commercial_opportunities;
  const total = commercialQuoteTotal(items);

  return (
    <div className="grid gap-5">
      <PageHeader
        title={quote.reference}
        description={`${opportunity?.company_name ?? "Oportunidade"} · ${quote.title}`}
        action={
          <Link
            href="/commercial?tab=quotes"
            className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-extrabold"
          >
            Voltar aos orçamentos
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Estado</div>
          <div className="mt-3">
            <span className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${commercialStatusTone(quote.status)}`}>
              {commercialQuoteStatusLabels[quote.status]}
            </span>
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Linhas</div>
          <div className="mt-2 text-3xl font-extrabold">{items.length}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Total sem IVA</div>
          <div className="mt-2 text-3xl font-extrabold">{formatCommercialMoney(total)}</div>
        </Panel>
      </div>

      {opportunity?.is_funded ? (
        <Panel className="border-[rgba(83,183,223,0.3)] bg-[var(--bb-primary-soft)] p-4">
          <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--bb-muted)]">Projeto financiado</div>
          <p className="mt-2 text-sm font-bold">
            {opportunity.funding_program || "Programa por confirmar"}
            {opportunity.funding_notice ? ` · ${opportunity.funding_notice}` : ""}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
            Cada linha deve indicar a categoria elegível e a evidência necessária. Os preços continuam a partir do catálogo-base.
          </p>
        </Panel>
      ) : null}

      <Panel className="p-4">
        {items.length ? (
          <CommercialQuoteItemsEditor
            quoteId={quote.id}
            items={items}
            funded={Boolean(opportunity?.is_funded)}
          />
        ) : (
          <EmptyState title="Adiciona serviços para construir o orçamento." />
        )}
      </Panel>

      <Panel className="p-5">
        <details open={!items.length}>
          <summary className="cursor-pointer list-none font-extrabold">Adicionar serviços do catálogo</summary>
          <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
            <CommercialServicePicker
              quoteId={quote.id}
              services={workspace.services}
            />
          </div>
        </details>
      </Panel>

      <Panel className="p-5">
        <details>
          <summary className="cursor-pointer list-none font-extrabold">Estado e condições do orçamento</summary>
          <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
            <CommercialQuoteEditForm
              quote={quote}
              action={updateCommercialQuoteAction.bind(null, quote.id)}
            />
          </div>
        </details>
      </Panel>

      {quote.status === "accepted" && opportunity ? (
        <Panel className="p-5">
          <h2 className="font-extrabold">Passar para cliente</h2>
          <p className="mt-1 text-sm font-bold text-[var(--bb-muted)]">
            A oportunidade já foi marcada como ganha. Liga-a agora ao perfil do cliente para manter o histórico comercial no OS.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/commercial/opportunities/${opportunity.id}/edit`}
              className="inline-flex min-h-10 items-center rounded-full bg-[var(--bb-primary)] px-4 text-sm font-extrabold"
            >
              Ligar a cliente existente
            </Link>
            <Link
              href="/clients/new"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"
            >
              Criar novo cliente
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
