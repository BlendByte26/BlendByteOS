import { Save, Trash2 } from "lucide-react";
import {
  removeCommercialQuoteItemAction,
  updateCommercialQuoteItemAction,
} from "@/lib/commercial-actions";
import {
  commercialQuoteItemTotal,
  formatCommercialMoney,
} from "@/lib/commercial";
import type { CommercialQuoteItem } from "@/lib/types";

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const textareaClass = "bb-textarea text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";

export function CommercialQuoteItemsEditor({
  quoteId,
  items,
  funded,
}: {
  quoteId: string;
  items: CommercialQuoteItem[];
  funded: boolean;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[22px] border border-[var(--bb-border)] bg-white/65 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.04)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold">{item.service_name}</h3>
              <p className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                {item.service_code} · {item.category} · por {item.unit} · base{" "}
                {formatCommercialMoney(item.standard_unit_price)}
              </p>
            </div>
            <form action={removeCommercialQuoteItemAction.bind(null, quoteId, item.id)}>
              <button
                type="submit"
                aria-label={`Remover ${item.service_name}`}
                title="Remover serviço"
                className="inline-grid size-9 place-items-center rounded-full border border-[rgba(232,76,49,0.28)] bg-white text-[#9f493c] hover:bg-[var(--bb-red-soft)]"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <form
            action={updateCommercialQuoteItemAction.bind(null, quoteId, item.id)}
            className="mt-4 grid gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={labelClass}>
                Quantidade
                <input
                  name="quantity"
                  required
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  defaultValue={item.quantity}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Preço unitário
                <input
                  name="unit_price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.unit_price}
                  className={inputClass}
                />
              </label>
              <div className="grid content-end gap-2 rounded-[16px] bg-[var(--bb-primary-soft)] px-4 py-3">
                <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--bb-muted)]">
                  Total da linha
                </span>
                <strong className="text-xl">{formatCommercialMoney(commercialQuoteItemTotal(item))}</strong>
              </div>
            </div>

            <label className={labelClass}>
              Justificação se ficar abaixo do mínimo
              <input
                name="price_override_reason"
                defaultValue={item.price_override_reason ?? ""}
                placeholder="Obrigatória apenas em exceções"
                className={inputClass}
              />
            </label>

            <details>
              <summary className="cursor-pointer list-none text-sm font-extrabold text-[var(--bb-muted)]">
                Descrição e notas da linha
              </summary>
              <div className="mt-4 grid gap-4 border-t border-[var(--bb-border)] pt-4">
                <label className={labelClass}>
                  Descrição
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={item.description ?? ""}
                    className={textareaClass}
                  />
                </label>
                {funded ? (
                  <div className="grid gap-4 rounded-[18px] bg-[var(--bb-primary-soft)]/45 p-4 md:grid-cols-2">
                    <label className={labelClass}>
                      Categoria elegível
                      <input
                        name="eligible_category"
                        defaultValue={item.eligible_category ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Evidências necessárias
                      <input
                        name="evidence_notes"
                        defaultValue={item.evidence_notes ?? ""}
                        className={inputClass}
                      />
                    </label>
                  </div>
                ) : null}
                <label className={labelClass}>
                  Nota interna
                  <input
                    name="internal_notes"
                    defaultValue={item.internal_notes ?? ""}
                    className={inputClass}
                  />
                </label>
              </div>
            </details>

            <div className="flex justify-end">
              <button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]">
                <Save className="size-4" aria-hidden="true" />
                Guardar linha
              </button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
