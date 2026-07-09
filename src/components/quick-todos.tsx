"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  createQuickTodoAction,
  deleteQuickTodoAction,
  saveQuickNoteAction,
  toggleQuickTodoAction,
  updateQuickTodoAction,
} from "@/lib/actions";
import type { OperationalProfile } from "@/lib/operational-profiles";
import type { QuickNote, QuickTodo, QuickTodoItemType, QuickTodoView } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

function ModalShell({
  title,
  children,
  onClose,
  disabled = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[20px] border border-[var(--bb-border)] bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[var(--bb-charcoal)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Fechar"
            title="Fechar"
            className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 transition hover:bg-[var(--bb-primary-soft)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function getDayMoment(hour: number) {
  if (hour >= 5 && hour < 12) {
    return { greeting: "Bom dia", emoji: "☀️", tone: "bg-[var(--bb-yellow-soft)]" };
  }

  if (hour >= 12 && hour < 20) {
    return { greeting: "Boa tarde", emoji: "🌤️", tone: "bg-[var(--bb-primary-soft)]" };
  }

  return { greeting: "Boa noite", emoji: "🌙", tone: "bg-[var(--bb-secondary-soft)]" };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TodayPanel({ profile }: { profile: OperationalProfile }) {
  const now = new Date();
  const weekday = capitalize(new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(now));
  const date = new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const dayMoment = getDayMoment(now.getHours());

  return (
    <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(83,183,223,0.14)_52%,rgba(236,254,84,0.18))] p-4">
      <div className="flex h-full min-h-28 items-start justify-between gap-4">
        <div className="min-w-0 self-center">
          <p className="text-xl font-extrabold text-[var(--bb-charcoal)] md:text-2xl">
            {dayMoment.greeting}, {profile.name} {dayMoment.emoji}
          </p>
          <p className="mt-3 text-sm font-extrabold text-[var(--bb-charcoal)]">{weekday}</p>
          <p className="text-sm font-semibold leading-6 text-[var(--bb-muted)]">{date}</p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full border border-white/72 text-lg shadow-[0_12px_26px_rgba(0,0,0,0.08)] ${dayMoment.tone}`}
          aria-hidden="true"
        >
          {dayMoment.emoji}
        </span>
      </div>
    </Panel>
  );
}

function sortQuickTodos(items: QuickTodo[]) {
  return [...items].sort((first, second) => {
    if (first.done !== second.done) return Number(first.done) - Number(second.done);
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

function quickTodoFormData({
  view,
  profileKey,
  text,
  itemType,
  done,
}: {
  view: QuickTodoView;
  profileKey: OperationalProfile["key"];
  text?: string;
  itemType?: QuickTodoItemType;
  done?: boolean;
}) {
  const formData = new FormData();
  formData.set("view", view);
  formData.set("profile_key", profileKey);

  if (typeof text === "string") formData.set("text", text);
  if (itemType) formData.set("item_type", itemType);
  if (done) formData.set("done", "on");

  return formData;
}

function makePendingTodo({
  view,
  profileKey,
  text,
}: {
  view: QuickTodoView;
  profileKey: OperationalProfile["key"];
  text: string;
}): QuickTodo {
  const now = new Date().toISOString();

  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    view,
    profile_key: profileKey,
    text,
    item_type: "todo",
    done: false,
    created_at: now,
    updated_at: now,
  };
}

function actionErrorMessage(result: { ok: boolean; message?: string }, fallback: string) {
  if (result.message?.includes("constraint")) return fallback;
  return result.ok ? fallback : result.message ?? fallback;
}

export function QuickTodosPanel({
  view,
  profile,
  todos,
  notes,
}: {
  view: QuickTodoView;
  profile: OperationalProfile;
  todos: QuickTodo[];
  notes: QuickNote[];
}) {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <TodayPanel profile={profile} />
      <QuickTodosList key={`${view}-${profile.key}`} view={view} profile={profile} todos={todos} notes={notes} />
    </div>
  );
}

function QuickTodosList({
  view,
  profile,
  todos,
  notes,
}: {
  view: QuickTodoView;
  profile: OperationalProfile;
  todos: QuickTodo[];
  notes: QuickNote[];
}) {
  const initialNote = notes[0] ?? null;
  const [localTodos, setLocalTodos] = useState(() => sortQuickTodos(todos.filter((todo) => todo.item_type === "todo")));
  const [editingReminder, setEditingReminder] = useState<QuickTodo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id ?? null);
  const [noteText, setNoteText] = useState(initialNote?.text ?? "");
  const [savedNoteText, setSavedNoteText] = useState(initialNote?.text ?? "");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleTodos = useMemo(() => sortQuickTodos(localTodos), [localTodos]);
  const noteIsSaved = noteText === savedNoteText;
  const noteSaveLabel = isSavingNote ? "A guardar notas" : noteIsSaved ? "Notas guardadas" : "Guardar notas";

  function setItemPending(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, isPending: boolean) {
    setter((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") ?? "").trim();

    if (!text) return;

    const pendingTodo = makePendingTodo({
      view,
      profileKey: profile.key,
      text,
    });

    setFeedback(null);
    setIsCreating(true);
    setLocalTodos((current) => sortQuickTodos([pendingTodo, ...current]));
    form.reset();

    const result = await createQuickTodoAction(
      quickTodoFormData({
        view,
        profileKey: profile.key,
        text,
        itemType: "todo",
      }),
    );

    setIsCreating(false);

    if (!result.ok || !result.todo) {
      setLocalTodos((current) => current.filter((todo) => todo.id !== pendingTodo.id));
      setFeedback(actionErrorMessage(result, "Não foi possível guardar. Tenta novamente."));
      return;
    }

    setLocalTodos((current) =>
      sortQuickTodos(current.map((todo) => (todo.id === pendingTodo.id ? result.todo : todo))),
    );
  }

  async function handleToggle(todo: QuickTodo) {
    if (todo.id.startsWith("temp-") || togglingIds.has(todo.id) || deletingIds.has(todo.id)) return;

    const nextDone = !todo.done;
    const previousTodo = todo;

    setFeedback(null);
    setItemPending(setTogglingIds, todo.id, true);
    setLocalTodos((current) =>
      sortQuickTodos(current.map((item) => (item.id === todo.id ? { ...item, done: nextDone } : item))),
    );

    const result = await toggleQuickTodoAction(
      todo.id,
      quickTodoFormData({
        view,
        profileKey: profile.key,
        done: nextDone,
      }),
    );

    setItemPending(setTogglingIds, todo.id, false);

    if (!result.ok || !result.todo) {
      setLocalTodos((current) =>
        sortQuickTodos(current.map((item) => (item.id === previousTodo.id ? previousTodo : item))),
      );
      setFeedback(actionErrorMessage(result, "Não foi possível atualizar. Tenta novamente."));
      return;
    }

    setLocalTodos((current) =>
      sortQuickTodos(current.map((item) => (item.id === todo.id ? result.todo : item))),
    );
  }

  async function handleDelete(todo: QuickTodo) {
    if (todo.id.startsWith("temp-") || deletingIds.has(todo.id)) return;

    const deletedTodo = todo;

    setFeedback(null);
    setItemPending(setDeletingIds, todo.id, true);
    setLocalTodos((current) => current.filter((item) => item.id !== todo.id));

    const result = await deleteQuickTodoAction(
      todo.id,
      quickTodoFormData({
        view,
        profileKey: profile.key,
      }),
    );

    setItemPending(setDeletingIds, todo.id, false);

    if (!result.ok) {
      setLocalTodos((current) =>
        current.some((item) => item.id === deletedTodo.id)
          ? current
          : sortQuickTodos([deletedTodo, ...current]),
      );
      setFeedback(actionErrorMessage(result, "Não foi possível apagar. Tenta novamente."));
    }
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingReminder || isSavingEdit) return;

    const formData = new FormData(event.currentTarget);
    const text = String(formData.get("text") ?? "").trim();
    const originalTodo = editingReminder;

    if (!text) return;

    setFeedback(null);
    setIsSavingEdit(true);
    setLocalTodos((current) =>
      sortQuickTodos(current.map((todo) => (todo.id === originalTodo.id ? { ...todo, text } : todo))),
    );

    const result = await updateQuickTodoAction(
      originalTodo.id,
      quickTodoFormData({
        view,
        profileKey: profile.key,
        text,
      }),
    );

    setIsSavingEdit(false);

    if (!result.ok || !result.todo) {
      setLocalTodos((current) =>
        sortQuickTodos(current.map((todo) => (todo.id === originalTodo.id ? originalTodo : todo))),
      );
      setFeedback(actionErrorMessage(result, "Não foi possível guardar. Tenta novamente."));
      return;
    }

    setLocalTodos((current) =>
      sortQuickTodos(current.map((todo) => (todo.id === originalTodo.id ? result.todo : todo))),
    );
    setEditingReminder(null);
  }

  async function handleSaveNote() {
    if (isSavingNote || noteText === savedNoteText) return;

    const normalizedNoteText = noteText.trim();

    if (!noteId && !normalizedNoteText) {
      setFeedback(null);
      setSavedNoteText("");
      return;
    }

    setFeedback(null);
    setIsSavingNote(true);

    const formData = quickTodoFormData({
      view,
      profileKey: profile.key,
      text: noteText,
    });

    if (noteId) formData.set("note_id", noteId);

    const result = await saveQuickNoteAction(formData);

    setIsSavingNote(false);

    if (!result.ok) {
      setFeedback(actionErrorMessage(result, "Não foi possível guardar as notas."));
      return;
    }

    if (result.note) setNoteId(result.note.id);
    if (!normalizedNoteText) setNoteId(null);
    setSavedNoteText(normalizedNoteText);
    setNoteText(normalizedNoteText);
  }

  return (
    <>
      <Panel className="p-3.5">
        {feedback ? (
          <div className="mb-2 flex justify-end">
            <p className="rounded-full bg-[var(--bb-red-soft)] px-3 py-1 text-xs font-extrabold text-[#8f2415]" role="status">
              {feedback}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <form onSubmit={handleCreate} className="mb-2.5 flex gap-2">
              <input
                name="text"
                required
                disabled={isCreating}
                placeholder="Novo to-do"
                className="bb-input h-10 min-w-0 flex-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={isCreating}
                aria-label={isCreating ? "A adicionar" : "Adicionar to-do"}
                title={isCreating ? "A adicionar" : "Adicionar to-do"}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--bb-black)] text-white shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-wait disabled:opacity-65"
              >
                {isCreating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              </button>
            </form>

            {visibleTodos.length ? (
              <div className="grid gap-1">
                {visibleTodos.map((todo) => {
                  const isTemporary = todo.id.startsWith("temp-");
                  const isDeleting = deletingIds.has(todo.id);
                  const isToggling = togglingIds.has(todo.id);

                  return (
                    <div
                      key={todo.id}
                      className={`flex min-h-9 items-center gap-2 rounded-[12px] border border-[var(--bb-border)] bg-white/58 px-2.5 py-1 transition ${
                        todo.done ? "opacity-68" : ""
                      } ${isTemporary || isDeleting ? "opacity-60" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(todo)}
                        disabled={isTemporary || isToggling || isDeleting}
                        role="checkbox"
                        aria-checked={todo.done}
                        aria-label={todo.done ? "Marcar por fazer" : "Marcar como feito"}
                        title={todo.done ? "Marcar por fazer" : "Marcar como feito"}
                        className={`grid size-7 shrink-0 place-items-center rounded-lg border transition focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-wait disabled:opacity-65 ${
                          todo.done
                            ? "border-[rgba(83,183,223,0.42)] bg-[var(--bb-primary)] text-[var(--bb-black)]"
                            : "border-[var(--bb-border)] bg-white/70 text-transparent hover:border-[rgba(83,183,223,0.42)] hover:text-[var(--bb-muted)]"
                        }`}
                      >
                        {isToggling ? <Loader2 className="size-3.5 animate-spin text-[var(--bb-muted)]" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReminder(todo)}
                        disabled={isTemporary || isDeleting}
                        className={`min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--bb-charcoal)] transition hover:text-[var(--bb-black)] disabled:cursor-wait ${
                          todo.done ? "line-through decoration-2" : ""
                        }`}
                      >
                        {todo.text}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReminder(todo)}
                        disabled={isTemporary || isDeleting}
                        aria-label="Editar to-do"
                        title="Editar to-do"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-wait disabled:opacity-55"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(todo)}
                        disabled={isTemporary || isDeleting}
                        aria-label="Apagar to-do"
                        title="Apagar to-do"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/60 text-[#a73522] transition hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-wait disabled:opacity-55"
                      >
                        {isDeleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Sem to-dos." />
            )}
          </section>

          <section className="relative flex min-w-0 flex-col">
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isSavingNote || noteIsSaved}
              aria-label={noteSaveLabel}
              title={noteSaveLabel}
              className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/82 text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSavingNote ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
            </button>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              onBlur={handleSaveNote}
              placeholder="Escreve aqui livremente..."
              className="bb-input min-h-40 flex-1 resize-none py-3 pl-3 pr-12 text-sm font-semibold leading-6"
            />
          </section>
        </div>
      </Panel>

      {editingReminder ? (
        <ModalShell
          title="To-do"
          onClose={() => setEditingReminder(null)}
          disabled={isSavingEdit}
        >
          <form onSubmit={handleUpdate} className="grid gap-3">
            <textarea
              name="text"
              required
              defaultValue={editingReminder.text}
              disabled={isSavingEdit}
              className="bb-input min-h-32 resize-y py-3 text-sm font-semibold leading-6 disabled:cursor-wait disabled:opacity-70"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] disabled:cursor-wait disabled:opacity-65"
              >
                {isSavingEdit ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isSavingEdit ? "A guardar" : "Guardar"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
