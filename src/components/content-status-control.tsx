"use client";

import { useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { SelectField } from "@/components/select-field";
import { contentStatusLabels } from "@/lib/labels";
import { contentStatusTones } from "@/lib/status-styles";
import { contentStatuses, type ContentStatus } from "@/lib/types";

type ContentStatusAction = (id: string, formData: FormData) => void | Promise<void>;

type ContentStatusControlProps = {
  itemId: string;
  status: ContentStatus;
  canPersist: boolean;
  updateStatusAction: ContentStatusAction;
  className?: string;
  compact?: boolean;
};

export function ContentStatusControl({
  itemId,
  status,
  canPersist,
  updateStatusAction,
  className = "",
  compact = true,
}: ContentStatusControlProps) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState<ContentStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const value = optimisticStatus ?? status;

  function updateStatus(nextStatus: string) {
    if (nextStatus === value) return;

    if (!canPersist) {
      setMessage("Modo demo: configure o Supabase para atualizar o estado.");
      return;
    }

    const previousStatus = value;
    const formData = new FormData();
    formData.set("status", nextStatus);
    flushSync(() => {
      setOptimisticStatus(nextStatus as ContentStatus);
      setMessage("A atualizar estado...");
    });

    startTransition(() => {
      void Promise.resolve(updateStatusAction(itemId, formData))
        .then(() => {
          flushSync(() => {
            setMessage("Estado atualizado.");
          });
          window.setTimeout(() => {
            router.refresh();
          }, 1200);
        })
        .catch((error: unknown) => {
          console.error("Erro ao atualizar estado do conteúdo", error);
          setOptimisticStatus(previousStatus);
          setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o estado.");
        });
    });
  }

  return (
    <div className={`grid min-w-0 gap-1 ${className}`}>
      <SelectField
        name={`status-${itemId}`}
        value={value}
        onValueChange={updateStatus}
        compact={compact}
        ariaLabel="Atualizar estado"
        options={contentStatuses.map((option) => ({
          value: option,
          label: contentStatusLabels[option],
          tone: contentStatusTones[option],
        }))}
      />
      {message ? (
        <span
          className={`text-[11px] font-bold ${
            message === "Estado atualizado." ? "text-[var(--bb-muted)]" : "text-[#8f2415]"
          }`}
          aria-live="polite"
        >
          {isPending ? "A atualizar estado..." : message}
        </span>
      ) : null}
    </div>
  );
}
