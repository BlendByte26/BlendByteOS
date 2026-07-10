"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useActionState, useMemo, useState } from "react";
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
  type Invest2030RequestFormField,
  type Invest2030RequestFormState,
} from "@/lib/types";

type FormAction = (
  previousState: Invest2030RequestFormState,
  formData: FormData,
) => Invest2030RequestFormState | Promise<Invest2030RequestFormState>;

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const textAreaClass = "bb-textarea text-sm font-medium placeholder:text-[var(--bb-muted)]";
const errorInputClass = "border-[#e69a18] bg-[#fffaf0] shadow-[0_0_0_4px_rgba(230,154,24,0.12)]";

const initialFormState: Invest2030RequestFormState = {
  status: "idle",
};

function options(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <span className="text-xs font-extrabold leading-5 text-[#9b5b00]">{message}</span>;
}

function ActionTypeMultiSelect({
  defaultSelected,
  error,
}: {
  defaultSelected?: string[];
  error?: string;
}) {
  const initialSelected = useMemo(
    () => (defaultSelected?.length ? defaultSelected : ["Webinar"]),
    [defaultSelected],
  );
  const [selected, setSelected] = useState<string[]>(initialSelected);

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
      <FieldError message={error} />
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
  const [state, formAction] = useActionState(action, initialFormState);
  const values = state.values;
  const fieldErrors = state.fieldErrors ?? {};
  const [periodType, setPeriodType] = useState<Invest2030PeriodType>(
    (values?.period_type as Invest2030PeriodType | undefined) ?? "Dia específico",
  );

  function inputState(field: Invest2030RequestFormField) {
    return fieldErrors[field] ? errorInputClass : "";
  }

  return (
    <form key={state.submissionKey ?? "new"} action={formAction} noValidate className="grid gap-4">
      <input type="hidden" name="access" value={accessToken} />
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.message ? (
        <div className="rounded-[18px] border border-[#f3c56a] bg-[#fff6dd] px-4 py-3 text-sm font-bold leading-6 text-[#6f4a00]">
          {state.message}
        </div>
      ) : null}
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
          defaultValue={values?.campaign_name ?? ""}
          placeholder="Webinar Incentivos Base Territorial — Julho 2026"
          aria-invalid={Boolean(fieldErrors.campaign_name)}
          className={`${inputClass} ${inputState("campaign_name")}`}
        />
        <FieldError message={fieldErrors.campaign_name} />
      </label>

      <ActionTypeMultiSelect defaultSelected={values?.action_type} error={fieldErrors.action_type} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Quem está a pedir?
          <SelectField
            name="requested_by"
            required
            defaultValue={values?.requested_by}
            options={options(invest2030Requesters)}
          />
          <FieldError message={fieldErrors.requested_by} />
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
          <FieldError message={fieldErrors.period_type} />
        </label>
      </div>

      {periodType === "Dia específico" ? (
        <label className={`${labelClass} max-w-sm`}>
          Data
          <DatePicker name="period_date" defaultValue={values?.period_date} required ariaLabel="Data do pedido" />
          <FieldError message={fieldErrors.period_date} />
        </label>
      ) : null}

      {periodType === "Semana" || periodType === "Período personalizado" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Data de início
            <DatePicker name="period_start" defaultValue={values?.period_start} required ariaLabel="Data de início" />
            <FieldError message={fieldErrors.period_start} />
          </label>
          <label className={labelClass}>
            Data de fim
            <DatePicker name="period_end" defaultValue={values?.period_end} required ariaLabel="Data de fim" />
            <FieldError message={fieldErrors.period_end} />
          </label>
        </div>
      ) : null}

      {periodType === "Mês" ? (
        <label className={`${labelClass} max-w-sm`}>
          Mês
          <MonthPicker name="period_month" defaultValue={values?.period_month} required ariaLabel="Mês do pedido" />
          <FieldError message={fieldErrors.period_month} />
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Objetivo principal
          <SelectField name="main_goal" required defaultValue={values?.main_goal} options={options(invest2030MainGoals)} />
          <FieldError message={fieldErrors.main_goal} />
        </label>
        <label className={labelClass}>
          Estado da informação
          <SelectField
            name="information_status"
            required
            defaultValue={values?.information_status}
            options={options(invest2030InformationStatuses)}
          />
          <FieldError message={fieldErrors.information_status} />
        </label>
      </div>

      <label className={labelClass}>
        Público-alvo / segmentação
        <textarea
          name="target_audience"
          required
          defaultValue={values?.target_audience ?? ""}
          placeholder="PME industriais no Norte, empresas de turismo, empresas do distrito de Lisboa, microempresas com investimento previsto, setor/CAE específico, etc."
          aria-invalid={Boolean(fieldErrors.target_audience)}
          className={`${textAreaClass} ${inputState("target_audience")}`}
        />
        <FieldError message={fieldErrors.target_audience} />
      </label>

      <label className={labelClass}>
        Texto do botão principal
        <input
          name="main_cta"
          required
          defaultValue={values?.main_cta ?? ""}
          placeholder="Inscrever no webinar, Marcar reunião, Pedir avaliação..."
          aria-invalid={Boolean(fieldErrors.main_cta)}
          className={`${inputClass} ${inputState("main_cta")}`}
        />
        <FieldError message={fieldErrors.main_cta} />
      </label>

      <label className={labelClass}>
        Link do botão principal
        <input
          name="main_link"
          defaultValue={values?.main_link ?? ""}
          placeholder="Link do webinar, página do incentivo, calendário, formulário ou landing page."
          className={`${inputClass} ${inputState("main_link")}`}
        />
        <FieldError message={fieldErrors.main_link} />
      </label>

      <label className={labelClass}>
        Tema / mensagem principal
        <textarea
          name="main_message"
          required
          defaultValue={values?.main_message ?? ""}
          placeholder="Em poucas frases, explica o que a campanha deve comunicar."
          aria-invalid={Boolean(fieldErrors.main_message)}
          className={`${textAreaClass} ${inputState("main_message")}`}
        />
        <FieldError message={fieldErrors.main_message} />
      </label>

      <label className={labelClass}>
        Informação obrigatória a mencionar
        <textarea
          name="mandatory_info"
          required
          defaultValue={values?.mandatory_info ?? ""}
          placeholder="Prazo, taxa de apoio, entidades elegíveis, data/hora do webinar, orador, benefício principal, urgência ou região abrangida."
          aria-invalid={Boolean(fieldErrors.mandatory_info)}
          className={`${textAreaClass} ${inputState("mandatory_info")}`}
        />
        <FieldError message={fieldErrors.mandatory_info} />
      </label>

      <label className={labelClass}>
        Observações
        <textarea name="notes" defaultValue={values?.notes ?? ""} className={textAreaClass} />
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
