"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createQuickTodoAction,
  deleteQuickTodoAction,
  toggleQuickTodoAction,
  updateQuickTodoAction,
} from "@/lib/actions";
import type { OperationalProfile } from "@/lib/operational-profiles";
import type { QuickTodo, QuickTodoView } from "@/lib/types";
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

  return (
    <>
      <Panel className="mt-3 p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-[var(--bb-charcoal)]">Lembretes rápidos</h2>
        </div>

        <form action={createQuickTodoAction} className="mb-2 flex max-w-[420px] gap-2">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="profile_key" value={profile.key} />
          <input
            name="text"
            required
            placeholder="Novo lembrete"
            className="bb-input h-10 min-w-0 flex-1 text-sm font-semibold"
          />
          <button
            type="submit"
            aria-label="Adicionar lembrete"
            title="Adicionar lembrete"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--bb-black)] text-white shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </form>

        {todos.length ? (
          <div className="grid gap-1">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex min-h-9 max-w-3xl items-center gap-2 rounded-[12px] border border-[var(--bb-border)] bg-white/58 px-2.5 py-1 ${
                  todo.done ? "opacity-68" : ""
                }`}
              >
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
                <button
                  type="button"
                  onClick={() => setEditingReminder(todo)}
                  className={`min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--bb-charcoal)] transition hover:text-[var(--bb-black)] ${
                    todo.done ? "line-through decoration-2" : ""
                  }`}
                >
                  {todo.text}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReminder(todo)}
                  aria-label="Editar lembrete"
                  title="Editar lembrete"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <form action={deleteQuickTodoAction.bind(null, todo.id)}>
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="profile_key" value={profile.key} />
                  <button
                    type="submit"
                    aria-label="Apagar lembrete"
                    title="Apagar lembrete"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[#a73522] transition hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem lembretes." />
        )}
      </Panel>

      {editingReminder ? (
        <ModalShell title="Lembrete" onClose={() => setEditingReminder(null)}>
          <form action={updateQuickTodoAction.bind(null, editingReminder.id)} className="grid gap-3">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="profile_key" value={profile.key} />
            <textarea
              name="text"
              required
              defaultValue={editingReminder.text}
              className="bb-input min-h-32 resize-y text-sm font-semibold leading-6"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
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
