import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import {
  commercialOpportunitySourceLabels,
  commercialOpportunityStatusLabels,
  commercialQuoteStatusLabels,
  commercialServiceCategories,
  commercialServicePriceStatusLabels,
  formatCommercialMoney,
} from "@/lib/commercial";
import {
  commercialOpportunitySources,
  commercialOpportunityStatuses,
  commercialQuoteStatuses,
  commercialServicePriceStatuses,
  type Client,
  type CommercialOpportunity,
  type CommercialQuote,
  type CommercialService,
} from "@/lib/types";

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const textareaClass = "bb-textarea text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]";

export function CommercialServiceForm({
  action,
  service,
}: {
  action: (formData: FormData) => Promise<void>;
  service?: CommercialService;
}) {
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[0.7fr_1fr_1.6fr]">
        <label className={labelClass}>
          Código
          <input name="code" required defaultValue={service?.code ?? ""} placeholder="SOC-BASE" className={inputClass} />
        </label>
        <label className={labelClass}>
          Categoria
          <SelectField
            name="category"
            required
            defaultValue={service?.category ?? commercialServiceCategories[0]}
            options={commercialServiceCategories.map((category) => ({ value: category, label: category }))}
          />
        </label>
        <label className={labelClass}>
          Nome do serviço
          <input name="name" required defaultValue={service?.name ?? ""} className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Resumo comercial
        <textarea name="summary" defaultValue={service?.summary ?? ""} rows={2} className={textareaClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className={labelClass}>
          Unidade
          <input name="unit" required defaultValue={service?.unit ?? "projeto"} placeholder="mês, peça..." className={inputClass} />
        </label>
        <label className={labelClass}>
          Preço-base
          <input name="standard_price" required type="number" min="0" step="0.01" defaultValue={service?.standard_price ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Preço mínimo
          <input name="minimum_price" required type="number" min="0" step="0.01" defaultValue={service?.minimum_price ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Estado do preço
          <SelectField
            name="price_status"
            defaultValue={service?.price_status ?? "draft"}
            options={commercialServicePriceStatuses.map((status) => ({
              value: status,
              label: commercialServicePriceStatusLabels[status],
            }))}
          />
        </label>
        <label className={labelClass}>
          Versão
          <input name="version_label" required defaultValue={service?.version_label ?? "v0.1"} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Inclui
          <textarea name="inclusions" defaultValue={service?.inclusions ?? ""} rows={4} className={textareaClass} />
        </label>
        <label className={labelClass}>
          Não inclui
          <textarea name="exclusions" defaultValue={service?.exclusions ?? ""} rows={4} className={textareaClass} />
        </label>
      </div>

      <label className={labelClass}>
        Notas internas
        <textarea name="internal_notes" defaultValue={service?.internal_notes ?? ""} rows={3} className={textareaClass} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-extrabold">
            <input name="active" type="checkbox" defaultChecked={service?.active ?? true} className="size-4 accent-[var(--bb-primary)]" />
            Serviço ativo
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-[var(--bb-muted)]">
            Ordem
            <input name="sort_order" type="number" defaultValue={service?.sort_order ?? 0} className={`${inputClass} w-24`} />
          </label>
        </div>
        <button className={primaryButton}>{service ? "Guardar serviço" : "Criar serviço"}</button>
      </div>
    </form>
  );
}

export function CommercialOpportunityForm({
  action,
  clients,
  opportunity,
}: {
  action: (formData: FormData) => Promise<void>;
  clients: Client[];
  opportunity?: CommercialOpportunity;
}) {
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <label className={labelClass}>
          Empresa
          <input name="company_name" required defaultValue={opportunity?.company_name ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Origem
          <SelectField
            name="source"
            defaultValue={opportunity?.source ?? "direct"}
            options={commercialOpportunitySources.map((source) => ({
              value: source,
              label: commercialOpportunitySourceLabels[source],
            }))}
          />
        </label>
        <label className={labelClass}>
          Estado
          <SelectField
            name="status"
            defaultValue={opportunity?.status ?? "qualification"}
            options={commercialOpportunityStatuses.map((status) => ({
              value: status,
              label: commercialOpportunityStatusLabels[status],
            }))}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Pessoa de contacto
          <input name="contact_name" defaultValue={opportunity?.contact_name ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Email
          <input name="contact_email" type="email" defaultValue={opportunity?.contact_email ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Telefone
          <input name="contact_phone" type="tel" defaultValue={opportunity?.contact_phone ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Detalhe da origem
          <input name="source_detail" defaultValue={opportunity?.source_detail ?? ""} placeholder="Consultor, parceiro..." className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Ligação a cliente já existente
        <SelectField
          name="client_id"
          defaultValue={opportunity?.client_id ?? ""}
          options={[
            { value: "", label: "Ainda não é cliente" },
            ...clients.map((client) => ({
              value: client.id,
              label: `${client.client_code ? `${client.client_code} · ` : ""}${client.name}`,
            })),
          ]}
        />
      </label>

      <section className="grid gap-4 rounded-[20px] border border-[var(--bb-border)] bg-[var(--bb-primary-soft)]/45 p-4">
        <label className="inline-flex items-center gap-3 text-sm font-extrabold">
          <input name="is_funded" type="checkbox" defaultChecked={opportunity?.is_funded ?? false} className="size-5 accent-[var(--bb-primary)]" />
          Projeto com financiamento
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>
            Programa
            <input name="funding_program" defaultValue={opportunity?.funding_program ?? ""} placeholder="Portugal 2030..." className={inputClass} />
          </label>
          <label className={labelClass}>
            Aviso
            <input name="funding_notice" defaultValue={opportunity?.funding_notice ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Investimento elegível para marketing
            <input name="eligible_marketing_budget" type="number" min="0" step="0.01" defaultValue={opportunity?.eligible_marketing_budget ?? ""} className={inputClass} />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Início da execução
            <DatePicker name="execution_start" defaultValue={opportunity?.execution_start} ariaLabel="Início da execução" />
          </label>
          <label className={labelClass}>
            Fim da execução
            <DatePicker name="execution_end" defaultValue={opportunity?.execution_end} ariaLabel="Fim da execução" />
          </label>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Objetivos e necessidades
          <textarea name="objectives" defaultValue={opportunity?.objectives ?? ""} rows={4} className={textareaClass} />
        </label>
        <label className={labelClass}>
          Notas internas
          <textarea name="notes" defaultValue={opportunity?.notes ?? ""} rows={4} className={textareaClass} />
        </label>
      </div>

      <div className="flex justify-end">
        <button className={primaryButton}>{opportunity ? "Guardar oportunidade" : "Criar oportunidade"}</button>
      </div>
    </form>
  );
}

export function CommercialQuoteForm({
  action,
  opportunities,
}: {
  action: (formData: FormData) => Promise<void>;
  opportunities: CommercialOpportunity[];
}) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Oportunidade
          <SelectField
            name="opportunity_id"
            required
            defaultValue={opportunities[0]?.id ?? ""}
            options={opportunities.map((opportunity) => ({
              value: opportunity.id,
              label: `${opportunity.company_name}${opportunity.is_funded ? " · financiado" : ""}`,
            }))}
          />
        </label>
        <label className={labelClass}>
          Título
          <input name="title" required defaultValue="Proposta de serviços de marketing" className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Validade
        <DatePicker name="valid_until" ariaLabel="Validade do orçamento" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Notas de financiamento
          <textarea name="funding_notes" rows={3} placeholder="Mapeamento do aviso, condicionantes..." className={textareaClass} />
        </label>
        <label className={labelClass}>
          Condições comerciais
          <textarea name="commercial_conditions" rows={3} placeholder="Pagamento, validade, exclusões gerais..." className={textareaClass} />
        </label>
      </div>
      <label className={labelClass}>
        Notas internas
        <textarea name="internal_notes" rows={2} className={textareaClass} />
      </label>
      <div className="flex justify-end">
        <button disabled={!opportunities.length} className={`${primaryButton} disabled:opacity-40`}>
          Criar orçamento
        </button>
      </div>
    </form>
  );
}

export function CommercialQuoteEditForm({
  action,
  quote,
}: {
  action: (formData: FormData) => Promise<void>;
  quote: CommercialQuote;
}) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
        <label className={labelClass}>
          Título
          <input name="title" required defaultValue={quote.title} className={inputClass} />
        </label>
        <label className={labelClass}>
          Estado
          <SelectField
            name="status"
            defaultValue={quote.status}
            options={commercialQuoteStatuses.map((status) => ({
              value: status,
              label: commercialQuoteStatusLabels[status],
            }))}
          />
        </label>
        <label className={labelClass}>
          Validade
          <DatePicker name="valid_until" defaultValue={quote.valid_until} ariaLabel="Validade do orçamento" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Notas de financiamento
          <textarea name="funding_notes" defaultValue={quote.funding_notes ?? ""} rows={3} className={textareaClass} />
        </label>
        <label className={labelClass}>
          Condições comerciais
          <textarea name="commercial_conditions" defaultValue={quote.commercial_conditions ?? ""} rows={3} className={textareaClass} />
        </label>
      </div>
      <label className={labelClass}>
        Notas internas
        <textarea name="internal_notes" defaultValue={quote.internal_notes ?? ""} rows={2} className={textareaClass} />
      </label>
      <div className="flex justify-end">
        <button className={primaryButton}>Guardar orçamento</button>
      </div>
    </form>
  );
}

export function CommercialQuoteItemForm({
  action,
  services,
  funded,
}: {
  action: (formData: FormData) => Promise<void>;
  services: CommercialService[];
  funded: boolean;
}) {
  const activeServices = services.filter((service) => service.active && service.price_status !== "archived");
  return (
    <form action={action} className="grid gap-4">
      <label className={labelClass}>
        Serviço do catálogo
        <SelectField
          name="service_id"
          required
          defaultValue={activeServices[0]?.id ?? ""}
          options={activeServices.map((service) => ({
            value: service.id,
            label: `${service.code} · ${service.name} · ${formatCommercialMoney(service.standard_price)}/${service.unit}`,
          }))}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Quantidade
          <input name="quantity" required type="number" min="0.01" step="0.01" defaultValue="1" className={inputClass} />
        </label>
        <label className={labelClass}>
          Preço unitário
          <input name="unit_price" type="number" min="0" step="0.01" placeholder="Vazio = preço-base" className={inputClass} />
        </label>
        <label className={labelClass}>
          Justificação se abaixo do mínimo
          <input name="price_override_reason" placeholder="Obrigatória apenas em exceções" className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Descrição específica desta linha
        <textarea name="description" rows={2} placeholder="Vazio = resumo do catálogo" className={textareaClass} />
      </label>
      {funded ? (
        <div className="grid gap-4 rounded-[20px] border border-[var(--bb-border)] bg-[var(--bb-primary-soft)]/45 p-4 md:grid-cols-2">
          <label className={labelClass}>
            Categoria elegível
            <input name="eligible_category" placeholder="Categoria exata do aviso" className={inputClass} />
          </label>
          <label className={labelClass}>
            Evidências necessárias
            <input name="evidence_notes" placeholder="Relatórios, comprovativos, entregáveis..." className={inputClass} />
          </label>
        </div>
      ) : null}
      <label className={labelClass}>
        Nota interna da linha
        <input name="internal_notes" className={inputClass} />
      </label>
      <div className="flex justify-end">
        <button disabled={!activeServices.length} className={`${primaryButton} disabled:opacity-40`}>
          Adicionar linha
        </button>
      </div>
    </form>
  );
}
