"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { ArrowUpRight, Check, History } from "lucide-react";
import { DatePicker, MonthPicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { invest2030PublicHref } from "@/lib/invest2030-public";
import {
  invest2030ActionTypes,
  invest2030InformationStatuses,
  invest2030MainGoals,
  invest2030PeriodTypes,
  invest2030Requesters,
  type Invest2030PeriodType,
  type Invest2030Request,
} from "@/lib/types";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const textAreaClass = "bb-textarea text-sm font-medium placeholder:text-[var(--bb-muted)]";

function options(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

function ActionTypeMultiSelect() {
  const [selected, setSelected] = useState<string[]>(["Webinar"]);

  function toggle(value: string) {
    setSelected((current) => {
      if (current.includes(value)) {
        return current.length === 1 ? current : current.filter((item) => item !== value);
      }

      return [...current, value];
    });
  }

  return (
    <fieldset className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
      <legend>Tipo de ação</legend>
      <div className="flex flex-wrap gap-2">
        {invest2030ActionTypes.map((value) => {
          const checked = selected.includes(value);

          return (
            <label
              key={value}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-extrabold transition ${
                checked
                  ? "border-[rgba(83,183,223,0.58)] bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                  : "border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
              }`}
            >
              <input
                type="checkbox"
                name="action_type"
                value={value}
                checked={checked}
                onChange={() => toggle(value)}
                className="sr-only"
              />
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current">
                {checked ? <Check className="size-3" aria-hidden="true" /> : null}
              </span>
              <span>{value}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-full bg-[var(--bb-black)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "A criar..." : "Criar pedido"}
    </button>
  );
}

export function Invest2030RequestForm({ action, accessToken }: { action: FormAction; accessToken: string }) {
  const [periodType, setPeriodType] = useState<Invest2030PeriodType>("Dia específico");

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="access" value={accessToken} />
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/48 px-3 py-2">
        <span className="text-sm font-bold text-[var(--bb-muted)]">Pedido rápido Invest2030</span>
        <Link
          href={invest2030PublicHref("/invest2030/pedidos", accessToken)}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <History className="size-4" aria-hidden="true" />
          Ver histórico completo
        </Link>
      </div>

      <label className={labelClass}>
        Nome da campanha
        <input
          name="campaign_name"
          required
          placeholder="Webinar Incentivos Base Territorial — Julho 2026"
          className={inputClass}
        />
      </label>

      <ActionTypeMultiSelect />

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Quem está a pedir?
          <SelectField name="requested_by" required options={options(invest2030Requesters)} />
        </label>
        <label className={labelClass}>
          Tipo de período
          <SelectField
            name="period_type"
            required
            value={periodType}
            onValueChange={(value) => setPeriodType(value as Invest2030PeriodType)}
            options={options(invest2030PeriodTypes)}
          />
        </label>
      </div>

      {periodType === "Dia específico" ? (
        <label className={`${labelClass} max-w-sm`}>
          Data
          <DatePicker name="period_date" required ariaLabel="Data do pedido" />
        </label>
      ) : null}

      {periodType === "Semana" || periodType === "Período personalizado" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Data de início
            <DatePicker name="period_start" required ariaLabel="Data de início" />
          </label>
          <label className={labelClass}>
            Data de fim
            <DatePicker name="period_end" required ariaLabel="Data de fim" />
          </label>
        </div>
      ) : null}

      {periodType === "Mês" ? (
        <label className={`${labelClass} max-w-sm`}>
          Mês
          <MonthPicker name="period_month" required ariaLabel="Mês do pedido" />
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Objetivo principal
          <SelectField name="main_goal" required options={options(invest2030MainGoals)} />
        </label>
        <label className={labelClass}>
          Estado da informação
          <SelectField name="information_status" required options={options(invest2030InformationStatuses)} />
        </label>
      </div>

      <label className={labelClass}>
        Público-alvo / segmentação
        <textarea
          name="target_audience"
          required
          placeholder="PME industriais no Norte, empresas de turismo, empresas do distrito de Lisboa, microempresas com investimento previsto, setor/CAE específico, etc."
          className={textAreaClass}
        />
      </label>

      <label className={labelClass}>
        Texto do botão principal
        <input
          name="main_cta"
          required
          placeholder="Inscrever no webinar, Marcar reunião, Pedir avaliação..."
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Link do botão principal
        <input
          name="main_link"
          placeholder="Link do webinar, página do incentivo, calendário, formulário ou landing page."
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Tema / mensagem principal
        <textarea
          name="main_message"
          required
          placeholder="Em poucas frases, explica o que a campanha deve comunicar."
          className={textAreaClass}
        />
      </label>

      <label className={labelClass}>
        Informação obrigatória a mencionar
        <textarea
          name="mandatory_info"
          required
          placeholder="Prazo, taxa de apoio, entidades elegíveis, data/hora do webinar, orador, benefício principal, urgência ou região abrangida."
          className={textAreaClass}
        />
      </label>

      <label className={labelClass}>
        Observações
        <textarea name="notes" className={textAreaClass} />
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <SubmitButton />
        <Link
          href={invest2030PublicHref("/invest2030/pedidos", accessToken)}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] px-5 text-sm font-bold text-[var(--bb-charcoal)] transition duration-200 hover:bg-[var(--bb-primary-hover)]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function Invest2030RecentRequests({
  accessToken,
  requests,
}: {
  accessToken: string;
  requests: Invest2030Request[];
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-bold leading-6 text-[var(--bb-muted)]">
        Antes de criares um novo pedido, confirma se já existe algum pedido semelhante.
      </p>
      {requests.length ? (
        <div className="grid gap-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[16px] border border-[var(--bb-border)] bg-white/58 px-3 py-2"
            >
              <div className="bb-line-clamp-2 text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
                {request.campaign_name}
              </div>
              <div className="mt-1 grid gap-1 text-xs font-bold text-[var(--bb-muted)]">
                <span>{request.action_type}</span>
                <span>{request.period_label}</span>
                <span>{request.requested_by}</span>
                <span>{request.information_status}</span>
              </div>
              <div className="mt-2">
                <Link
                  href={invest2030PublicHref("/invest2030/pedidos", accessToken, { search: request.campaign_name })}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                >
                  Ver
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-dashed border-[var(--bb-border)] bg-white/38 px-3 py-3 text-sm font-bold text-[var(--bb-muted)]">
          Ainda não existem pedidos Invest2030.
        </div>
      )}
    </div>
  );
}
