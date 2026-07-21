"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { DatePicker, MonthPicker, TimePicker } from "@/components/date-picker";
import { LinksEditor } from "@/components/links";
import { SelectField, type SelectOption } from "@/components/select-field";
import { getClientLabel } from "@/lib/client-display";
import { clientColorLabels, getClientVisualToken } from "@/lib/client-visuals";
import {
  clientStatusLabels,
  clientTypeLabels,
  contentStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from "@/lib/labels";
import {
  clientStatuses,
  clientTypes,
  clientColorKeys,
  serviceTypes,
  contentStatuses,
  taskStatuses,
  type Client,
  type ContentItem,
  type Task,
  type TeamMember,
} from "@/lib/types";
import { contentStatusTones, taskStatusTones } from "@/lib/status-styles";

type ContentActionResult = void | { ok: false; message: string };
type FormAction = (formData: FormData) => void | Promise<void>;
type ContentFormAction = (formData: FormData) => ContentActionResult | Promise<ContentActionResult>;
type ContentFormState = { error: string | null };

const inputClass =
  "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";
const textAreaClass =
  "bb-textarea text-sm font-medium placeholder:text-[var(--bb-muted)]";

function ClientLogoField({ currentLogoUrl }: { currentLogoUrl?: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <fieldset className="grid gap-3 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-4">
      <legend className="px-1 text-sm font-bold text-[var(--bb-charcoal)]">Logótipo</legend>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-[var(--bb-border)] bg-white text-xs font-bold text-[var(--bb-muted)]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Pré-visualização do logótipo" className="h-full w-full object-contain p-2" />
          ) : (
            <span>Sem logo</span>
          )}
        </div>
        <div className="grid flex-1 gap-2">
          <input type="hidden" name="logo_url" value={currentLogoUrl ?? ""} />
          <input
            name="logo_file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={`${inputClass} cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--bb-black)] file:px-3 file:py-1.5 file:text-xs file:font-extrabold file:text-white`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              const nextObjectUrl = file ? URL.createObjectURL(file) : null;
              setObjectUrl(nextObjectUrl);
              setPreviewUrl(nextObjectUrl ?? currentLogoUrl ?? null);
            }}
          />
          {currentLogoUrl ? (
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--bb-muted)]">
              <input
                name="remove_logo"
                type="checkbox"
                className="size-4 accent-[var(--bb-black)]"
                onChange={(event) => {
                  if (event.currentTarget.checked) setPreviewUrl(null);
                  else setPreviewUrl(objectUrl ?? currentLogoUrl);
                }}
              />
              Remover o logótipo atual
            </label>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1 text-xs font-semibold text-[var(--bb-muted)]">
        <span>Uso na aplicação: avatares quadrados de 32–64 px. Uso no PDF: 44 × 44 pt.</span>
        <span>Recomendado: PNG ou WebP com fundo transparente, tela quadrada de 1024 × 1024 px (mínimo 512 × 512 px), até 2 MB.</span>
      </div>
    </fieldset>
  );
}

const clientPlatformOptions = [
  "Website",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Meta Business Suite",
  "Metricool",
  "CRM / Newsletter",
  "Outro",
];

const contentPlatformOptions = ["Instagram", "Facebook", "LinkedIn", "TikTok"];
const contentFormatOptions = ["Post", "Carousel", "Story", "Reels", "Newsletter"];

const taskPriorityOptions: SelectOption[] = [
  { value: "normal", label: taskPriorityLabels.normal },
  { value: "urgent", label: taskPriorityLabels.urgent },
];

function optionList<T extends readonly string[]>(
  values: T,
  labels: Record<T[number], string>,
): SelectOption[] {
  return values.map((value: T[number]) => ({
    value,
    label: labels[value],
  }));
}

const contentStatusOptions: SelectOption[] = contentStatuses.map((status) => ({
  value: status,
  label: contentStatusLabels[status],
  tone: contentStatusTones[status],
}));

const taskStatusOptions: SelectOption[] = taskStatuses.map((status) => ({
  value: status,
  label: taskStatusLabels[status],
  tone: taskStatusTones[status],
}));

function splitAssignees(value: string | null | undefined) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function timeInputValue(value: string | null | undefined) {
  return value?.slice(0, 5) ?? "";
}

function publishMonthValue(publishDate: string) {
  return publishDate.slice(0, 7);
}

function isRedirectSignal(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function contentFormError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Não foi possível guardar o conteúdo.";
}

