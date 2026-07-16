"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown, Copy, Plus, Trash2, X } from "lucide-react";
import { DatePicker, MonthPicker } from "@/components/date-picker";
import { SelectField, type SelectOption } from "@/components/select-field";
import { getClientLabel } from "@/lib/client-display";
import { contentStatusLabels } from "@/lib/labels";
import { contentStatusTones } from "@/lib/status-styles";
import {
  contentStatuses,
  type Client,
  type ContentStatus,
  type TeamMember,
} from "@/lib/types";

type BulkCreateContentResult =
  | { ok: true; createdCount: number }
  | { ok: false; message: string };

type BulkContentModalProps = {
  action: (formData: FormData) => Promise<BulkCreateContentResult>;
  clients: Client[];
  teamMembers: TeamMember[];
  canPersist: boolean;
  defaultClientId?: string;
  defaultMonth?: string;
  initialOpen?: boolean;
};

type BulkRow = {
  id: string;
  publishDate: string;
  publishTime: string;
  platform: string;
  format: string;
  title: string;
  assigneeName: string;
};

const platformOptions = ["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Newsletter"];
const formatOptions = ["Post", "Carousel", "Story", "Reels", "Newsletter"];
const platformSelectOptions = optionValues(platformOptions);
const formatSelectOptions = optionValues(formatOptions);
const tableInputClass =
  "min-h-11 w-full min-w-0 rounded-2xl border border-[var(--bb-border)] bg-white/80 px-3.5 text-sm font-semibold text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const labelClass = "grid min-w-0 gap-2 text-sm font-bold text-[var(--bb-charcoal)]";

