"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DatePicker } from "@/components/date-picker";
import { SelectField, type SelectOption } from "@/components/select-field";

type ContentFilterValues = {
  client: string;
  month: string;
  publishUntil: string;
  status: string;
  platform: string;
};

type TaskFilterValues = {
  assignee: string;
  client: string;
  status: string;
  due: string;
};

type ContentFiltersBarProps = {
  filters: ContentFilterValues;
  clientOptions: SelectOption[];
  monthOptions: SelectOption[];
  statusOptions: SelectOption[];
  platformOptions: SelectOption[];
};

type TasksFiltersBarProps = {
  filters: TaskFilterValues;
  clientOptions: SelectOption[];
  statusOptions: SelectOption[];
};

const labelClass =
  "grid gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]";

function useLiveQueryFilters<T extends Record<string, string>>(initialFilters: T, keys: Array<keyof T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const searchSnapshot = searchParams.toString();

  const replaceWith = useCallback((nextFilters: T) => {
    const nextParams = new URLSearchParams(searchSnapshot);

    keys.forEach((key) => {
      const value = nextFilters[key];
      if (value) {
        nextParams.set(String(key), value);
      } else {
        nextParams.delete(String(key));
      }
    });

    const query = nextParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [keys, pathname, router, searchSnapshot]);

  const updateFilter = useCallback((key: keyof T, value: string, mode: "immediate" | "debounced" = "immediate") => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    if (mode === "immediate") replaceWith(nextFilters);
  }, [filters, replaceWith]);

  const clearFilters = useCallback(() => {
    const emptyFilters = Object.fromEntries(keys.map((key) => [key, ""])) as T;
    setFilters(emptyFilters);
    replaceWith(emptyFilters);
  }, [keys, replaceWith]);

  const hasActiveFilters = keys.some((key) => Boolean(filters[key]));

  return { filters, hasActiveFilters, isPending, updateFilter, replaceWith, clearFilters };
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Limpar filtros"
      title="Limpar filtros"
      className="inline-grid size-11 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition duration-200 hover:bg-[var(--bb-primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
    </button>
  );
}

function UpdatingState({ isPending }: { isPending: boolean }) {
  return (
    <div
      aria-live="polite"
      className="min-w-[88px] pb-3 text-xs font-extrabold text-[var(--bb-muted)]"
    >
      {isPending ? "A atualizar..." : ""}
    </div>
  );
}

export function ContentFiltersBar({
  filters: initialFilters,
  clientOptions,
  monthOptions,
  statusOptions,
  platformOptions,
}: ContentFiltersBarProps) {
  const keys = useMemo<Array<keyof ContentFilterValues>>(
    () => ["client", "month", "publishUntil", "status", "platform"],
    [],
  );
  const { filters, hasActiveFilters, isPending, updateFilter, clearFilters } = useLiveQueryFilters(initialFilters, keys);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className={`${labelClass} min-w-[240px] flex-[1_1_240px]`}>
        Cliente
        <SelectField
          name="client"
          value={filters.client}
          onValueChange={(value) => updateFilter("client", value)}
          options={clientOptions}
        />
      </label>
      <label className={`${labelClass} min-w-[170px] flex-[1_1_170px]`}>
        Mês
        <SelectField
          name="month"
          value={filters.month}
          onValueChange={(value) => updateFilter("month", value)}
          options={monthOptions}
        />
      </label>
      <label className={`${labelClass} min-w-[170px] flex-[1_1_170px]`}>
        Publicação até
        <DatePicker
          name="publishUntil"
          value={filters.publishUntil}
          onValueChange={(value) => updateFilter("publishUntil", value)}
          ariaLabel="Publicação até"
        />
      </label>
      <label className={`${labelClass} min-w-[210px] flex-[1_1_210px]`}>
        Estado
        <SelectField
          name="status"
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value)}
          options={statusOptions}
        />
      </label>
      <label className={`${labelClass} min-w-[190px] flex-[1_1_190px]`}>
        Plataforma
        <SelectField
          name="platform"
          value={filters.platform}
          onValueChange={(value) => updateFilter("platform", value)}
          options={platformOptions}
        />
      </label>
      <div className="flex items-end gap-2">
        {hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}
        <UpdatingState isPending={isPending} />
      </div>
    </div>
  );
}

export function TasksFiltersBar({
  filters: initialFilters,
  clientOptions,
  statusOptions,
}: TasksFiltersBarProps) {
  const keys = useMemo<Array<keyof TaskFilterValues>>(
    () => ["assignee", "client", "status", "due"],
    [],
  );
  const { filters, hasActiveFilters, isPending, updateFilter, replaceWith, clearFilters } = useLiveQueryFilters(
    initialFilters,
    keys,
  );
  const previousAssignee = useRef(filters.assignee);

  useEffect(() => {
    if (previousAssignee.current === filters.assignee) return;
    previousAssignee.current = filters.assignee;

    const timeout = window.setTimeout(() => {
      replaceWith(filters);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters, filters.assignee, replaceWith]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className={`${labelClass} min-w-[190px] flex-[1_1_190px]`}>
        Responsável
        <input
          name="assignee"
          placeholder="Responsável"
          value={filters.assignee}
          onChange={(event) => updateFilter("assignee", event.target.value, "debounced")}
          className="bb-input text-sm font-semibold"
        />
      </label>
      <label className={`${labelClass} min-w-[260px] flex-[1.4_1_260px]`}>
        Cliente
        <SelectField
          name="client"
          value={filters.client}
          onValueChange={(value) => updateFilter("client", value)}
          options={clientOptions}
        />
      </label>
      <label className={`${labelClass} min-w-[190px] flex-[1_1_190px]`}>
        Estado
        <SelectField
          name="status"
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value)}
          options={statusOptions}
        />
      </label>
      <label className={`${labelClass} min-w-[170px] flex-[1_1_170px]`}>
        Prazo até
        <DatePicker
          name="due"
          value={filters.due}
          onValueChange={(value) => updateFilter("due", value)}
          ariaLabel="Prazo até"
        />
      </label>
      <div className="flex items-end gap-2">
        {hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}
        <UpdatingState isPending={isPending} />
      </div>
    </div>
  );
}
