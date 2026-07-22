"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ListRestart } from "lucide-react";
import { startContentReviewRevisionAction } from "@/lib/content-review-actions";

export function ContentReviewRevisionControl({ blockId, taskId }: { blockId: string; taskId: string | null }) {
  const router = useRouter();
  const [createdTaskId, setCreatedTaskId] = useState(taskId);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (createdTaskId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f3e9] px-3 py-1.5 text-xs font-extrabold text-[#2f7650]"><Check className="size-3.5" />Revisão iniciada</span>
        <Link href={`/tasks/${createdTaskId}/edit`} className="text-xs font-extrabold underline underline-offset-4">Abrir tarefa</Link>
      </div>
    );
  }

  function startRevision() {
    setMessage(null);
    startTransition(async () => {
      const result = await startContentReviewRevisionAction(blockId);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCreatedTaskId(result.taskId);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={startRevision} disabled={isPending} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:opacity-50">
        <ListRestart className="size-4" />
        {isPending ? "A iniciar..." : "Iniciar revisão"}
      </button>
      {message ? <p role="status" className="text-xs font-bold text-[#9f493c]">{message}</p> : null}
    </div>
  );
}
