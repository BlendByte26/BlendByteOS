"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { getStatusStyle, type StatusTone } from "@/lib/status-styles";

export type SelectOption = {
  value: string;
  label: string;
  tone?: StatusTone;
};

type SelectFieldProps = {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
};

type MultiSelectFieldProps = {
  name: string;
  options: SelectOption[];
  value: string[];
  onValueChange?: (value: string[]) => void;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  allLabel?: string;
};

export function SelectField({
  name,
  options,
  defaultValue = "",
  value,
  onValueChange,
  required,
  ariaLabel,
  className = "",
  compact = false,
}: SelectFieldProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? options[0],
    [options, selectedValue],
  );
  const selectedStyle = selectedOption?.tone ? getStatusStyle(selectedOption.tone) : null;

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const availableAbove = rect.top - viewportPadding - gap;
      const openAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(
        160,
        Math.min(280, openAbove ? availableAbove : availableBelow),
      );
      const preferredTop = openAbove
        ? Math.max(viewportPadding, rect.top - maxHeight - gap)
        : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap);
      const top = Math.max(viewportPadding, preferredTop);

      setPosition({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
        top,
        width: rect.width,
        maxHeight,
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
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function selectValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === selectedValue),
    );
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    selectValue(options[nextIndex]?.value ?? "");
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <input type="hidden" name={name} value={selectedOption?.value ?? ""} required={required} />
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`group flex w-full items-center justify-between gap-2 rounded-2xl border text-left font-semibold shadow-[0_12px_28px_rgba(0,0,0,0.05)] outline-none transition duration-200 hover:border-[rgba(83,183,223,0.45)] hover:bg-white focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_4px_var(--bb-primary-soft)] ${
          selectedStyle ? selectedStyle.pill : "border-[var(--bb-border)] bg-white/75 text-[var(--bb-charcoal)]"
        } ${
          compact ? "min-h-9 px-3 text-xs" : "min-h-11 px-3.5 text-sm"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedStyle ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${selectedStyle.dot}`} /> : null}
          <span className="min-w-0 truncate">{selectedOption?.label ?? "Selecionar"}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--bb-muted)] transition duration-200 ${
            open ? "rotate-180 text-[var(--bb-charcoal)]" : "group-hover:text-[var(--bb-charcoal)]"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          data-portal="select"
          id={id}
          role="listbox"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: 99999,
          }}
          className="fixed overflow-y-auto rounded-[18px] border border-[var(--bb-border)] bg-white/95 p-1.5 font-sans shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;
            const optionStyle = option.tone ? getStatusStyle(option.tone) : null;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => selectValue(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-bold transition ${
                  selected
                    ? "bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                    : "text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {optionStyle ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${optionStyle.dot}`} /> : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                </span>
                {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function MultiSelectField({
  name,
  options,
  value,
  onValueChange,
  ariaLabel,
  className = "",
  compact = false,
  allLabel = "Todos",
}: MultiSelectFieldProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const selectedValues = useMemo(() => value.filter(Boolean), [value]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const itemOptions = useMemo(() => options.filter((option) => option.value), [options]);
  const allOption = options.find((option) => !option.value);
  const singleSelectedOption = selectedValues.length === 1
    ? itemOptions.find((option) => option.value === selectedValues[0])
    : undefined;
  const singleSelectedStyle = singleSelectedOption?.tone
    ? getStatusStyle(singleSelectedOption.tone)
    : null;
  const triggerLabel = useMemo(() => {
    if (selectedValues.length === 0) return allOption?.label ?? allLabel;
    if (selectedValues.length === 1) {
      return itemOptions.find((option) => option.value === selectedValues[0])?.label ?? selectedValues[0];
    }
    return `${selectedValues.length} estados`;
  }, [allLabel, allOption?.label, itemOptions, selectedValues]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const availableAbove = rect.top - viewportPadding - gap;
      const openAbove = availableBelow < 220 && availableAbove > availableBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, openAbove ? availableAbove : availableBelow),
      );
      const preferredTop = openAbove
        ? Math.max(viewportPadding, rect.top - maxHeight - gap)
        : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap);
      const top = Math.max(viewportPadding, preferredTop);

      setPosition({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
        top,
        width: rect.width,
        maxHeight,
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
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function updateSelected(nextValue: string[]) {
    onValueChange?.(nextValue);
  }

  function toggleValue(nextValue: string) {
    if (!nextValue) {
      updateSelected([]);
      return;
    }

    if (selectedSet.has(nextValue)) {
      updateSelected(selectedValues.filter((currentValue) => currentValue !== nextValue));
      return;
    }

    updateSelected([...selectedValues, nextValue]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
    }
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {selectedValues.map((selectedValue) => (
        <input key={selectedValue} type="hidden" name={name} value={selectedValue} />
      ))}
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`group flex w-full items-center justify-between gap-2 rounded-2xl border border-[var(--bb-border)] bg-white/75 text-left font-semibold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.05)] outline-none transition duration-200 hover:border-[rgba(83,183,223,0.45)] hover:bg-white focus:border-[rgba(83,183,223,0.72)] focus:shadow-[0_0_0_4px_var(--bb-primary-soft)] ${
          compact ? "min-h-9 px-3 text-xs" : "min-h-11 px-3.5 text-sm"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {singleSelectedStyle ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${singleSelectedStyle.dot}`} /> : null}
          <span className="min-w-0 truncate">{triggerLabel}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--bb-muted)] transition duration-200 ${
            open ? "rotate-180 text-[var(--bb-charcoal)]" : "group-hover:text-[var(--bb-charcoal)]"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          data-portal="multi-select"
          id={id}
          role="listbox"
          aria-multiselectable="true"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: 99999,
          }}
          className="fixed overflow-y-auto rounded-[18px] border border-[var(--bb-border)] bg-white/95 p-1.5 font-sans shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          {allOption ? (
            <button
              type="button"
              role="option"
              aria-selected={selectedValues.length === 0}
              onClick={() => toggleValue("")}
              className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-bold transition ${
                selectedValues.length === 0
                  ? "bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                  : "text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-4 shrink-0 place-items-center rounded border ${
                  selectedValues.length === 0
                    ? "border-[var(--bb-primary)] bg-[var(--bb-primary)] text-[var(--bb-black)]"
                    : "border-[var(--bb-border)] bg-white"
                }`}
              >
                {selectedValues.length === 0 ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 truncate">{allOption.label}</span>
            </button>
          ) : null}

          {itemOptions.map((option) => {
            const selected = selectedSet.has(option.value);
            const optionStyle = option.tone ? getStatusStyle(option.tone) : null;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggleValue(option.value)}
                className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-bold transition ${
                  selected
                    ? "bg-[var(--bb-primary-soft)] text-[var(--bb-black)]"
                    : "text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-hover)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-4 shrink-0 place-items-center rounded border ${
                    selected
                      ? "border-[var(--bb-primary)] bg-[var(--bb-primary)] text-[var(--bb-black)]"
                      : "border-[var(--bb-border)] bg-white"
                  }`}
                >
                  {selected ? <Check className="size-3" /> : null}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  {optionStyle ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${optionStyle.dot}`} /> : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
