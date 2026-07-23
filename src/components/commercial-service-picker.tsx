import { Plus } from "lucide-react";
import { addCommercialQuoteItemAction } from "@/lib/commercial-actions";
import {
  formatCommercialMoney,
  groupCommercialServices,
} from "@/lib/commercial";
import type { CommercialService } from "@/lib/types";

export function CommercialServicePicker({
  quoteId,
  services,
}: {
  quoteId: string;
  services: CommercialService[];
}) {
  const groups = groupCommercialServices(
    services.filter((service) => service.active && service.price_status !== "archived"),
  );

  if (!groups.length) {
    return <p className="text-sm font-bold text-[var(--bb-muted)]">Não existem serviços ativos no catálogo.</p>;
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-bold text-[var(--bb-muted)]">
        Escolhe uma categoria e adiciona o serviço. Se já estiver no orçamento, é acrescentada uma unidade.
      </p>
      {groups.map((group, index) => (
        <details
          key={group.category}
          open={index === 0}
          className="group overflow-hidden rounded-[20px] border border-[var(--bb-border)] bg-white/55"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-extrabold">
            <span>{group.category}</span>
            <span className="rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs text-[var(--bb-muted)]">
              {group.services.length}
            </span>
          </summary>
          <div className="grid gap-3 border-t border-[var(--bb-border)] p-3 md:grid-cols-2 xl:grid-cols-3">
            {group.services.map((service) => (
              <article
                key={service.id}
                className="flex min-h-40 flex-col rounded-[18px] border border-[var(--bb-border)] bg-white p-4"
              >
                <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--bb-muted)]">
                  {service.code} · por {service.unit}
                </div>
                <h3 className="mt-2 font-extrabold">{service.name}</h3>
                <p className="mt-1 flex-1 text-xs font-bold leading-5 text-[var(--bb-muted)]">
                  {service.summary || "Sem resumo comercial."}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[var(--bb-muted)]">Preço-base</div>
                    <div className="font-extrabold">{formatCommercialMoney(service.standard_price)}</div>
                  </div>
                  <form action={addCommercialQuoteItemAction.bind(null, quoteId)}>
                    <input type="hidden" name="service_id" value={service.id} />
                    <input type="hidden" name="quantity" value="1" />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Adicionar
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
