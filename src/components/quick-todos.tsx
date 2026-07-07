"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createQuickTodoAction,
  deleteQuickTodoAction,
  toggleQuickTodoAction,
  updateQuickTodoAction,
} from "@/lib/actions";
import type { OperationalProfile } from "@/lib/operational-profiles";
import type { QuickTodo, QuickTodoItemType, QuickTodoView } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[20px] border border-[var(--bb-border)] bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 transition hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const focusByProfile: Record<OperationalProfile["key"], string> = {
  carlota: "Foco: design e validações",
  sofia: "Foco: publicações, follow-ups e operação",
  guilherme: "Foco: visão geral da operação",
};

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 20) return "Boa tarde";
  return "Boa noite";
}

function TodayPanel({ profile }: { profile: OperationalProfile }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const time = now
    ? new Intl.DateTimeFormat("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--";
  const date = now
    ? new Intl.DateTimeFormat("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(now)
    : "a carregar";
  const greeting = now ? getGreeting(now.getHours()) : "Olá";

  return (
    <Panel className="p-4">
      <div className="flex h-full min-h-40 flex-col justify-between gap-6">
        <div>
          <div className="mb-3 inline-grid size-9 place-items-center rounded-full bg-[var(--bb-primary-soft)] text-[var(--bb-charcoal)]">
            <Clock3 className="size-4" aria-hidden="true" />
          </div>
          <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">Hoje</h2>
          <p className="mt-2 text-xl font-extrabold text-[var(--bb-charcoal)]">
            {greeting}, {profile.name}
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--bb-muted)]">
            {time} · {date}
          </p>
        </div>
        <p className="rounded-[16px] border border-[var(--bb-border)] bg-white/48 px-3 py-2 text-sm font-extrabold text-[var(--bb-charcoal)]">
          {focusByProfile[profile.key]}
        </p>
      </div>
    </Panel>
  );
}

function itemTypeLabel(itemType: QuickTodoItemType) {
  return itemType === "reminder" ? "Lembrete" : "To-do";
}

export function QuickTodosPanel({
  view,
  profile,
  todos,
}: {
  view: QuickTodoView;
  profile: OperationalProfile;
  todos: QuickTodo[];
}) {
  const [editingReminder, setEditingReminder] = useState<QuickTodo | null>(null);
  const [itemType, setItemType] = useState<QuickTodoItemType>("reminder");

  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <TodayPanel profile={profile} />

        <Panel className="p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">Lembretes</h2>
          </div>

          <form action={createQuickTodoAction} className="mb-2.5 grid gap-2">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="profile_key" value={profile.key} />
            <input type="hidden" name="item_type" value={itemType} />
            <div className="flex w-fit rounded-full border border-[var(--bb-border)] bg-white/58 p-1">
              {(["reminder", "todo"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setItemType(type)}
                  className={`min-h-8 rounded-full px-3 text-xs font-extrabold transition focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
                    itemType === type
                      ? "bg-[var(--bb-black)] text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
                      : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-soft)] hover:text-[var(--bb-charcoal)]"
                  }`}
                  aria-pressed={itemType === type}
                >
                  {itemTypeLabel(type)}
                </button>
              ))}
            </div>
            <div className="flex max-w-[420px] gap-2">
              <input
                name="text"
                required
                placeholder={itemType === "reminder" ? "Novo lembrete" : "Novo to-do"}
                className="bb-input h-10 min-w-0 flex-1 text-sm font-semibold"
              />
              <button
                type="submit"
                aria-label={`Adicionar ${itemTypeLabel(itemType).toLowerCase()}`}
                title={`Adicionar ${itemTypeLabel(itemType).toLowerCase()}`}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--bb-black)] text-white shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          {todos.length ? (
            <div className="grid gap-1">
              {todos.map((todo) => {
                const isTodo = todo.item_type === "todo";

                return (
                  <div
                    key={todo.id}
                    className={`flex min-h-9 items-center gap-2 rounded-[12px] border border-[var(--bb-border)] bg-white/58 px-2.5 py-1 ${
                      isTodo && todo.done ? "opacity-68" : ""
                    }`}
                  >
                    {isTodo ? (
                      <form action={toggleQuickTodoAction.bind(null, todo.id)}>
                        <input type="hidden" name="view" value={view} />
                        <input type="hidden" name="profile_key" value={profile.key} />
                        <input type="hidden" name="done" value={todo.done ? "" : "on"} />
                        <button
                          type="submit"
                          role="checkbox"
                          aria-checked={todo.done}
                          aria-label={todo.done ? "Marcar por fazer" : "Marcar como feito"}
                          title={todo.done ? "Marcar por fazer" : "Marcar como feito"}
                          className={`grid size-7 shrink-0 place-items-center rounded-lg border transition focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
                            todo.done
                              ? "border-[rgba(83,183,223,0.42)] bg-[var(--bb-primary)] text-[var(--bb-black)]"
                              : "border-[var(--bb-border)] bg-white/70 text-transparent hover:border-[rgba(83,183,223,0.42)] hover:text-[var(--bb-muted)]"
                          }`}
                        >
                          <Check className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <span
                        className="size-7 shrink-0 rounded-lg border border-[var(--bb-border)] bg-[var(--bb-yellow-soft)]"
                        aria-hidden="true"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingReminder(todo)}
                      className={`min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--bb-charcoal)] transition hover:text-[var(--bb-black)] ${
                        isTodo && todo.done ? "line-through decoration-2" : ""
                      }`}
                    >
                      {todo.text}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingReminder(todo)}
                      aria-label={`Editar ${itemTypeLabel(todo.item_type).toLowerCase()}`}
                      title={`Editar ${itemTypeLabel(todo.item_type).toLowerCase()}`}
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <form action={deleteQuickTodoAction.bind(null, todo.id)}>
                      <input type="hidden" name="view" value={view} />
                      <input type="hidden" name="profile_key" value={profile.key} />
                      <button
                        type="submit"
                        aria-label={`Apagar ${itemTypeLabel(todo.item_type).toLowerCase()}`}
                        title={`Apagar ${itemTypeLabel(todo.item_type).toLowerCase()}`}
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[#a73522] transition hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Sem lembretes." />
          )}
        </Panel>
      </div>

      {editingReminder ? (
        <ModalShell title={itemTypeLabel(editingReminder.item_type)} onClose={() => setEditingReminder(null)}>
          <form action={updateQuickTodoAction.bind(null, editingReminder.id)} className="grid gap-3">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="profile_key" value={profile.key} />
            <textarea
              name="text"
              required
              defaultValue={editingReminder.text}
              className="bb-input min-h-32 resize-y py-3 text-sm font-semibold leading-6"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
              >
                Guardar
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
