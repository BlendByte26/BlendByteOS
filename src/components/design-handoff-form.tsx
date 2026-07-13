"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Send, X } from "lucide-react";
import { SelectField } from "@/components/select-field";
import { designProfiles } from "@/lib/operational-profiles";

type DesignHandoffFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function DesignHandoffForm({ action }: DesignHandoffFormProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[99990] grid place-items-center bg-[rgba(12,16,18,0.32)] p-3 font-sans backdrop-blur-sm md:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <form
              action={action}
              className="w-full max-w-md overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--bb-border)] bg-white/60 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                    <Send className="size-4" aria-hidden="true" />
                    Design
                  </div>
                  <h2 className="mt-1 text-lg font-extrabold text-[var(--bb-charcoal)]">
                    Enviar para Design
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  title="Fechar"
                  className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid gap-4 px-5 py-5">
                <label className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                  Designer responsável
                  <SelectField
                    name="designer_profile_key"
                    defaultValue="carlota"
                    options={designProfiles.map((profile) => ({
                      value: profile.key,
                      label: profile.name,
                    }))}
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-muted)] transition hover:bg-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
                  >
                    <Send className="size-4" aria-hidden="true" />
                    Confirmar
                  </button>
                </div>
              </div>
            </form>
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="contents">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
      >
        <Send className="size-4" aria-hidden="true" />
        Enviar para Design
      </button>
      {modal}
    </span>
  );
}
