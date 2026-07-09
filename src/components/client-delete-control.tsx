"use client";

import { Trash2 } from "lucide-react";
import { deleteClientAction } from "@/lib/actions";

export function ClientDeleteControl({
  clientId,
  clientName,
  contentCount,
  taskCount,
}: {
  clientId: string;
  clientName: string;
  contentCount: number;
  taskCount: number;
}) {
  const hasAssociatedData = contentCount > 0 || taskCount > 0;

  if (hasAssociatedData) {
    return (
      <div className="grid gap-1">
        <button
          type="button"
          disabled
          aria-label="Cliente com dados associados"
          title="Não é possível apagar clientes com conteúdos ou tarefas associados."
          className="inline-grid size-9 shrink-0 cursor-not-allowed place-items-center rounded-full border border-[rgba(232,76,49,0.22)] bg-[var(--bb-red-soft)] text-[#8f2415] opacity-75"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
        <span className="max-w-24 text-[10px] font-extrabold leading-3 text-[#8f2415]">
          Tem dados
        </span>
      </div>
    );
  }

  return (
    <form
      action={deleteClientAction.bind(null, clientId)}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Apagar definitivamente o cliente "${clientName}"?\n\nEsta ação não pode ser anulada.`,
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label="Apagar definitivamente"
        title="Apagar definitivamente"
        className="inline-grid size-9 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/55 text-[#a73522] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition duration-200 hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
