"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Copy, Plus, Trash2, X } from "lucide-react";
import { DatePicker, MonthPicker } from "@/components/date-picker";
import { SelectField, type SelectOption } from "@/components/select-field";
import { getClientLabel } from "@/lib/client-display";
import { contentStatusLabels } from "@/lib/labels";
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

function emptyRow(defaultPlatform: string, defaultFormat: string): BulkRow {
  return {
    id: nextId(),
    publishDate: "",
    publishTime: "",
    platform: defaultPlatform,
    format: defaultFormat,
    title: "",
    assigneeName: "",
  };
}

function statusOptions() {
  return contentStatuses.map((status) => ({
    value: status,
    label: contentStatusLabels[status],
  }));
}

function removeBulkParam(searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("bulk");
  const query = nextParams.toString();
  return query ? `/content?${query}` : "/content";
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
  const [defaultPlatform, setDefaultPlatform] = useState(platformOptions[0]);
  const [defaultFormat, setDefaultFormat] = useState(formatOptions[0]);
  const [rows, setRows] = useState<BulkRow[]>(() => [
    emptyRow(platformOptions[0], formatOptions[0]),
    emptyRow(platformOptions[0], formatOptions[0]),
    emptyRow(platformOptions[0], formatOptions[0]),
  ]);
  const [message, setMessage] = useState<string | null>(null);
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
      { value: "", label: "Usa o global" },
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
    setRows((currentRows) => [...currentRows, emptyRow(defaultPlatform, defaultFormat)]);
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
        : [emptyRow(defaultPlatform, defaultFormat)],
    );
  }

  function clearRows() {
    setRows([emptyRow(defaultPlatform, defaultFormat)]);
    setMessage(null);
  }

  function createFourWeeks() {
    const weeklyRows: BulkRow[] = [];

    for (let week = 0; week < 4; week += 1) {
      const baseOffset = week * 7;
      weeklyRows.push(
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 1),
          publishTime: "10:00",
          platform: defaultPlatform,
          format: "Post",
          title: `Post semana ${week + 1}.1`,
          assigneeName: "",
        },
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 3),
          publishTime: "10:00",
          platform: defaultPlatform,
          format: "Post",
          title: `Post semana ${week + 1}.2`,
          assigneeName: "",
        },
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 5),
          publishTime: "10:00",
          platform: defaultPlatform,
          format: "Post",
          title: `Post semana ${week + 1}.3`,
          assigneeName: "",
        },
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 1),
          publishTime: "",
          platform: defaultPlatform,
          format: "Story",
          title: `Story semana ${week + 1}.1`,
          assigneeName: "",
        },
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 3),
          publishTime: "",
          platform: defaultPlatform,
          format: "Story",
          title: `Story semana ${week + 1}.2`,
          assigneeName: "",
        },
        {
          id: nextId(),
          publishDate: dateInMonth(month, baseOffset + 5),
          publishTime: "",
          platform: defaultPlatform,
          format: "Story",
          title: `Story semana ${week + 1}.3`,
          assigneeName: "",
        },
      );
    }

    setRows(weeklyRows);
    setMessage("Foram preparadas 24 linhas simples para 4 semanas.");
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
                defaultValue=""
                options={globalAssigneeOptions}
              />
            </label>
            <label className={labelClass}>
              Estado inicial
              <SelectField
                name="status"
                defaultValue={"idea" satisfies ContentStatus}
                options={statusOptions()}
              />
            </label>
            <label className={labelClass}>
              Plataforma padrão
              <SelectField
                name="default_platform"
                value={defaultPlatform}
                onValueChange={setDefaultPlatform}
                options={platformSelectOptions}
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
