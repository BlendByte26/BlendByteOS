"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { DatePicker } from "@/components/date-picker";
import { MultiSelectField, SelectField, type SelectOption } from "@/components/select-field";

type ContentFilterValues = {
  assignee: string;
  client: string;
  month: string;
  publishUntil: string;
  status: string[];
  platform: string;
  year: string;
};

type TaskFilterValues = {
  assignee: string;
  client: string;
  priority: string;
  status: string;
  due: string;
};

type DashboardFilterValues = {
  view: string;
};

type ContentFiltersBarProps = {
  filters: ContentFilterValues;
  clientOptions: SelectOption[];
  monthOptions: SelectOption[];
  ownerOptions: SelectOption[];
  statusOptions: SelectOption[];
  platformOptions: SelectOption[];
  yearOptions: SelectOption[];
  defaultYear: string;
};

type TasksFiltersBarProps = {
  filters: TaskFilterValues;
  clientOptions: SelectOption[];
  ownerOptions: SelectOption[];
  priorityOptions: SelectOption[];
  statusOptions: SelectOption[];
};

type DashboardControlsProps = {
  filters: DashboardFilterValues;
  viewOptions: SelectOption[];
};

const labelClass =
  "grid gap-1 text-xs font-extrabold uppercase text-[var(--bb-muted)]";
const contentFilterLabelClass = `${labelClass} min-w-0`;

type FilterValue = string | string[];
type FilterValues = Record<string, FilterValue>;

function hasFilterValue(value: FilterValue) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function useLiveQueryFilters<T extends FilterValues>(
  initialFilters: T,
  keys: Array<keyof T>,
  clearValues?: Partial<T>,
  explicitEmptyValues?: Partial<Record<keyof T, string>>,
) {
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
      nextParams.delete(String(key));

      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((item) => nextParams.append(String(key), item));
      } else if (value) {
        nextParams.set(String(key), value);
      } else if (explicitEmptyValues?.[key]) {
        nextParams.set(String(key), explicitEmptyValues[key]);
      }
    });

    if (keys.some((key) => String(key) === "assignee")) nextParams.delete("owner");
    if (keys.some((key) => String(key) === "publishUntil")) nextParams.delete("until");
    if (keys.some((key) => String(key) === "due")) nextParams.delete("until");
    const query = nextParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [explicitEmptyValues, keys, pathname, router, searchSnapshot]);

  const updateFilter = useCallback((key: keyof T, value: T[keyof T], mode: "immediate" | "debounced" = "immediate") => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    if (mode === "immediate") replaceWith(nextFilters);
  }, [filters, replaceWith]);

  const clearFilters = useCallback(() => {
    const emptyFilters = Object.fromEntries(
      keys.map((key) => [
        key,
        clearValues && key in clearValues
          ? clearValues[key]
          : Array.isArray(initialFilters[key])
            ? []
            : "",
      ]),
    ) as T;
    setFilters(emptyFilters);
    replaceWith(emptyFilters);
  }, [clearValues, initialFilters, keys, replaceWith]);

  const hasActiveFilters = keys.some((key) => hasFilterValue(filters[key]));

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
      className="min-h-9 min-w-[88px] self-end text-xs font-extrabold leading-9 text-[var(--bb-muted)]"
    >
      {isPending ? "A atualizar..." : ""}
    </div>
  );
}

