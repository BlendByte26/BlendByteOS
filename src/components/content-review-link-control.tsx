"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, RotateCw } from "lucide-react";
import { rotateContentReviewLinkAction } from "@/lib/content-review-actions";

function copyText(value: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

export function ContentReviewLinkControl({ roundId }: { roundId: string }) {
  const [path, setPath] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const url = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : "";

  function rotate() {
    if (!window.confirm("Gerar um novo link? O link anterior deixa imediatamente de funcionar.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await rotateContentReviewLinkAction(roundId);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPath(result.path);
      setMessage("Novo link criado. Copie-o antes de sair desta página.");
    });
  }

  return (
    <section className="mb-6 rounded-[22px] border border-[rgba(83,183,223,0.32)] bg-[var(--bb-primary-soft)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--bb-charcoal)]"><Link2 className="size-4" />Link privado do cliente</div>
          <p className="mt-1 text-xs font-bold text-[var(--bb-muted)]">Por segurança, o link atual não é recuperável. Pode gerar um novo; o anterior será invalidado.</p>
        </div>
        <button type="button" onClick={rotate} disabled={isPending} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white disabled:opacity-50"><RotateCw className="size-4" />{isPending ? "A gerar..." : "Gerar novo link"}</button>
      </div>
      {path ? <div className="mt-3 flex flex-wrap gap-2"><input readOnly value={url} className="min-h-11 min-w-64 flex-1 rounded-2xl border border-[var(--bb-border)] bg-white px-3.5 text-sm font-semibold" /><button type="button" onClick={() => void copyText(url).then(() => setMessage("Link copiado."))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white px-4 text-sm font-extrabold"><Copy className="size-4" />Copiar</button></div> : null}
      {message ? <p role="status" className="mt-2 text-xs font-extrabold text-[var(--bb-charcoal)]">{message}</p> : null}
    </section>
  );
}
