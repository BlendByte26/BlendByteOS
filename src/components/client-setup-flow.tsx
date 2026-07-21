"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/date-picker";
import { ClientLogoEditor, type PrepareClientLogo } from "@/components/client-logo-editor";
import {
  ClientColorField,
  ClientFormSection,
  ClientLinkFields,
  ClientPlatformsField,
  ClientServicesField,
} from "@/components/client-fields";
import { SelectField } from "@/components/select-field";
import { buildClientCode, clientLinkGroups, normalizeClientShortName } from "@/lib/client-profile";
import { getSuggestedSetupTasks } from "@/lib/onboarding";
import { clientStatuses, clientTypes, type TeamMember } from "@/lib/types";
import { clientStatusLabels, clientTypeLabels } from "@/lib/labels";

type ClientCreationResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string; clientId?: string };

type FormAction = (formData: FormData) => Promise<ClientCreationResult>;

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const steps = ["Dados principais", "Marca e recursos", "Resumo e criação"];

export function ClientSetupFlow({
  action,
  teamMembers,
  nextDisplayOrder,
}: {
  action: FormAction;
  teamMembers: TeamMember[];
  nextDisplayOrder: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const prepareLogoRef = useRef<PrepareClientLogo | null>(null);
  const submittingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [maximumStep, setMaximumStep] = useState(0);
  const [clientName, setClientName] = useState("");
  const [shortName, setShortName] = useState("");
  const [shortNameEdited, setShortNameEdited] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [createInitialTasks, setCreateInitialTasks] = useState(false);
  const [selectedTaskTitles, setSelectedTaskTitles] = useState<string[]>(() => getSuggestedSetupTasks([]));
  const [formSnapshot, setFormSnapshot] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [partialClientId, setPartialClientId] = useState<string | null>(null);
  const setupTasks = useMemo(() => getSuggestedSetupTasks(selectedServices), [selectedServices]);
  const ownerOptions = [
    { value: "", label: "Por definir" },
    ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
  ];
  const previewCode = shortName ? buildClientCode(nextDisplayOrder, shortName) : `${String(nextDisplayOrder).padStart(2, "0")}_—`;
  const filledLinkCount = clientLinkGroups.reduce(
    (count, group) => count + group.fields.filter((field) => Boolean(formSnapshot[field.key])).length,
    0,
  );

  function stopImplicitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function syncFormSnapshot() {
    window.requestAnimationFrame(() => {
      if (!formRef.current) return;
      const next: Record<string, string> = {};
      for (const [key, value] of new FormData(formRef.current).entries()) {
        if (typeof value === "string" && value.trim().length > 0) next[key] = value.trim();
      }
      setFormSnapshot(next);
    });
  }

  function validateIdentity() {
    const form = formRef.current;
    if (!form) return false;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
    const shortNameInput = form.elements.namedItem("short_name") as HTMLInputElement | null;

    if (!nameInput?.value.trim()) {
      nameInput?.setCustomValidity("Preenche o nome do cliente.");
      nameInput?.reportValidity();
      nameInput?.setCustomValidity("");
      return false;
    }
    if (!shortNameInput?.value.trim()) {
      shortNameInput?.setCustomValidity("Confirma o formato do cliente.");
      shortNameInput?.reportValidity();
      shortNameInput?.setCustomValidity("");
      return false;
    }
    return true;
  }

  function goToNextStep() {
    if (step === 0 && !validateIdentity()) return;
    const nextStep = Math.min(steps.length - 1, step + 1);
    setFormMessage(null);
    setMaximumStep((current) => Math.max(current, nextStep));
    setStep(nextStep);
    syncFormSnapshot();
  }

  async function createClient() {
    if (!formRef.current || submittingRef.current || partialClientId || !validateIdentity()) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const formData = new FormData(formRef.current);
      const preparedLogo = await prepareLogoRef.current?.();
      if (preparedLogo) formData.set("logo_file", preparedLogo);
      const result = await action(formData);

      if (result.ok) {
        router.push(`/clients/${result.clientId}`);
        router.refresh();
        return;
      }

      setPartialClientId(result.clientId ?? null);
      setFormMessage(result.message);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Não foi possível criar o cliente.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function toggleValue(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    checked: boolean,
  ) {
    setter((current) => checked
      ? Array.from(new Set([...current, value]))
      : current.filter((item) => item !== value));
    syncFormSnapshot();
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
        <div className="grid gap-2 md:grid-cols-3">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (index > maximumStep) return;
                setFormMessage(null);
                setStep(index);
              }}
              disabled={isSubmitting || index > maximumStep}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                step === index
                  ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
                  : "bg-white/50 text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)]"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-5 shadow-[0_22px_62px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-6">
        <div className={step === 0 ? "grid gap-5" : "hidden"}>
          <ClientFormSection id="novo-identidade" title="Dados principais" description="O formato e o código são preparados automaticamente a partir do nome.">
            <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr_0.7fr]">
              <label className={labelClass}>
                Nome do cliente
                <input
                  name="name"
                  required
                  value={clientName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setClientName(value);
                    if (!shortNameEdited) setShortName(normalizeClientShortName(value));
                  }}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Formato
                <input
                  name="short_name"
                  required
                  maxLength={3}
                  value={shortName}
                  onChange={(event) => {
                    setShortNameEdited(true);
                    setShortName(normalizeClientShortName(event.currentTarget.value));
                  }}
                  placeholder="ABC"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Código
                <input value={previewCode} readOnly className={`${inputClass} bg-black/5`} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Tipo de cliente
                <SelectField name="type" defaultValue="external" options={clientTypes.map((type) => ({ value: type, label: clientTypeLabels[type] }))} />
              </label>
              <label className={labelClass}>
                Estado
                <SelectField name="status" defaultValue="active" options={clientStatuses.map((status) => ({ value: status, label: clientStatusLabels[status] }))} />
              </label>
              <label className={labelClass}>
                Responsável interno
                <SelectField name="owner_name" options={ownerOptions} />
              </label>
            </div>
          </ClientFormSection>

          <ClientFormSection id="novo-contrato" title="Contrato e serviços">
            <ClientServicesField
              selectedValues={selectedServices}
              onChange={(service, checked) => toggleValue(setSelectedServices, service, checked)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Valor contratado
                <input name="contract_value" placeholder="Ex.: 400€/mês, projeto único, sob orçamento" className={inputClass} />
              </label>
              <label className={labelClass}>
                Data de início
                <DatePicker name="start_date" defaultValue="" ariaLabel="Data de início" />
              </label>
              <label className={labelClass}>
                Duração do contrato
                <input name="contract_duration" placeholder="6 meses, projeto único..." className={inputClass} />
              </label>
            </div>
          </ClientFormSection>
        </div>

        <div className={step === 1 ? "grid gap-5" : "hidden"}>
          <ClientFormSection id="novo-marca" title="Marca" description="Logótipo, cor e referências oficiais da identidade.">
            <ClientLogoEditor prepareRef={prepareLogoRef} />
            <ClientColorField />
            <ClientLinkFields groupIds={["brand"]} />
          </ClientFormSection>

          <ClientFormSection id="novo-recursos" title="Plataformas e recursos" description="Canais, ferramentas, pastas e documentos do cliente.">
            <ClientPlatformsField
              selectedValues={selectedPlatforms}
              onChange={(platform, checked) => toggleValue(setSelectedPlatforms, platform, checked)}
            />
            <ClientLinkFields groupIds={["work", "publishing", "channels", "documents"]} />
          </ClientFormSection>
        </div>

        <div className={step === 2 ? "grid gap-5" : "hidden"}>
          <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Resumo e criação</h2>
          <div className="grid gap-3 rounded-[20px] border border-[var(--bb-border)] bg-white/45 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryValue label="Nome" value={clientName} />
            <SummaryValue label="Formato" value={shortName} />
            <SummaryValue label="Código" value={previewCode} />
            <SummaryValue label="Tipo" value={clientTypeLabels[(formSnapshot.type as keyof typeof clientTypeLabels) || "external"]} />
            <SummaryValue label="Estado" value={clientStatusLabels[(formSnapshot.status as keyof typeof clientStatusLabels) || "active"]} />
            <SummaryValue label="Responsável" value={formSnapshot.owner_name} />
            <SummaryValue label="Serviços" value={selectedServices.join(", ")} />
            <SummaryValue label="Plataformas" value={selectedPlatforms.join(", ")} />
            <SummaryValue label="Links preenchidos" value={String(filledLinkCount)} />
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">Tarefas iniciais</h3>
            <label className="flex items-center gap-3 rounded-[18px] border border-[var(--bb-border)] bg-white/45 px-4 py-3 text-sm font-extrabold text-[var(--bb-charcoal)]">
              <input
                name="generate_initial_tasks"
                type="checkbox"
                checked={createInitialTasks}
                onChange={(event) => setCreateInitialTasks(event.currentTarget.checked)}
                className="size-5 accent-[var(--bb-primary)]"
              />
              Criar tarefas iniciais
            </label>
            {createInitialTasks ? (
              <div className="grid gap-2 md:grid-cols-2">
                {setupTasks.map((task) => (
                  <label key={task} className="flex items-center gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/45 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
                    <input
                      name="setup_tasks"
                      type="checkbox"
                      value={task}
                      checked={selectedTaskTitles.includes(task)}
                      onChange={(event) => toggleValue(setSelectedTaskTitles, task, event.currentTarget.checked)}
                      className="size-4 accent-[var(--bb-primary)]"
                    />
                    {task}
                  </label>
                ))}
                <p className="flex items-center gap-2 text-xs font-bold text-[var(--bb-muted)] md:col-span-2">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Serão criadas {selectedTaskTitles.length} tarefas associadas ao cliente.
                </p>
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
        <div role="alert" className="rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]">
          {formMessage}
          {partialClientId ? <span className="mt-1 block text-xs">O cliente já existe. Revê as tarefas iniciais antes de abrir o perfil.</span> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
          <Link
            href="/clients"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white/55 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
          >
            Cancelar
          </Link>
        </div>

        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={goToNextStep}
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
      <p className="mt-1 break-words text-sm font-bold text-[var(--bb-charcoal)]">{value || "-"}</p>
    </div>
  );
}