export function DashboardControls({
  filters: initialFilters,
  viewOptions,
}: DashboardControlsProps) {
  const keys = useMemo<Array<keyof DashboardFilterValues>>(() => ["view"], []);
  const { filters, updateFilter } = useLiveQueryFilters(
    initialFilters,
    keys,
  );

  return (
    <div className="inline-flex w-fit max-w-full flex-wrap gap-1.5 rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
      {viewOptions.map((option) => {
        const active = filters.view === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updateFilter("view", option.value)}
            className={`inline-flex min-h-9 items-center rounded-2xl px-3.5 text-sm font-extrabold transition ${
              active
                ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_24px_rgba(83,183,223,0.25)]"
                : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContentFiltersBar({
  filters: initialFilters,
  clientOptions,
  monthOptions,
  ownerOptions,
  statusOptions,
  platformOptions,
  yearOptions,
  defaultYear,
}: ContentFiltersBarProps) {
  const keys = useMemo<Array<keyof ContentFilterValues>>(
    () => ["assignee", "client", "month", "publishUntil", "status", "platform", "year"],
    [],
  );
  const clearValues = useMemo<Partial<ContentFilterValues>>(() => ({ year: defaultYear }), [defaultYear]);
  const explicitEmptyValues = useMemo<Partial<Record<keyof ContentFilterValues, string>>>(
    () => ({ assignee: "all" }),
    [],
  );
  const { filters, isPending, updateFilter, clearFilters } = useLiveQueryFilters(
    initialFilters,
    keys,
    clearValues,
    explicitEmptyValues,
  );
  const secondaryActiveCount = [
    filters.year !== defaultYear ? filters.year : "",
    filters.platform,
    filters.publishUntil,
  ].filter(Boolean).length;
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  return (
    <div
      data-content-filter-bottom
      className="flex w-full min-w-0 flex-wrap items-end justify-between gap-3"
    >
      <div data-primary-filters className="flex min-w-0 flex-wrap items-end gap-2.5">
        <label className={`${contentFilterLabelClass} w-full sm:w-[240px]`}>
          Cliente
          <SelectField
            name="client"
            value={filters.client}
            onValueChange={(value) => updateFilter("client", value)}
            options={clientOptions}
          />
        </label>
        <label className={`${contentFilterLabelClass} w-full sm:w-[200px]`}>
          Estado
          <MultiSelectField
            name="status"
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value)}
            options={statusOptions}
            allLabel="Todos os estados"
          />
        </label>
        <label className={`${contentFilterLabelClass} w-full sm:w-[170px]`}>
          Mês
          <SelectField
            name="month"
            value={filters.month}
            onValueChange={(value) => updateFilter("month", value)}
            options={monthOptions}
          />
        </label>
        <label className={`${contentFilterLabelClass} w-full sm:w-[180px]`}>
          Responsável
          <SelectField
            name="assignee"
            value={filters.assignee}
            onValueChange={(value) => updateFilter("assignee", value)}
            options={ownerOptions}
          />
        </label>
      </div>
      <div className="ml-auto flex shrink-0 items-end gap-2">
        <UpdatingState isPending={isPending} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreFiltersOpen((current) => !current)}
            aria-expanded={moreFiltersOpen}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-extrabold shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition ${
              secondaryActiveCount
                ? "border-[rgba(83,183,223,0.42)] bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]"
                : "border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
            }`}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Mais filtros{secondaryActiveCount ? ` · ${secondaryActiveCount}` : ""}
          </button>
          {moreFiltersOpen ? (
            <div
              data-more-filters-panel
              className="absolute right-0 z-[1000] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[20px] border border-[var(--bb-border)] bg-white/95 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.14)] backdrop-blur-xl"
            >
              <div className="grid gap-2.5">
                <label className={labelClass}>
                  Ano
                  <SelectField
                    name="year"
                    value={filters.year}
                    onValueChange={(value) => updateFilter("year", value)}
                    options={yearOptions}
                  />
                </label>
                <label className={labelClass}>
                  Plataforma
                  <SelectField
                    name="platform"
                    value={filters.platform}
                    onValueChange={(value) => updateFilter("platform", value)}
                    options={platformOptions}
                  />
                </label>
                <label className={labelClass}>
                  Publicação até
                  <DatePicker
                    name="publishUntil"
                    value={filters.publishUntil}
                    onValueChange={(value) => updateFilter("publishUntil", value)}
                    ariaLabel="Publicação até"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setMoreFiltersOpen(false);
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-sm font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TasksFiltersBar({
  filters: initialFilters,
  clientOptions,
  ownerOptions,
  priorityOptions,
  statusOptions,
}: TasksFiltersBarProps) {
  const keys = useMemo<Array<keyof TaskFilterValues>>(
    () => ["assignee", "client", "status", "priority", "due"],
    [],
  );
  const explicitEmptyValues = useMemo<Partial<Record<keyof TaskFilterValues, string>>>(
    () => ({ assignee: "all" }),
    [],
  );
  const { filters, hasActiveFilters, isPending, updateFilter, clearFilters } = useLiveQueryFilters(
    initialFilters,
    keys,
    undefined,
    explicitEmptyValues,
  );

  return (
    <div className="grid items-end gap-2.5 lg:grid-cols-[minmax(220px,1.35fr)_minmax(160px,0.9fr)_minmax(170px,0.82fr)_minmax(150px,0.72fr)_minmax(170px,0.82fr)_auto]">
      <label className={labelClass}>
        Cliente
        <SelectField
          name="client"
          value={filters.client}
          onValueChange={(value) => updateFilter("client", value)}
          options={clientOptions}
        />
      </label>
      <label className={labelClass}>
        Responsável
        <SelectField
          name="assignee"
          value={filters.assignee}
          onValueChange={(value) => updateFilter("assignee", value)}
          options={ownerOptions}
        />
      </label>
      <label className={labelClass}>
        Estado
        <SelectField
          name="status"
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value)}
          options={statusOptions}
        />
      </label>
      <label className={labelClass}>
        Prioridade
        <SelectField
          name="priority"
          value={filters.priority}
          onValueChange={(value) => updateFilter("priority", value)}
          options={priorityOptions}
        />
      </label>
      <label className={labelClass}>
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
