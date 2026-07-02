"use client";

import { Panel } from "@/components/ui";

export default function ClientDetailError({ reset }: { reset: () => void }) {
  return (
    <Panel className="p-6">
      <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">
        Não foi possível carregar este cliente.
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--bb-muted)]">
        Tenta novamente dentro de momentos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex min-h-10 items-center rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
      >
        Tentar novamente
      </button>
    </Panel>
  );
}
