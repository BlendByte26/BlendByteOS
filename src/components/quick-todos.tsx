"use client";

import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import {
  createQuickTodoAction,
  deleteQuickTodoAction,
  toggleQuickTodoAction,
} from "@/lib/actions";
import type { QuickTodo, QuickTodoView } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

export function QuickTodosPanel({
  view,
  todos,
}: {
  view: QuickTodoView;
  todos: QuickTodo[];
}) {
  const [expandedText, setExpandedText] = useState<string | null>(null);

  return (
    <>
      <Panel className="mt-3 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[var(--bb-charcoal)]">To-do rápido</h2>
          <span className="rounded-full bg-white/65 px-2.5 py-1 text-xs font-extrabold text-[var(--bb-muted)] ring-1 ring-inset ring-[var(--bb-border)]">
            {view === "design" ? "Design" : "Marketing / Gestão"}
          </span>
        </div>
        <form action={createQuickTodoAction} className="mb-2 flex max-w-xl gap-2">
          <input type="hidden" name="view" value={view} />
          <input
            name="text"
            required
            placeholder="Nova tarefa rápida"
            className="bb-input min-w-0 flex-1 text-sm font-semibold"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
          >
            Adicionar
          </button>
        </form>
        {todos.length ? (
          <div className="grid gap-1">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex min-h-10 items-center gap-2 rounded-[12px] border border-[var(--bb-border)] bg-white/55 px-2.5 py-1.5 ${
                  todo.done ? "opacity-68" : ""
                }`}
              >
                <form action={toggleQuickTodoAction.bind(null, todo.id)}>
                  <input type="hidden" name="view" value={view} />
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
                  onClick={() => setExpandedText(todo.text)}
                  className={`min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--bb-charcoal)] transition hover:text-[var(--bb-black)] ${
                    todo.done ? "line-through decoration-2" : ""
                  }`}
                >
                  {todo.text}
                </button>
                <form action={deleteQuickTodoAction.bind(null, todo.id)}>
                  <input type="hidden" name="view" value={view} />
                  <button
                    type="submit"
                    aria-label="Apagar to-do"
                    title="Apagar to-do"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[#a73522] transition hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem to-dos rápidos nesta vista." />
        )}
      </Panel>

      {expandedText ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[20px] border border-[var(--bb-border)] bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">To-do rápido</h3>
              <button
                type="button"
                onClick={() => setExpandedText(null)}
                aria-label="Fechar"
                title="Fechar"
                className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 transition hover:bg-[var(--bb-primary-soft)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[var(--bb-charcoal)]">
              {expandedText}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
