"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelectField } from "@/components/select-field";
import { getChecklistLabels, getSuggestedSetupTasks } from "@/lib/onboarding";
import { clientStatuses, clientTypes, serviceTypes, type TeamMember } from "@/lib/types";
import { clientStatusLabels, clientTypeLabels } from "@/lib/labels";

type ClientCreationResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string; clientId?: string };

type FormAction = (formData: FormData) => Promise<ClientCreationResult>;
type LinkField = {
  name: string;
  label: string;
  placeholder?: string;
};
type PlatformField = LinkField & {
  platform: string;
  other?: boolean;
};

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const compactInputClass =
  "bb-input min-h-10 px-3 py-2 text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const steps = [
  "Dados principais",
  "Plataformas e links",
  "Checklist inicial",
  "Resumo e criação",
];

const internalLinks: LinkField[] = [
  { name: "google_drive_url", label: "Google Drive" },
  { name: "onedrive_url", label: "OneDrive" },
  { name: "figma_project_url", label: "Figma" },
  { name: "brand_assets_url", label: "Brand assets" },
  { name: "content_calendar_url", label: "Calendário de conteúdos" },
  { name: "final_deliverables_url", label: "Pasta de entregáveis aprovados" },
];

const platformLinks: PlatformField[] = [
  { platform: "Website", name: "website_url", label: "Website" },
  { platform: "Instagram", name: "instagram_url", label: "Instagram" },
  { platform: "Facebook", name: "facebook_url", label: "Facebook" },
  { platform: "LinkedIn", name: "linkedin_url", label: "LinkedIn" },
  { platform: "TikTok", name: "tiktok_url", label: "TikTok" },
  { platform: "YouTube", name: "youtube_url", label: "YouTube" },
  { platform: "Meta Business Suite", name: "meta_url", label: "Meta Business Suite" },
  { platform: "Metricool", name: "metricool_url", label: "Metricool" },
  { platform: "CRM / Newsletter", name: "crm_newsletter_url", label: "CRM / Newsletter" },
  { platform: "Outro", name: "platform_other_url", label: "Outro", other: true },
];

const commercialLinks: LinkField[] = [
  { name: "proposal_url", label: "Proposta" },
  { name: "contract_url", label: "Contrato" },
  { name: "adjudication_url", label: "Adjudicação" },
  { name: "budget_url", label: "Orçamento" },
  { name: "other_documents_url", label: "Outros documentos" },
];

