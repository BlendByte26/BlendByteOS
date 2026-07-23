import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  CommercialQuoteEditForm,
  CommercialQuoteItemForm,
} from "@/components/commercial-forms";
import { EmptyState, PageHeader, Panel, TableWrap } from "@/components/ui";
import { requireCommercialAccess } from "@/lib/auth";
import {
  addCommercialQuoteItemAction,
  removeCommercialQuoteItemAction,
  updateCommercialQuoteAction,
} from "@/lib/commercial-actions";
import {
  getCommercialQuote,
  getCommercialQuoteItems,
  getCommercialWorkspaceData,
} from "@/lib/commercial-data";
import {
  commercialQuoteItemTotal,
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

      <Panel>
        {items.length ? (
          <TableWrap>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Serviço</th>
                  <th className="px-5 py-4 font-extrabold">Descrição</th>
                  <th className="px-5 py-4 font-extrabold">Qtd.</th>
                  <th className="px-5 py-4 font-extrabold">Preço unitário</th>
                  <th className="px-5 py-4 font-extrabold">Total</th>
                  <th className="px-5 py-4 font-extrabold">Elegibilidade</th>
                  <th className="px-3 py-4 font-extrabold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <div className="font-extrabold">{item.service_name}</div>
                      <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                        {item.service_code} · {item.category} · por {item.unit}
                      </div>
                      {item.price_override_reason ? (
                        <div className="mt-2 text-xs font-bold text-[#9f493c]">
                          Exceção: {item.price_override_reason}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-80 px-5 py-4 text-xs font-bold leading-5 text-[var(--bb-muted)]">
                      {item.description || "—"}
                    </td>
                    <td className="px-5 py-4 font-extrabold">{Number(item.quantity).toLocaleString("pt-PT")}</td>
                    <td className="px-5 py-4">
                      <div className="font-extrabold">{formatCommercialMoney(item.unit_price)}</div>
                      {Number(item.unit_price) !== Number(item.standard_unit_price) ? (
                        <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                          Base: {formatCommercialMoney(item.standard_unit_price)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 font-extrabold">{formatCommercialMoney(commercialQuoteItemTotal(item))}</td>
                    <td className="max-w-64 px-5 py-4">
                      <div className="text-xs font-extrabold">{item.eligible_category || "—"}</div>
                      {item.evidence_notes ? (
                        <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">{item.evidence_notes}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <form action={removeCommercialQuoteItemAction.bind(null, quote.id, item.id)}>
                        <button
                          type="submit"
                          aria-label={`Remover ${item.service_name}`}
                          title="Remover linha"
                          className="inline-grid size-9 place-items-center rounded-full border border-[rgba(232,76,49,0.28)] bg-white text-[#9f493c] hover:bg-[var(--bb-red-soft)]"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--bb-black)]">
                  <td colSpan={4} className="px-5 py-5 text-right text-sm font-extrabold">Total sem IVA</td>
                  <td className="px-5 py-5 text-lg font-extrabold">{formatCommercialMoney(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Adiciona serviços para construir o orçamento." />
        )}
      </Panel>

      <Panel className="p-5">
        <details open={!items.length}>
          <summary className="cursor-pointer list-none font-extrabold">Adicionar linha do catálogo</summary>
          <div className="mt-5 border-t border-[var(--bb-border)] pt-5">
            <CommercialQuoteItemForm
              action={addCommercialQuoteItemAction.bind(null, quote.id)}
              services={workspace.services}
              funded={Boolean(opportunity?.is_funded)}
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
