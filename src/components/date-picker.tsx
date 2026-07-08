"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

type DatePickerProps = {
  name: string;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  ariaLabel?: string;
  className?: string;
};

type MonthPickerProps = DatePickerProps;

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const weekDays = ["S", "T", "Q", "Q", "S", "S", "D"];

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "Selecionar data";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function parseIsoMonth(value?: string | null) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function toIsoMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(value: string) {
  const date = parseIsoMonth(value);
  if (!date) return "Selecionar mês";
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: startOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({
  name,
  defaultValue,
  value: controlledValue,
  onValueChange,
  required,
  ariaLabel,
  className = "",
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = isControlled ? controlledValue : internalValue;
  const selectedDate = parseIsoDate(value);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 320 });
  const days = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const today = new Date();

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const menuHeight = 360;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const openAbove = availableBelow < menuHeight && rect.top > availableBelow;
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - menuHeight - gap)
        : Math.min(window.innerHeight - viewportPadding - menuHeight, rect.bottom + gap);

      setPosition({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - 320 - viewportPadding)),
        top,
        width: Math.max(300, Math.min(340, rect.width)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
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

  function changeMonth(offset: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function changeValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function selectDate(date: Date) {
    changeValue(toIsoDate(date));
    setViewDate(date);
    setOpen(false);
  }

  function selectToday() {
    selectDate(new Date());
  }

  function clearDate() {
    changeValue("");
    setOpen(false);
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 px-3.5 text-left text-sm font-semibold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.05)] outline-none transition duration-200 hover:border-[rgba(83,183,223,0.45)] hover:bg-white focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_4px_var(--bb-primary-soft)]"
      >
        <span className={value ? "text-[var(--bb-charcoal)]" : "text-[var(--bb-muted)]"}>
          {value ? formatDisplay(value) : "Selecionar data"}
        </span>
        <CalendarDays className="size-4 shrink-0 text-[var(--bb-muted)] transition group-hover:text-[var(--bb-charcoal)]" aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          data-portal="datepicker"
          role="dialog"
          aria-label={ariaLabel ?? "Calendário"}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            zIndex: 99999,
          }}
          className="fixed rounded-[20px] border border-[var(--bb-border)] bg-white/95 p-3 font-sans shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              aria-label="Mês seguinte"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase text-[var(--bb-muted)]">
            {weekDays.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">{day}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="size-9" />;
              const selected = selectedDate ? sameDay(date, selectedDate) : false;
              const isToday = sameDay(date, today);

              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`grid size-9 place-items-center rounded-full text-sm font-bold transition ${
                    selected
                      ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_22px_rgba(83,183,223,0.28)]"
                      : isToday
                        ? "border border-[var(--bb-primary)] bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                        : "text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--bb-border)] pt-3">
            <button
              type="button"
              onClick={selectToday}
              className="min-h-9 rounded-full bg-[var(--bb-black)] px-3 text-xs font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={clearDate}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-red-soft)] hover:text-[#8f2415]"
            >
              <X className="size-3.5" aria-hidden="true" />
              Limpar
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function MonthPicker({
  name,
  defaultValue,
  value: controlledValue,
  onValueChange,
  required,
  ariaLabel,
  className = "",
}: MonthPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = isControlled ? controlledValue : internalValue;
  const selectedMonth = parseIsoMonth(value);
  const [viewYear, setViewYear] = useState(() => selectedMonth?.getFullYear() ?? new Date().getFullYear());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 320 });

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const menuHeight = 286;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const openAbove = availableBelow < menuHeight && rect.top > availableBelow;
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - menuHeight - gap)
        : Math.min(window.innerHeight - viewportPadding - menuHeight, rect.bottom + gap);

      setPosition({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - 320 - viewportPadding)),
        top,
        width: Math.max(300, Math.min(340, rect.width)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
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

  function changeValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function selectMonth(monthIndex: number) {
    changeValue(toIsoMonth(new Date(viewYear, monthIndex, 1)));
    setOpen(false);
  }

  function clearMonth() {
    changeValue("");
    setOpen(false);
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 px-3.5 text-left text-sm font-semibold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.05)] outline-none transition duration-200 hover:border-[rgba(83,183,223,0.45)] hover:bg-white focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_4px_var(--bb-primary-soft)]"
      >
        <span className={value ? "text-[var(--bb-charcoal)]" : "text-[var(--bb-muted)]"}>
          {value ? formatMonthDisplay(value) : "Selecionar mês"}
        </span>
        <CalendarDays className="size-4 shrink-0 text-[var(--bb-muted)] transition group-hover:text-[var(--bb-charcoal)]" aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          data-portal="monthpicker"
          role="dialog"
          aria-label={ariaLabel ?? "Mês"}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            zIndex: 99999,
          }}
          className="fixed rounded-[20px] border border-[var(--bb-border)] bg-white/95 p-3 font-sans shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewYear((current) => current - 1)}
              className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{viewYear}</div>
            <button
              type="button"
              onClick={() => setViewYear((current) => current + 1)}
              className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              aria-label="Ano seguinte"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((month, index) => {
              const selected = selectedMonth?.getFullYear() === viewYear && selectedMonth.getMonth() === index;

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => selectMonth(index)}
                  className={`min-h-11 rounded-2xl px-2 text-sm font-extrabold transition ${
                    selected
                      ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_10px_22px_rgba(83,183,223,0.28)]"
                      : "bg-white/62 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>

          {!required ? (
            <div className="mt-3 flex justify-end border-t border-[var(--bb-border)] pt-3">
              <button
                type="button"
                onClick={clearMonth}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-red-soft)] hover:text-[#8f2415]"
              >
                <X className="size-3.5" aria-hidden="true" />
                Limpar
              </button>
            </div>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