export function ClientSetupFlow({
  action,
  teamMembers,
}: {
  action: FormAction;
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([]);
  const [createInitialTasks, setCreateInitialTasks] = useState(false);
  const [selectedTaskTitles, setSelectedTaskTitles] = useState<string[]>(() => getSuggestedSetupTasks([]));
  const [formSnapshot, setFormSnapshot] = useState<Record<string, string>>({});
  const [activePlatforms, setActivePlatforms] = useState<Record<string, boolean>>({});
  const [openBlocks, setOpenBlocks] = useState({
    platforms: true,
    internal: false,
    legal: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [partialClientId, setPartialClientId] = useState<string | null>(null);
  const checklist = useMemo(() => getChecklistLabels(selectedServices), [selectedServices]);
  const setupTasks = useMemo(() => getSuggestedSetupTasks(selectedServices), [selectedServices]);
  const pendingChecklist = checklist.filter((item) => !selectedChecklist.includes(item));
  const ownerOptions = [
    { value: "", label: "Por definir" },
    ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
  ];

  function stopImplicitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function syncFormSnapshot() {
    window.requestAnimationFrame(() => {
      if (!formRef.current) return;
      const next: Record<string, string> = {};
      for (const [key, value] of new FormData(formRef.current).entries()) {
        if (typeof value === "string" && value.trim().length > 0) {
          next[key] = value.trim();
        }
      }
      setFormSnapshot(next);
    });
  }

  async function createClient() {
    if (!formRef.current || submittingRef.current || partialClientId) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const result = await action(new FormData(formRef.current));

      if (result.ok) {
        router.push(`/clients/${result.clientId}`);
        router.refresh();
        return;
      }

      setPartialClientId(result.clientId ?? null);
      setFormMessage(result.message);
    } catch (error) {
      console.error("Erro inesperado no fluxo de criação de cliente", {
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
      setFormMessage(error instanceof Error ? error.message : "Não foi possível criar o cliente.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function toggleService(service: string, checked: boolean) {
    setSelectedServices((current) => {
      if (checked) return Array.from(new Set([...current, service]));
      return current.filter((item) => item !== service);
    });
    syncFormSnapshot();
  }

  function toggleChecklistItem(item: string, checked: boolean) {
    setSelectedChecklist((current) => {
      if (checked) return Array.from(new Set([...current, item]));
      return current.filter((currentItem) => currentItem !== item);
    });
  }

  function toggleSetupTask(task: string, checked: boolean) {
    setSelectedTaskTitles((current) => {
      if (checked) return Array.from(new Set([...current, task]));
      return current.filter((currentTask) => currentTask !== task);
    });
  }

  function togglePlatform(platform: string, checked: boolean) {
    setActivePlatforms((current) => ({ ...current, [platform]: checked }));
    syncFormSnapshot();
  }

  function toggleBlock(block: keyof typeof openBlocks) {
    setOpenBlocks((current) => ({ ...current, [block]: !current[block] }));
  }

  return (
    <form
      ref={formRef}
      onSubmit={stopImplicitSubmit}
      onInput={syncFormSnapshot}
      onChange={syncFormSnapshot}
      className="grid gap-6"
    >
      <div className="rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4 shadow-[0_22px_62px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="grid gap-2 md:grid-cols-4">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setFormMessage(null);
                setStep(index);
              }}
              disabled={isSubmitting}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                step === index
                  ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
                  : "bg-white/50 text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[0_22px_62px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className={step === 0 ? "grid gap-4" : "hidden"}>
          <SectionTitle title="Dados principais" />
          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelClass}>
              Código cliente
              <input name="client_code" placeholder="02_I2030" className={inputClass} />
            </label>
            <label className={labelClass}>
              Nome curto
              <input name="short_name" placeholder="I2030" className={inputClass} />
            </label>
            <label className={labelClass}>
              Estado do cliente
              <SelectField
                name="status"
                defaultValue="setup"
                options={clientStatuses.map((status) => ({ value: status, label: clientStatusLabels[status] }))}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelClass}>
              Nome do cliente
              <input name="name" className={inputClass} />
            </label>
            <label className={labelClass}>
              Tipo de cliente
              <SelectField
                name="type"
                defaultValue="external"
                options={clientTypes.map((type) => ({ value: type, label: clientTypeLabels[type] }))}
              />
            </label>
            <label className={labelClass}>
              Responsável interno
              <SelectField name="owner_name" options={ownerOptions} />
            </label>
          </div>
          <label className={labelClass}>
            Logo URL
            <input name="logo_url" type="url" className={inputClass} />
            <span className="text-xs font-semibold text-[var(--bb-muted)]">
              Upload de logo será suportado numa fase seguinte.
            </span>
          </label>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className={labelClass}>
              Serviços contratados
              <input type="hidden" name="service_type" value={selectedServices[0] ?? ""} />
              <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 md:grid-cols-2">
                {serviceTypes.map((service) => (
                  <label key={service} className="flex items-center gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                    <input
                      name="service_types"
                      type="checkbox"
                      value={service}
                      checked={selectedServices.includes(service)}
                      onChange={(event) => toggleService(service, event.target.checked)}
                      className="size-4 accent-[var(--bb-primary)]"
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>
            <label className={labelClass}>
              Valor contratado
              <input
                name="contract_value"
                placeholder="Ex.: 400€/mês, 1.200€ projeto único, sob orçamento"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className={step === 1 ? "grid gap-3" : "hidden"}>
          <SectionTitle title="Canais, pastas e documentos" />
          <div className="rounded-[18px] border border-[rgba(236,254,84,0.5)] bg-[var(--bb-yellow-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
            Acessos e passwords devem ser recolhidos através de canal seguro, não na app.
          </div>
          <AccordionBlock
            title="Plataformas do cliente"
            description="Canais públicos, ferramentas de publicação e plataformas do cliente."
            open={openBlocks.platforms}
            onToggle={() => toggleBlock("platforms")}
          >
            <div className="grid gap-1.5 md:grid-cols-2 md:gap-x-5">
              {platformLinks.map((field) => (
                <PlatformRow
                  key={field.platform}
                  field={field}
                  active={Boolean(activePlatforms[field.platform])}
                  onToggle={togglePlatform}
                />
              ))}
            </div>
          </AccordionBlock>
          <AccordionBlock
            title="Trabalho interno"
            description="Pastas e ficheiros usados pela equipa BlendByte."
            open={openBlocks.internal}
            onToggle={() => toggleBlock("internal")}
          >
            <FieldsGrid fields={internalLinks} />
          </AccordionBlock>
          <AccordionBlock
            title="Documentos comerciais e legais"
            description="Propostas, contratos, adjudicações e documentos comerciais."
            open={openBlocks.legal}
            onToggle={() => toggleBlock("legal")}
          >
            <FieldsGrid fields={commercialLinks} />
          </AccordionBlock>
        </div>

        <div className={step === 2 ? "grid gap-4" : "hidden"}>
          <SectionTitle title="Checklist inicial" />
          <p className="text-sm font-semibold text-[var(--bb-muted)]">
            Itens a fazer no arranque. Não são marcados como concluídos por defeito.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {checklist.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/45 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]"
              >
                <input
                  name="setup_checklist"
                  type="checkbox"
                  value={item}
                  checked={selectedChecklist.includes(item)}
                  onChange={(event) => toggleChecklistItem(item, event.target.checked)}
                  className="size-4 accent-[var(--bb-primary)]"
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        <div className={step === 3 ? "grid gap-5" : "hidden"}>
          <SectionTitle title="Resumo e criação" />

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Resumo do cliente</h3>
            <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryValue label="Nome" value={formSnapshot.name} />
              <SummaryValue label="Código" value={formSnapshot.client_code} />
              <SummaryValue label="Nome curto" value={formSnapshot.short_name} />
              <SummaryValue label="Tipo" value={clientTypeLabels[(formSnapshot.type as keyof typeof clientTypeLabels) || "external"]} />
              <SummaryValue label="Responsável interno" value={formSnapshot.owner_name} />
              <SummaryValue label="Estado" value={clientStatusLabels[(formSnapshot.status as keyof typeof clientStatusLabels) || "setup"]} />
              <SummaryValue label="Serviços contratados" value={selectedServices.join(", ")} />
              <SummaryValue label="Valor contratado" value={formSnapshot.contract_value} />
            </div>
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Resumo de links</h3>
            <div className="grid gap-3 lg:grid-cols-3">
              <LinkSummary
                title="Plataformas do cliente"
                links={filledLinks(platformLinks, formSnapshot, activePlatforms)}
              />
              <LinkSummary title="Trabalho interno" links={filledLinks(internalLinks, formSnapshot)} />
              <LinkSummary
                title="Documentos comerciais e legais"
                links={filledLinks(commercialLinks, formSnapshot)}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Resumo da checklist</h3>
            <div className="rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-4">
              <p className="text-sm font-bold text-[var(--bb-charcoal)]">
                {selectedChecklist.length} de {checklist.length} itens marcados
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {pendingChecklist.length ? (
                  pendingChecklist.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/70 px-3 py-2 text-xs font-bold text-[var(--bb-muted)]"
                    >
                      Pendente: {item}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bb-primary-soft)] px-3 py-2 text-xs font-extrabold text-[var(--bb-black)]">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Checklist completa
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Tarefas iniciais</h3>
            <label className="flex items-center gap-3 rounded-[18px] border border-[var(--bb-border)] bg-white/45 px-4 py-3 text-sm font-extrabold text-[var(--bb-charcoal)]">
              <input
                name="generate_initial_tasks"
                type="checkbox"
                checked={createInitialTasks}
                onChange={(event) => setCreateInitialTasks(event.target.checked)}
                className="size-5 accent-[var(--bb-primary)]"
              />
              Criar tarefas iniciais
            </label>
            {createInitialTasks ? (
              <div className="grid gap-2 md:grid-cols-2">
                {setupTasks.map((task) => (
                  <label
                    key={task}
                    className="flex items-center gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/45 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]"
                  >
                    <input
                      name="setup_tasks"
                      type="checkbox"
                      value={task}
                      checked={selectedTaskTitles.includes(task)}
                      onChange={(event) => toggleSetupTask(task, event.target.checked)}
                      className="size-4 accent-[var(--bb-primary)]"
                    />
                    {task}
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <label className={labelClass}>
            Notas
            <textarea name="notes" className="bb-textarea text-sm font-medium" />
          </label>
        </div>
      </section>

      {formMessage ? (
        <div
          role="alert"
          className="rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]"
        >
          {formMessage}
          {partialClientId ? (
            <span className="mt-1 block text-xs">
              O cliente já existe. Revê as tarefas iniciais antes de avançar para o perfil.
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setFormMessage(null);
            setStep((current) => Math.max(0, current - 1));
          }}
          disabled={step === 0 || isSubmitting}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Anterior
        </button>

        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              setFormMessage(null);
              setStep((current) => Math.min(steps.length - 1, current + 1));
            }}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Seguinte
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={createClient}
            disabled={isSubmitting || Boolean(partialClientId)}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--bb-black)] px-5 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "A criar..." : "Criar cliente"}
          </button>
        )}
      </div>
    </form>
  );
}

function SummaryValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[var(--bb-charcoal)]">{value || "-"}</p>
    </div>
  );
}

function filledLinks(
  fields: Array<LinkField | PlatformField>,
  values: Record<string, string>,
  activePlatforms?: Record<string, boolean>,
) {
  return fields
    .filter((field) => {
      const platform = "platform" in field ? field.platform : null;
      if (!platform || !activePlatforms) return Boolean(values[field.name]);
      return Boolean(activePlatforms[platform] && values[field.name]);
    })
    .map((field) => ({
      label:
        "other" in field && field.other && values.platform_other_name
          ? values.platform_other_name
          : field.label,
      url: values[field.name],
    }));
}

function LinkSummary({ title, links }: { title: string; links: { label: string; url: string }[] }) {
  return (
    <div className="rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-4">
      <p className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</p>
      {links.length ? (
        <div className="mt-3 grid gap-2">
          {links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="truncate rounded-full bg-white/70 px-3 py-2 text-xs font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[var(--bb-muted)]">Sem links preenchidos.</p>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">{title}</h2>;
}

function AccordionBlock({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[18px] border bg-white/35 transition ${
        open ? "border-[rgba(83,183,223,0.42)] shadow-[0_12px_32px_rgba(0,0,0,0.04)]" : "border-[var(--bb-border)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/35 ${
          open ? "bg-[rgba(83,183,223,0.08)]" : ""
        }`}
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</span>
          <span className="mt-0.5 block text-xs font-semibold text-[var(--bb-muted)]">{description}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--bb-muted)] transition ${open ? "rotate-180 text-[var(--bb-charcoal)]" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div className={`border-t border-[var(--bb-border)] bg-white/25 px-4 pb-3 pt-3 ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

function FieldsGrid({ fields }: { fields: LinkField[] }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {fields.map((field) => (
        <label key={field.name} className="grid gap-1.5 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
          {field.label}
          <input
            name={field.name}
            type="url"
            placeholder="Colar link"
            className={`${compactInputClass} w-full md:max-w-[380px]`}
          />
        </label>
      ))}
    </div>
  );
}

function PlatformRow({
  field,
  active,
  onToggle,
}: {
  field: PlatformField;
  active: boolean;
  onToggle: (platform: string, checked: boolean) => void;
}) {
  return (
    <div
      className={`rounded-[14px] border px-3 py-1.5 transition hover:bg-white/50 ${
        active ? "border-[rgba(83,183,223,0.44)] bg-white/70" : "border-transparent bg-transparent"
      }`}
    >
      <div className="flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="flex min-h-8 min-w-0 flex-[0_0_170px] items-center gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
          <input
            name="platforms"
            type="checkbox"
            value={field.platform}
            checked={active}
            onChange={(event) => onToggle(field.platform, event.target.checked)}
            className="size-4 accent-[var(--bb-primary)]"
          />
          <span className="truncate">{field.platform}</span>
        </label>
        {active ? (
          field.other ? (
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(90px,130px)_minmax(0,180px)]">
              <input name="platform_other_name" placeholder="Nome" className={`${compactInputClass} w-full`} />
              <input name={field.name} type="url" placeholder="Colar link" className={`${compactInputClass} w-full`} />
            </div>
          ) : (
            <input
              name={field.name}
              type="url"
              placeholder="Colar link"
              className={`${compactInputClass} min-w-0 flex-1 sm:max-w-[220px] lg:max-w-[260px]`}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