function AssigneeMultiSelect({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: string[];
  defaultValue?: string | null;
}) {
  const selected = new Set(splitAssignees(defaultValue));

  if (!options.length) {
    return <input name={name} defaultValue={defaultValue ?? ""} className={inputClass} />;
  }

  return (
    <div className="flex min-h-11 flex-wrap gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
      {options.map((option) => (
        <label key={option} className="group cursor-pointer">
          <input
            name={name}
            type="checkbox"
            value={option}
            defaultChecked={selected.has(option)}
            className="peer sr-only"
          />
          <span className="flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold text-[var(--bb-muted)] transition duration-200 group-hover:border-[rgba(83,183,223,0.5)] group-hover:text-[var(--bb-charcoal)] peer-checked:border-[var(--bb-black)] peer-checked:bg-[var(--bb-black)] peer-checked:text-white">
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

function ContentPlatformMultiSelect({ defaultValue }: { defaultValue?: string | null }) {
  const selectedPlatforms = splitAssignees(defaultValue).filter(
    (platform) => platform !== "Sem plataforma",
  );
  const selected = new Set(selectedPlatforms);
  const customPlatforms = selectedPlatforms.filter(
    (platform) => !contentPlatformOptions.includes(platform),
  );

  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap gap-2">
        {contentPlatformOptions.map((platform) => (
          <label key={platform} className="group cursor-pointer">
            <input
              name="platform"
              type="checkbox"
              value={platform}
              defaultChecked={selected.has(platform)}
              className="peer sr-only"
            />
            <span className="flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold text-[var(--bb-muted)] transition duration-200 group-hover:border-[rgba(83,183,223,0.5)] group-hover:text-[var(--bb-charcoal)] peer-checked:border-[var(--bb-black)] peer-checked:bg-[var(--bb-black)] peer-checked:text-white">
              {platform}
            </span>
          </label>
        ))}
        <label className="group cursor-pointer">
          <input
            name="platform"
            type="checkbox"
            value="Outra"
            defaultChecked={Boolean(customPlatforms.length)}
            className="peer sr-only"
          />
          <span className="flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold text-[var(--bb-muted)] transition duration-200 group-hover:border-[rgba(83,183,223,0.5)] group-hover:text-[var(--bb-charcoal)] peer-checked:border-[var(--bb-black)] peer-checked:bg-[var(--bb-black)] peer-checked:text-white">
            Outra
          </span>
        </label>
      </div>
      <input
        name="platform_other_name"
        defaultValue={customPlatforms.join(", ")}
        placeholder="Outra plataforma"
        className="min-h-9 rounded-xl border border-[var(--bb-border)] bg-white px-3 text-xs font-semibold text-[var(--bb-charcoal)] outline-none transition duration-200 placeholder:text-[var(--bb-muted)] focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]"
      />
    </div>
  );
}

function ContentFormatMultiSelect({ defaultValue }: { defaultValue?: string | null }) {
  const selectedFormats = splitAssignees(defaultValue);
  const selected = new Set(selectedFormats);
  const customFormats = selectedFormats.filter((format) => !contentFormatOptions.includes(format));

  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap gap-2">
        {contentFormatOptions.map((format) => (
          <label key={format} className="group cursor-pointer">
            <input
              name="format"
              type="checkbox"
              value={format}
              defaultChecked={selected.has(format)}
              className="peer sr-only"
            />
            <span className="flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold text-[var(--bb-muted)] transition duration-200 group-hover:border-[rgba(83,183,223,0.5)] group-hover:text-[var(--bb-charcoal)] peer-checked:border-[var(--bb-black)] peer-checked:bg-[var(--bb-black)] peer-checked:text-white">
              {format}
            </span>
          </label>
        ))}
        <label className="group cursor-pointer">
          <input
            name="format"
            type="checkbox"
            value="Outro"
            defaultChecked={Boolean(customFormats.length)}
            className="peer sr-only"
          />
          <span className="flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white px-3 text-xs font-extrabold text-[var(--bb-muted)] transition duration-200 group-hover:border-[rgba(83,183,223,0.5)] group-hover:text-[var(--bb-charcoal)] peer-checked:border-[var(--bb-black)] peer-checked:bg-[var(--bb-black)] peer-checked:text-white">
            Outro
          </span>
        </label>
      </div>
      <input
        name="format_other_name"
        defaultValue={customFormats.join(", ")}
        placeholder="Outro formato"
        className="min-h-9 rounded-xl border border-[var(--bb-border)] bg-white px-3 text-xs font-semibold text-[var(--bb-charcoal)] outline-none transition duration-200 placeholder:text-[var(--bb-muted)] focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]"
      />
    </div>
  );
}

export function FormFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-5xl rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[0_22px_62px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <h2 className="mb-6 text-lg font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
      {children}
    </section>
  );
}

export function ClientForm({
  action,
  client,
  submitLabel,
  teamMembers = [],
}: {
  action: FormAction;
  client?: Client;
  submitLabel: string;
  teamMembers?: TeamMember[];
}) {
  const serviceValues = client?.service_types?.length
    ? client.service_types
    : client?.service_type
      ? [client.service_type]
      : [];
  const ownerOptions = [
    { value: "", label: "Por definir" },
    ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
  ];

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Código cliente
          <input name="client_code" defaultValue={client?.client_code ?? ""} placeholder="02_I2030" className={inputClass} />
        </label>
        <label className={labelClass}>
          Nome curto
          <input name="short_name" defaultValue={client?.short_name ?? ""} placeholder="I2030" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Nome
          <input name="name" required defaultValue={client?.name} className={inputClass} />
        </label>
        <label className={labelClass}>
          Tipo
          <SelectField name="type" defaultValue={client?.type ?? "external"} options={optionList(clientTypes, clientTypeLabels)} />
        </label>
        <label className={labelClass}>
          Estado
          <SelectField name="status" defaultValue={client?.status ?? "active"} options={optionList(clientStatuses, clientStatusLabels)} />
        </label>
      </div>
      <ClientLogoField currentLogoUrl={client?.logo_url} />
      <div className={labelClass}>
        Cor operacional
        <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {clientColorKeys.map((colorKey) => {
            const token = getClientVisualToken({ colorKey });

            return (
              <label key={colorKey} className="group cursor-pointer">
                <input
                  name="color_key"
                  type="radio"
                  value={colorKey}
                  defaultChecked={(client?.color_key ?? "slate") === colorKey}
                  className="peer sr-only"
                />
                <span className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-extrabold transition duration-200 ${token.bg} ${token.border} ${token.text} peer-checked:border-[var(--bb-black)] peer-checked:ring-2 peer-checked:ring-[var(--bb-black)]/10 group-hover:bg-white`}>
                  <span className={`size-2.5 rounded-full ${token.dot}`} />
                  {clientColorLabels[colorKey]}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Responsável interno
          {teamMembers.length ? (
            <SelectField name="owner_name" defaultValue={client?.owner_name ?? ""} options={ownerOptions} />
          ) : (
            <input name="owner_name" defaultValue={client?.owner_name ?? ""} className={inputClass} />
          )}
        </label>
        <div className={labelClass}>
          Serviço contratado
          <input type="hidden" name="service_type" value={serviceValues[0] ?? ""} />
          <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 md:grid-cols-2">
            {serviceTypes.map((serviceType) => (
              <label key={serviceType} className="flex items-center gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                <input
                  name="service_types"
                  type="checkbox"
                  value={serviceType}
                  defaultChecked={serviceValues.includes(serviceType)}
                  className="size-4 accent-[var(--bb-primary)]"
                />
                {serviceType}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Valor contratado
          <input
            name="contract_value"
            defaultValue={client?.contract_value ?? (client?.monthly_value ? `${client.monthly_value.toLocaleString("pt-PT")} €` : "")}
            placeholder="Ex.: 400€/mês, 1.200€ projeto único, sob orçamento"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Data de início
          <DatePicker name="start_date" defaultValue={client?.start_date ?? ""} ariaLabel="Data de início" />
        </label>
        <label className={labelClass}>
          Duração contrato
          <input name="contract_duration" defaultValue={client?.contract_duration ?? ""} placeholder="6 meses, projeto único..." className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        <div className={labelClass}>
          Plataformas
          <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 md:grid-cols-2">
            {clientPlatformOptions.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                <input
                  name="platforms"
                  type="checkbox"
                  value={platform}
                  defaultChecked={Boolean(client?.platforms?.includes(platform))}
                  className="size-4 accent-[var(--bb-primary)]"
                />
                {platform}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Drive geral
          <input name="drive_url" type="url" defaultValue={client?.drive_url ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Figma
          <input name="figma_url" type="url" defaultValue={client?.figma_url ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Meta
          <input name="meta_url" type="url" defaultValue={client?.meta_url ?? ""} className={inputClass} />
        </label>
      </div>
      <div className="rounded-[20px] border border-[var(--bb-border)] bg-white/35 p-4">
        <h3 className="mb-4 text-sm font-extrabold text-[var(--bb-charcoal)]">
          Links principais
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Website
            <input name="website_url" type="url" defaultValue={client?.website_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Instagram
            <input name="instagram_url" type="url" defaultValue={client?.instagram_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Facebook
            <input name="facebook_url" type="url" defaultValue={client?.facebook_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            LinkedIn
            <input name="linkedin_url" type="url" defaultValue={client?.linkedin_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Google Drive
            <input name="google_drive_url" type="url" defaultValue={client?.google_drive_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            OneDrive
            <input name="onedrive_url" type="url" defaultValue={client?.onedrive_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Figma
            <input name="figma_project_url" type="url" defaultValue={client?.figma_project_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Calendário de conteúdos
            <input name="content_calendar_url" type="url" defaultValue={client?.content_calendar_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Pasta de entregáveis aprovados
            <input name="final_deliverables_url" type="url" defaultValue={client?.final_deliverables_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Proposta
            <input name="proposal_url" type="url" defaultValue={client?.proposal_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Contrato
            <input name="contract_url" type="url" defaultValue={client?.contract_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Adjudicação
            <input name="adjudication_url" type="url" defaultValue={client?.adjudication_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Orçamento
            <input name="budget_url" type="url" defaultValue={client?.budget_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Outros documentos
            <input name="other_documents_url" type="url" defaultValue={client?.other_documents_url ?? ""} className={inputClass} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Brand Assets
            <input name="brand_assets_url" type="url" defaultValue={client?.brand_assets_url ?? ""} className={inputClass} />
          </label>
        </div>
      </div>
      <label className={labelClass}>
        Notas
        <textarea name="notes" defaultValue={client?.notes ?? ""} className={textAreaClass} />
      </label>
      <FormButtons submitLabel={submitLabel} cancelHref={client ? `/clients/${client.id}` : "/clients"} />
    </form>
  );
}

export function ContentForm({
  action,
  clients,
  item,
  defaultClientId,
  defaultTitle,
  defaultCreativeBrief,
  sourceTaskId,
  submitLabel,
  teamMembers = [],
  onCancel,
}: {
  action: ContentFormAction;
  clients: Client[];
  item?: ContentItem;
  defaultClientId?: string;
  defaultTitle?: string;
  defaultCreativeBrief?: string;
  sourceTaskId?: string;
  submitLabel: string;
  teamMembers?: TeamMember[];
  onCancel?: () => void;
}) {
  const selectedClientId = item?.client_id ?? defaultClientId ?? clients[0]?.id;
  const selectedMonth = item?.month ?? "";
  const [publishDate, setPublishDate] = useState(item?.publish_date ?? "");
  const [planningMonth, setPlanningMonth] = useState(selectedMonth);
  const submittedMonth = publishDate ? publishMonthValue(publishDate) : planningMonth;
  const [state, formAction] = useActionState(
    async (_previousState: ContentFormState, formData: FormData): Promise<ContentFormState> => {
      try {
        const result = await action(formData);
        if (result?.ok === false) return { error: result.message };
        return { error: null };
      } catch (error) {
        if (isRedirectSignal(error)) throw error;
        return { error: contentFormError(error) };
      }
    },
    { error: null },
  );
  const currentAssignees = splitAssignees(item?.assignee_name);
  const assigneeOptions = Array.from(
    new Set([
      ...teamMembers.map((member) => member.name),
      ...currentAssignees,
    ]),
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="recording_date" value={item?.recording_date ?? ""} />
      <input type="hidden" name="media_url" value={item?.media_url ?? ""} />
      <input type="hidden" name="delivery_url" value={item?.delivery_url ?? ""} />
      <input type="hidden" name="client_feedback" value={item?.client_feedback ?? ""} />
      <input type="hidden" name="source_task_id" value={item?.source_task_id ?? sourceTaskId ?? ""} />
      {state.error ? (
        <div
          role="alert"
          className="rounded-[16px] border border-[rgba(214,69,80,0.28)] bg-[rgba(214,69,80,0.08)] px-4 py-3 text-sm font-bold leading-6 text-[#8a2530]"
        >
          {state.error}
        </div>
      ) : null}
      <div data-content-section="general" className="grid gap-4 md:grid-cols-5">
        <label className={labelClass}>
          Cliente
          <SelectField
            name="client_id"
            required
            defaultValue={selectedClientId}
            options={clients.map((client) => ({ value: client.id, label: getClientLabel(client) }))}
          />
        </label>
        <label className={labelClass}>
          Data de publicação
          <DatePicker
            name="publish_date"
            value={publishDate}
            onValueChange={setPublishDate}
            ariaLabel="Data de publicação"
          />
        </label>
        <label className={labelClass}>
          {publishDate ? "Mês" : "Mês de planeamento"}
          {publishDate ? (
            <>
              <input type="hidden" name="month" value={submittedMonth} />
              <span className="flex min-h-11 items-center rounded-2xl border border-[var(--bb-border)] bg-white/55 px-3.5 text-sm font-semibold text-[var(--bb-muted)] shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
                {submittedMonth}
              </span>
            </>
          ) : (
            <MonthPicker
              name="month"
              required
              value={planningMonth}
              onValueChange={setPlanningMonth}
              ariaLabel="Mês de planeamento"
            />
          )}
        </label>
        <label className={labelClass}>
          Hora de publicação
          <TimePicker name="publish_time" defaultValue={timeInputValue(item?.publish_time)} ariaLabel="Hora de publicação" />
        </label>
        <label className={labelClass}>
          Estado
          <SelectField name="status" defaultValue={item?.status ?? "pending"} options={contentStatusOptions} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className={labelClass}>
          Prazo design
          <DatePicker name="design_due_date" defaultValue={item?.design_due_date ?? ""} ariaLabel="Prazo design" />
        </label>
        <label className={labelClass}>
          Prazo copy
          <DatePicker name="copy_due_date" defaultValue={item?.copy_due_date ?? ""} ariaLabel="Prazo copy" />
        </label>
        <label className={labelClass}>
          Prazo aprovação
          <DatePicker name="approval_due_date" defaultValue={item?.approval_due_date ?? ""} ariaLabel="Prazo aprovação" />
        </label>
        <label className={labelClass}>
          Prazo publicação
          <DatePicker name="publishing_due_date" defaultValue={item?.publishing_due_date ?? ""} ariaLabel="Prazo publicação" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className={labelClass}>
          Plataforma
          <ContentPlatformMultiSelect defaultValue={item?.platform} />
        </label>
        <label className={labelClass}>
          Formato
          <ContentFormatMultiSelect defaultValue={item?.format} />
        </label>
        <label className={labelClass}>
          Responsável
          <AssigneeMultiSelect name="assignee_name" defaultValue={item?.assignee_name} options={assigneeOptions} />
        </label>
      </div>
      <label data-content-section="general-title" className={labelClass}>
        Título
        <input name="title" required defaultValue={item?.title ?? defaultTitle ?? ""} className={inputClass} />
      </label>
      <div className="grid gap-4 lg:grid-cols-3">
        <label data-content-section="brief" className={labelClass}>
          Brief criativo
          <textarea name="creative_brief" defaultValue={item?.creative_brief ?? defaultCreativeBrief ?? ""} className={textAreaClass} />
        </label>
        <label data-content-section="copy" className={labelClass}>
          Copy
          <textarea name="copy_text" defaultValue={item?.copy_text ?? ""} className={textAreaClass} />
        </label>
        <label data-content-section="description" className={labelClass}>
          Descrição
          <textarea name="description" defaultValue={item?.description ?? ""} className={textAreaClass} />
        </label>
      </div>
      <label className={labelClass}>
        Inspiração
        <input name="inspiration_url" type="url" defaultValue={item?.inspiration_url ?? ""} className={inputClass} />
      </label>
      <div data-content-section="links" className="rounded-[20px] border border-[var(--bb-border)] bg-white/35 p-4">
        <h3 className="mb-4 text-sm font-extrabold text-[var(--bb-charcoal)]">
          Materiais e links
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>
            Briefing
            <input name="brief_url" type="url" defaultValue={item?.brief_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Pasta Media
            <input name="media_folder_url" type="url" defaultValue={item?.media_folder_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Export
            <input name="export_url" type="url" defaultValue={item?.export_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Publicação
            <input name="published_url" type="url" defaultValue={item?.published_url ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Figma
            <input name="figma_url" type="url" defaultValue={item?.figma_url ?? ""} className={inputClass} />
          </label>
        </div>
      </div>
      <input type="hidden" name="internal_review_notes" value={item?.internal_review_notes ?? ""} />
      <div data-content-section="workflow" className="rounded-[20px] border border-[var(--bb-border)] bg-white/35 p-4">
        <label className="flex items-center gap-3 text-sm font-extrabold text-[var(--bb-charcoal)]">
          <input
            name="is_blocked"
            type="checkbox"
            defaultChecked={item?.is_blocked ?? false}
            className="size-5 accent-[var(--bb-red)]"
          />
          Bloqueado?
        </label>
        <label className={`${labelClass} mt-4`}>
          Motivo do bloqueio
          <textarea name="blocker_reason" defaultValue={item?.blocker_reason ?? ""} className={textAreaClass} />
        </label>
      </div>
      <label className={labelClass}>
        Notas
        <textarea name="notes" defaultValue={item?.notes ?? ""} className={textAreaClass} />
      </label>
      <FormButtons submitLabel={submitLabel} cancelHref="/content" onCancel={onCancel} />
    </form>
  );
}

export function TaskForm({
  action,
  clients,
  task,
  defaultClientId,
  submitLabel,
  teamMembers = [],
  onCancel,
  footerAction,
}: {
  action: FormAction;
  clients: Client[];
  task?: Task;
  defaultClientId?: string;
  submitLabel: string;
  teamMembers?: TeamMember[];
  onCancel?: () => void;
  footerAction?: React.ReactNode;
}) {
  const selectedClientId = task?.client_id ?? defaultClientId ?? "";
  const assigneeOptions = [
    { value: "", label: "Por definir" },
    ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
    ...(task?.assignee_name && !teamMembers.some((member) => member.name === task.assignee_name)
      ? [{ value: task.assignee_name, label: task.assignee_name }]
      : []),
  ];

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="type" value={task?.type ?? "operations"} />
      <input type="hidden" name="related_url" value={task?.related_url ?? ""} />
      <input type="hidden" name="is_blocked" value={task?.is_blocked ? "on" : ""} />
      <input type="hidden" name="blocker_reason" value={task?.blocker_reason ?? ""} />
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Cliente
          <SelectField
            name="client_id"
            defaultValue={selectedClientId}
            options={[
              { value: "", label: "Sem cliente" },
              ...clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
            ]}
          />
        </label>
        <label className={labelClass}>
          Estado
          <SelectField name="status" defaultValue={task?.status ?? "pending"} options={taskStatusOptions} />
        </label>
        <label className={labelClass}>
          Prioridade
          <SelectField
            name="priority"
            defaultValue={task?.priority === "urgent" ? "urgent" : "normal"}
            options={taskPriorityOptions}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={`${labelClass} md:col-span-1`}>
          Título
          <input name="title" required defaultValue={task?.title ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Responsável
          {teamMembers.length ? (
            <SelectField
              name="assignee_name"
              defaultValue={task?.assignee_name ?? ""}
              options={assigneeOptions}
            />
          ) : (
            <input name="assignee_name" defaultValue={task?.assignee_name ?? ""} className={inputClass} />
          )}
        </label>
        <label className={labelClass}>
          Prazo
          <DatePicker name="due_date" defaultValue={task?.due_date ?? ""} ariaLabel="Prazo" />
        </label>
      </div>
      <label className={labelClass}>
        Notas
        <textarea name="notes" defaultValue={task?.notes ?? ""} className={textAreaClass} />
      </label>
      <LinksEditor links={task?.links} />
      <FormButtons
        submitLabel={submitLabel}
        cancelHref="/tasks"
        onCancel={onCancel}
        footerAction={footerAction}
      />
    </form>
  );
}

function FormButtons({
  submitLabel,
  cancelHref,
  onCancel,
  footerAction,
}: {
  submitLabel: string;
  cancelHref: string;
  onCancel?: () => void;
  footerAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <SubmitButton key="submit" label={submitLabel} />
      {onCancel ? (
        <button
          key="cancel-button"
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] px-5 text-sm font-bold text-[var(--bb-charcoal)] transition duration-200 hover:bg-[var(--bb-primary-hover)]"
        >
          Cancelar
        </button>
      ) : (
        <Link
          key="cancel-link"
          href={cancelHref}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] px-5 text-sm font-bold text-[var(--bb-charcoal)] transition duration-200 hover:bg-[var(--bb-primary-hover)]"
        >
          Cancelar
        </Link>
      )}
      {footerAction ? (
        <span key="footer-action" className="contents">
          {footerAction}
        </span>
      ) : null}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-full bg-[var(--bb-black)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "A guardar..." : label}
    </button>
  );
}
