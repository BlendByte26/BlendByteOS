"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Download, FileDown, X } from "lucide-react";
import { MonthPicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import {
  contentItemsForPlanningPeriod,
  displayExportClient,
  planningPlatformList,
} from "@/lib/content-planning-export";
import { formatContentMonthLabel } from "@/lib/content-month";
import { displayContentPlatform } from "@/lib/content-platform";
import { cleanPrefixedTitle } from "@/lib/title-display";
import type { Client, ContentItem } from "@/lib/types";

type ContentPlanningExportModalProps = {
  clients: Client[];
  items: ContentItem[];
  defaultClientId?: string;
  defaultMonth?: string;
  defaultPreparedByName: string;
  defaultPreparedByEmail: string;
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

function parseFilename(disposition: string | null) {
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? "Planeamento_Conteudos.pdf";
}

function clientOptions(clients: Client[]) {
  return clients.map((client) => ({ value: client.id, label: displayExportClient(client) }));
}

const inputClass =
  "min-h-11 w-full min-w-0 rounded-2xl border border-[var(--bb-border)] bg-white/80 px-3.5 text-sm font-semibold text-[var(--bb-charcoal)] outline-none transition focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_3px_var(--bb-primary-soft)]";
const labelClass = "grid min-w-0 gap-2 text-sm font-bold text-[var(--bb-charcoal)]";

export function ContentPlanningExportModal({
  clients,
  items,
  defaultClientId = "",
  defaultMonth = "",
  defaultPreparedByName,
  defaultPreparedByEmail,
}: ContentPlanningExportModalProps) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || "");
  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preparedByName, setPreparedByName] = useState(defaultPreparedByName);
  const [preparedByEmail, setPreparedByEmail] = useState(defaultPreparedByEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const foundItems = useMemo(
    () => contentItemsForPlanningPeriod(items, clientId, month),
    [clientId, items, month],
  );
  const selectedItems = useMemo(
    () => foundItems.filter((item) => selectedIds.includes(item.id)),
    [foundItems, selectedIds],
  );
  const platformList = useMemo(() => planningPlatformList(selectedItems), [selectedItems]);
  const itemsWithoutDate = selectedItems.filter((item) => !item.publish_date);
  const itemsWithoutText = selectedItems.filter(
    (item) => !item.copy_text?.trim() && !item.description?.trim(),
  );

  function openModal() {
    const nextClientId = clientId || clients[0]?.id || "";
    const nextMonth = month || currentMonth();
    setClientId(nextClientId);
    setMonth(nextMonth);
    setSelectedIds(contentItemsForPlanningPeriod(items, nextClientId, nextMonth).map((item) => item.id));
    setOpen(true);
  }

  function changeClient(nextClientId: string) {
    setClientId(nextClientId);
    setSelectedIds(contentItemsForPlanningPeriod(items, nextClientId, month).map((item) => item.id));
  }

  function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    setSelectedIds(contentItemsForPlanningPeriod(items, clientId, nextMonth).map((item) => item.id));
  }

  function closeModal() {
    if (isGenerating) return;
    setOpen(false);
    setMessage(null);
  }

  function toggleItem(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((currentId) => currentId !== itemId)
        : [...current, itemId],
    );
  }

  function selectAll() {
    setSelectedIds(foundItems.map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function generatePdf() {
    setMessage(null);

    if (!clientId) {
      setMessage("Escolhe um cliente antes de gerar o PDF.");
      return;
    }
    if (!month) {
      setMessage("Escolhe um período antes de gerar o PDF.");
      return;
    }
    if (!selectedIds.length) {
      setMessage("Seleciona pelo menos um conteúdo.");
      return;
    }
    if (!preparedByName.trim() || !preparedByEmail.trim()) {
      setMessage("Indica o nome e email de quem preparou o documento.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-planning/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          month,
          itemIds: selectedIds,
          preparedByName,
          preparedByEmail,
        }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(error?.message ?? "Não foi possível gerar o PDF.");
        return;
      }

      const blob = await response.blob();
      const filename = parseFilename(response.headers.get("content-disposition"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("PDF gerado.");
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
      setMessage("Não foi possível gerar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[rgba(83,183,223,0.45)] bg-white/75 px-3.5 text-sm font-extrabold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)] transition hover:bg-[var(--bb-primary-hover)]"
      >
        <FileDown className="size-4" aria-hidden="true" />
        Exportar planeamento
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(20,20,18,0.42)] px-3 py-4 backdrop-blur-sm md:py-8">
          <div className="w-full max-w-[1040px] rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:p-6 lg:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--bb-charcoal)]">
                  Exportar planeamento
                </h2>
                <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">
                  Prepara o PDF com os conteúdos do cliente e período selecionados.
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

            <div className="grid gap-5">
              <div className="grid min-w-0 gap-x-4 gap-y-4 md:grid-cols-2">
                <label className={labelClass}>
                  Cliente
                  <SelectField
                    name="planning_client_id"
                    value={clientId}
                    onValueChange={changeClient}
                    options={clientOptions(clients)}
                    required
                  />
                </label>
                <label className={labelClass}>
                  Período
                  <MonthPicker
                    name="planning_month"
                    value={month}
                    onValueChange={changeMonth}
                    required
                    ariaLabel="Período"
                  />
                </label>
                <label className={labelClass}>
                  Nome de quem preparou
                  <input
                    value={preparedByName}
                    onChange={(event) => setPreparedByName(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Email de quem preparou
                  <input
                    type="email"
                    value={preparedByEmail}
                    onChange={(event) => setPreparedByEmail(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-3 rounded-[18px] border border-[var(--bb-border)] bg-white/55 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">
                      Conteúdos encontrados para {formatContentMonthLabel(month)}
                    </div>
                    <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                      {foundItems.length} encontrados · {selectedItems.length} selecionados
                      {platformList.length ? ` · ${platformList.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="inline-flex min-h-9 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
                    >
                      Selecionar tudo
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="inline-flex min-h-9 items-center rounded-full border border-[var(--bb-border)] bg-white/75 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>

                <div className="max-h-[42vh] overflow-y-auto pr-1">
                  {foundItems.length ? (
                    <div className="grid gap-2">
                      {foundItems.map((item) => {
                        const checked = selectedIds.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className={`flex min-w-0 cursor-pointer gap-3 rounded-[16px] border px-3 py-3 transition ${
                              checked
                                ? "border-[rgba(83,183,223,0.45)] bg-[var(--bb-primary-soft)]"
                                : "border-[var(--bb-border)] bg-white/65 hover:bg-white"
                            }`}
                          >
                            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-[var(--bb-border)] bg-white">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleItem(item.id)}
                                className="sr-only"
                              />
                              {checked ? <Check className="size-4 text-[var(--bb-black)]" aria-hidden="true" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                                <span>{formatDate(item.publish_date)}</span>
                                {formatTime(item.publish_time) ? <span>{formatTime(item.publish_time)}</span> : null}
                                <span>{displayContentPlatform(item.platform)}</span>
                                {item.format ? <span>{item.format}</span> : null}
                              </span>
                              <span className="mt-1 block text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
                                {cleanPrefixedTitle(item.title, item.clients)}
                              </span>
                              {!item.copy_text?.trim() && !item.description?.trim() ? (
                                <span className="mt-1 block text-xs font-bold text-[#8f2415]">
                                  Sem copy e sem descrição
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[var(--bb-border)] bg-white/55 px-4 py-6 text-center text-sm font-bold text-[var(--bb-muted)]">
                      Não existem conteúdos para este cliente e período.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 text-sm font-bold">
                <div className="rounded-2xl border border-[var(--bb-border)] bg-white/60 px-4 py-3 text-[var(--bb-charcoal)]">
                  Website: <span className="font-extrabold">blendbyte.pt</span>
                </div>
                {!selectedIds.length ? (
                  <WarningLine>Seleciona pelo menos um conteúdo para gerar o PDF.</WarningLine>
                ) : null}
                {itemsWithoutDate.length ? (
                  <WarningLine>
                    {itemsWithoutDate.length} conteúdo(s) selecionado(s) sem data. Vão aparecer no fim.
                  </WarningLine>
                ) : null}
                {itemsWithoutText.length ? (
                  <WarningLine>
                    {itemsWithoutText.length} conteúdo(s) sem copy e sem descrição.
                  </WarningLine>
                ) : null}
                {message ? (
                  <p className="rounded-2xl border border-[var(--bb-border)] bg-white/65 px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
                    {message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--bb-border)] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-hover)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={generatePdf}
                  disabled={isGenerating}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Download className="size-4" aria-hidden="true" />
                  {isGenerating ? "A gerar..." : "Gerar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function WarningLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-2xl border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-[#8f2415]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