function optionValues(values: string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function nextId() {
  return crypto.randomUUID();
}

function dateInMonth(month: string, dayOffset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1, 1 + dayOffset);
  const day = String(date.getDate()).padStart(2, "0");
  const localMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${localMonth}-${day}`;
}

function emptyRow(defaultPlatform: string, defaultFormat: string, defaultAssigneeName = ""): BulkRow {
  return {
    id: nextId(),
    publishDate: "",
    publishTime: "",
    platform: defaultPlatform,
    format: defaultFormat,
    title: "",
    assigneeName: defaultAssigneeName,
  };
}

function rowsForPlatforms(
  platforms: string[],
  defaultFormat: string,
  defaultAssigneeName: string,
) {
  return platforms.map((platform) => emptyRow(platform, defaultFormat, defaultAssigneeName));
}

function statusOptions() {
  return contentStatuses.map((status) => ({
    value: status,
    label: contentStatusLabels[status],
    tone: contentStatusTones[status],
  }));
}

function removeBulkParam(searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("bulk");
  const query = nextParams.toString();
  return query ? `/content?${query}` : "/content";
}

type MultiSelectFieldProps = {
  name: string;
  options: SelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  ariaLabel?: string;
};

function MultiSelectField({
  name,
  options,
  value,
  onValueChange,
  ariaLabel,
}: MultiSelectFieldProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedValues = value.length ? value : [options[0]?.value ?? ""].filter(Boolean);
  const [open, setOpen] = useState(false);
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleValue(nextValue: string) {
    if (selectedValues.includes(nextValue)) {
      if (selectedValues.length === 1) return;
      onValueChange(selectedValues.filter((selectedValue) => selectedValue !== nextValue));
      return;
    }

    onValueChange([...selectedValues, nextValue]);
  }

  function removeValue(nextValue: string) {
    if (selectedValues.length === 1) return;
    onValueChange(selectedValues.filter((selectedValue) => selectedValue !== nextValue));
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input type="hidden" name={name} value={selectedValues[0] ?? ""} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 px-3.5 text-left text-sm font-semibold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.05)] outline-none transition duration-200 hover:border-[rgba(83,183,223,0.45)] hover:bg-white focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_4px_var(--bb-primary-soft)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {selectedLabels.slice(0, 2).map((label, index) => (
            <span
              key={label}
              className={`max-w-[44%] truncate rounded-full bg-[var(--bb-primary-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--bb-black)] ${
                index > 0 ? "hidden sm:inline" : ""
              }`}
            >
              {label}
            </span>
          ))}
          {selectedLabels.length > 2 ? (
            <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-[var(--bb-muted)]">
              +{selectedLabels.length - 2}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--bb-muted)] transition duration-200 ${
            open ? "rotate-180 text-[var(--bb-charcoal)]" : "group-hover:text-[var(--bb-charcoal)]"
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={id}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-[18px] border border-[var(--bb-border)] bg-white/95 p-1.5 font-sans shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const selected = selectedValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggleValue(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-bold transition ${
                    selected
                      ? "bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                      : "text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          {selectedLabels.length > 1 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-[var(--bb-border)] pt-2">
              {selectedValues.map((selectedValue) => {
                const option = options.find((currentOption) => currentOption.value === selectedValue);
                if (!option) return null;

                return (
                  <button
                    key={selectedValue}
                    type="button"
                    onClick={() => removeValue(selectedValue)}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/80 px-2 py-1 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-red-soft)] hover:text-[#8f2415]"
                  >
                    <span className="truncate">{option.label}</span>
                    <X className="size-3" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BulkContentModal({
  action,
  clients,
  teamMembers,
  canPersist,
  defaultClientId = "",
  defaultMonth = "",
  initialOpen = false,
}: BulkContentModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(initialOpen);
  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [defaultPlatforms, setDefaultPlatforms] = useState<string[]>([platformOptions[0]]);
  const [defaultFormat, setDefaultFormat] = useState(formatOptions[0]);
  const [globalAssigneeName, setGlobalAssigneeName] = useState("");
  const [rows, setRows] = useState<BulkRow[]>(() => [
    emptyRow(platformOptions[0], formatOptions[0]),
    emptyRow(platformOptions[0], formatOptions[0]),
    emptyRow(platformOptions[0], formatOptions[0]),
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const activeDefaultPlatforms = defaultPlatforms.length ? defaultPlatforms : [platformOptions[0]];
  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: getClientLabel(client) })),
    [clients],
  );
  const globalAssigneeOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Por definir" },
      ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
    ],
    [teamMembers],
  );
  const rowAssigneeOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Não definido" },
      ...teamMembers.map((member) => ({ value: member.name, label: member.name })),
    ],
    [teamMembers],
  );

  function closeModal() {
    setOpen(false);
    setMessage(null);
    router.replace(removeBulkParam(searchParams), { scroll: false });
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      ...rowsForPlatforms(activeDefaultPlatforms, defaultFormat, globalAssigneeName),
    ]);
  }

  function duplicateRow(row: BulkRow) {
    setRows((currentRows) => {
      const index = currentRows.findIndex((currentRow) => currentRow.id === row.id);
      const copyRow = { ...row, id: nextId(), title: row.title ? `${row.title} copy` : "" };
      if (index === -1) return [...currentRows, copyRow];
      return [
        ...currentRows.slice(0, index + 1),
        copyRow,
        ...currentRows.slice(index + 1),
      ];
    });
  }

  function removeRow(id: string) {
    setRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((row) => row.id !== id)
        : rowsForPlatforms(activeDefaultPlatforms, defaultFormat, globalAssigneeName),
    );
  }

  function clearRows() {
    setRows(rowsForPlatforms(activeDefaultPlatforms, defaultFormat, globalAssigneeName));
    setMessage(null);
  }

  function createFourWeeks() {
    const weeklyRows: BulkRow[] = [];

    for (let week = 0; week < 4; week += 1) {
      const baseOffset = week * 7;
      const templates = [
        { publishDate: dateInMonth(month, baseOffset + 1), publishTime: "10:00", format: "Post", title: `Post semana ${week + 1}.1` },
        { publishDate: dateInMonth(month, baseOffset + 3), publishTime: "10:00", format: "Post", title: `Post semana ${week + 1}.2` },
        { publishDate: dateInMonth(month, baseOffset + 5), publishTime: "10:00", format: "Post", title: `Post semana ${week + 1}.3` },
        { publishDate: dateInMonth(month, baseOffset + 1), publishTime: "", format: "Story", title: `Story semana ${week + 1}.1` },
        { publishDate: dateInMonth(month, baseOffset + 3), publishTime: "", format: "Story", title: `Story semana ${week + 1}.2` },
        { publishDate: dateInMonth(month, baseOffset + 5), publishTime: "", format: "Story", title: `Story semana ${week + 1}.3` },
      ];

      templates.forEach((template) => {
        activeDefaultPlatforms.forEach((platform) => {
          weeklyRows.push({
            id: nextId(),
            ...template,
            platform,
            assigneeName: globalAssigneeName,
          });
        });
      });
    }

    setRows(weeklyRows);
    setMessage(`Foram preparadas ${weeklyRows.length} linhas simples para 4 semanas.`);
  }

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage(`${result.createdCount} conteúdos criados.`);
      setOpen(false);
      router.refresh();
      router.replace(removeBulkParam(searchParams), { scroll: false });
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(20,20,18,0.42)] px-3 py-4 backdrop-blur-sm md:py-8">
      <div className="w-full max-w-[1280px] rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:p-6 lg:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">
              Criar conteúdos em lote
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">
              Adiciona placeholders simples ao calendário editorial.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Fechar"
            title="Fechar"
            className="inline-grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form action={submit} className="grid gap-5">
          <div className="grid min-w-0 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>
              Cliente
              <SelectField
                name="client_id"
                required
                defaultValue={defaultClientId || clients[0]?.id}
                options={clientOptions}
              />
            </label>
            <label className={labelClass}>
              Mês
              <MonthPicker
                name="month"
                required
                value={month}
                onValueChange={setMonth}
                ariaLabel="Mês"
              />
            </label>
            <label className={labelClass}>
              Responsável
              <SelectField
                name="global_assignee_name"
                value={globalAssigneeName}
                onValueChange={setGlobalAssigneeName}
                options={globalAssigneeOptions}
              />
            </label>
            <label className={labelClass}>
              Estado inicial
              <SelectField
                name="status"
                defaultValue={"pending" satisfies ContentStatus}
                options={statusOptions()}
              />
            </label>
            <label className={labelClass}>
              Plataforma padrão
              <MultiSelectField
                name="default_platform"
                value={defaultPlatforms}
                onValueChange={setDefaultPlatforms}
                options={platformSelectOptions}
                ariaLabel="Plataforma padrão"
              />
            </label>
            <label className={labelClass}>
              Formato padrão
              <SelectField
                name="default_format"
                value={defaultFormat}
                onValueChange={setDefaultFormat}
                options={formatSelectOptions}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Adicionar linha
            </button>
            <button
              type="button"
              onClick={createFourWeeks}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[rgba(83,183,223,0.45)] bg-[var(--bb-primary-soft)] px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Criar 4 semanas
            </button>
            <button
              type="button"
              onClick={clearRows}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
            >
              Limpar linhas
            </button>
          </div>

          <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-[18px] border border-[var(--bb-border)] bg-white/40 [scrollbar-gutter:stable]">
            <table className="w-full min-w-[1240px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[160px]" />
                <col className="w-[120px]" />
                <col className="w-[165px]" />
                <col className="w-[155px]" />
                <col className="w-[330px]" />
                <col className="w-[210px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--bb-border)] text-xs font-extrabold uppercase tracking-[0.02em] text-[var(--bb-muted)]">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Hora</th>
                  <th className="px-3 py-3">Plataforma</th>
                  <th className="px-3 py-3">Formato</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Responsável</th>
                  <th className="w-24 px-3 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--bb-border)] last:border-b-0">
                    <td className="px-3 py-2">
                      <DatePicker
                        name="row_publish_date"
                        required
                        value={row.publishDate}
                        onValueChange={(value) => updateRow(row.id, { publishDate: value })}
                        initialMonth={month}
                        ariaLabel="Data de publicação"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name="row_publish_time"
                        type="time"
                        value={row.publishTime}
                        onChange={(event) => updateRow(row.id, { publishTime: event.target.value })}
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectField
                        name="row_platform"
                        value={row.platform}
                        onValueChange={(value) => updateRow(row.id, { platform: value })}
                        options={platformSelectOptions}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectField
                        name="row_format"
                        value={row.format}
                        onValueChange={(value) => updateRow(row.id, { format: value })}
                        options={formatSelectOptions}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name="row_title"
                        required
                        value={row.title}
                        onChange={(event) => updateRow(row.id, { title: event.target.value })}
                        className={tableInputClass}
                        placeholder="Título do conteúdo"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectField
                        name="row_assignee_name"
                        value={row.assigneeName}
                        onValueChange={(value) => updateRow(row.id, { assigneeName: value })}
                        options={rowAssigneeOptions}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateRow(row)}
                          aria-label="Duplicar linha"
                          title="Duplicar linha"
                          className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 transition hover:bg-[var(--bb-primary-hover)]"
                        >
                          <Copy className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          aria-label="Apagar linha"
                          title="Apagar linha"
                          className="inline-grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 text-[#a73522] transition hover:bg-[var(--bb-red-soft)]"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message ? (
            <p className="rounded-2xl border border-[var(--bb-border)] bg-white/65 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
              {message}
            </p>
          ) : null}

          {!canPersist ? (
            <p className="rounded-2xl border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-bold text-[#8f2415]">
              Supabase não está configurado. A criação em lote fica disponível quando a app puder gravar dados.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--bb-border)] pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !canPersist}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isPending ? "A criar..." : "Criar conteúdos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
