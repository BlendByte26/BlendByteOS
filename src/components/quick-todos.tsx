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
import type { QuickNote, QuickTodo } from "@/lib/types";
import { Panel } from "@/components/ui";

const CANONICAL_PERSONAL_VIEW = "marketing" as const;

function formData(profile: OperationalProfile, values: { text?: string; done?: boolean } = {}) {
  const data = new FormData();
  data.set("view", CANONICAL_PERSONAL_VIEW);
  data.set("profile_key", profile.key);
  data.set("item_type", "todo");
  if (typeof values.text === "string") data.set("text", values.text);
  if (values.done) data.set("done", "on");
  return data;
}

function sortTodos(items: QuickTodo[]) {
  return [...items].sort((first, second) => {
    if (first.done !== second.done) return Number(first.done) - Number(second.done);
    return second.created_at.localeCompare(first.created_at);
  });
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-[var(--bb-border)] bg-[var(--bb-bg)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold">{title}</h3>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white" aria-label="Fechar">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuickNotePanel({ profile, notes }: { profile: OperationalProfile; notes: QuickNote[] }) {
  const initialNote = notes[0] ?? null;
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id ?? null);
  const [text, setText] = useState(initialNote?.text ?? "");
  const [savedText, setSavedText] = useState(initialNote?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    if (saving || text === savedText) return;
    const normalized = text.trim();
    if (!noteId && !normalized) {
      setSavedText("");
      return;
    }
    setSaving(true);
    setFeedback(null);
    const data = formData(profile, { text });
    if (noteId) data.set("note_id", noteId);
    const result = await saveQuickNoteAction(data);
    setSaving(false);
    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível guardar a nota.");
      return;
    }
    setNoteId(normalized ? result.note?.id ?? noteId : null);
    setText(normalized);
    setSavedText(normalized);
  }

  return (
    <Panel className="p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold">Nota rápida</h2>
          <p className="text-[11px] font-bold text-[var(--bb-muted)]">Privada para {profile.name}</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || text === savedText}
          className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/75 transition hover:bg-[var(--bb-primary-soft)] disabled:opacity-45"
          aria-label="Guardar nota"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
        placeholder="Escreve aqui livremente..."
        style={{ minHeight: "10rem" }}
        className="bb-input w-full resize-none py-2.5 text-sm font-semibold leading-5"
      />
      {feedback ? <p className="mt-1.5 text-xs font-bold text-[#a73522]" role="status">{feedback}</p> : null}
    </Panel>
  );
}

function TodoRow({
  todo,
  busy,
  onToggle,
  onEdit,
  onDelete,
  full = false,
}: {
  todo: QuickTodo;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  full?: boolean;
}) {
  return (
    <div className={`flex min-h-9 w-full max-w-full items-center gap-2 overflow-hidden rounded-[12px] border border-[var(--bb-border)] bg-white/65 px-2 py-1 ${todo.done ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? "Reabrir to-do" : "Concluir to-do"}
        className={`grid size-7 shrink-0 place-items-center rounded-lg border ${todo.done ? "border-[var(--bb-primary)] bg-[var(--bb-primary)]" : "border-[var(--bb-border)] bg-white"}`}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className={`size-4 ${todo.done ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />}
      </button>
      <button type="button" onClick={onEdit} disabled={busy} className={`block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-bold ${todo.done ? "line-through" : ""}`}>
        <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{todo.text}</span>
      </button>
      {full ? (
        <>
          <button type="button" onClick={onEdit} disabled={busy} className="grid size-7 place-items-center rounded-full hover:bg-[var(--bb-primary-soft)]" aria-label="Editar to-do">
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className="grid size-7 place-items-center rounded-full text-[#a73522] hover:bg-[var(--bb-red-soft)]" aria-label="Apagar to-do">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}

function QuickTodosList({ profile, todos }: { profile: OperationalProfile; todos: QuickTodo[] }) {
  const [items, setItems] = useState(() => sortTodos(todos.filter((todo) => todo.item_type === "todo")));
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<QuickTodo | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const pending = useMemo(() => items.filter((todo) => !todo.done), [items]);
  const dashboardItems = pending.slice(0, 5);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") ?? "").trim();
    if (!text) return;
    setCreating(true);
    setFeedback(null);
    const result = await createQuickTodoAction(formData(profile, { text }));
    setCreating(false);
    if (!result.ok || !result.todo) {
      setFeedback(result.message ?? "Não foi possível adicionar o to-do.");
      return;
    }
    setItems((current) => sortTodos([result.todo!, ...current]));
    form.reset();
  }

  async function toggle(todo: QuickTodo) {
    if (busyIds.has(todo.id)) return;
    setBusy(todo.id, true);
    const nextDone = !todo.done;
    setItems((current) => sortTodos(current.map((item) => item.id === todo.id ? { ...item, done: nextDone } : item)));
    const result = await toggleQuickTodoAction(todo.id, formData(profile, { done: nextDone }));
    setBusy(todo.id, false);
    if (!result.ok || !result.todo) {
      setItems((current) => sortTodos(current.map((item) => item.id === todo.id ? todo : item)));
      setFeedback(result.message ?? "Não foi possível atualizar o to-do.");
      return;
    }
    setItems((current) => sortTodos(current.map((item) => item.id === todo.id ? result.todo! : item)));
  }

  async function remove(todo: QuickTodo) {
    if (!window.confirm(`Apagar definitivamente este to-do?\n\n“${todo.text}”`)) return;
    setBusy(todo.id, true);
    const result = await deleteQuickTodoAction(todo.id, formData(profile));
    setBusy(todo.id, false);
    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível apagar o to-do.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== todo.id));
  }

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const text = String(new FormData(event.currentTarget).get("text") ?? "").trim();
    if (!text) return;
    const original = editing;
    setBusy(original.id, true);
    const result = await updateQuickTodoAction(original.id, formData(profile, { text }));
    setBusy(original.id, false);
    if (!result.ok || !result.todo) {
      setFeedback(result.message ?? "Não foi possível editar o to-do.");
      return;
    }
    setItems((current) => sortTodos(current.map((item) => item.id === original.id ? result.todo! : item)));
    setEditing(null);
  }

  return (
    <>
      <Panel className="overflow-hidden p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold">To-dos</h2>
            <p className="text-[11px] font-bold text-[var(--bb-muted)]">{pending.length} pendente{pending.length === 1 ? "" : "s"}</p>
          </div>
          {items.length > 5 || items.some((todo) => todo.done) ? (
            <button type="button" onClick={() => setShowAll(true)} className="min-h-8 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold hover:bg-[var(--bb-primary-soft)]">
              Ver todos
            </button>
          ) : null}
        </div>
        <form onSubmit={create} className="mb-2 flex gap-1.5">
          <input name="text" required placeholder="Novo to-do" className="bb-input min-w-0 flex-1 text-sm font-semibold" />
          <button type="submit" disabled={creating} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--bb-black)] text-white hover:bg-[var(--bb-primary)] hover:text-black" aria-label="Adicionar to-do">
            {creating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          </button>
        </form>
        {dashboardItems.length ? (
          <div className="grid min-w-0 gap-1 overflow-hidden">
            {dashboardItems.map((todo) => (
              <TodoRow key={todo.id} todo={todo} busy={busyIds.has(todo.id)} onToggle={() => toggle(todo)} onEdit={() => setEditing(todo)} onDelete={() => remove(todo)} />
            ))}
          </div>
        ) : <p className="py-2 text-sm font-bold text-[var(--bb-muted)]">Sem to-dos pendentes.</p>}
        {feedback ? <p className="mt-2 text-xs font-bold text-[#a73522]" role="status">{feedback}</p> : null}
      </Panel>

      {showAll ? (
        <Modal title="Todos os to-dos" onClose={() => setShowAll(false)}>
          <form onSubmit={create} className="mb-3 flex gap-2">
            <input name="text" required placeholder="Novo to-do" className="bb-input min-w-0 flex-1 text-sm font-semibold" />
            <button type="submit" disabled={creating} className="rounded-full bg-black px-4 text-sm font-extrabold text-white">Adicionar</button>
          </form>
          {items.length ? (
            <div className="grid gap-1.5">
              {items.map((todo) => (
                <TodoRow key={todo.id} todo={todo} busy={busyIds.has(todo.id)} onToggle={() => toggle(todo)} onEdit={() => setEditing(todo)} onDelete={() => remove(todo)} full />
              ))}
            </div>
          ) : <p className="py-4 text-sm font-bold text-[var(--bb-muted)]">Sem to-dos.</p>}
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Editar to-do" onClose={() => setEditing(null)}>
          <form onSubmit={update} className="grid gap-3">
            <textarea name="text" required defaultValue={editing.text} className="bb-input min-h-28 resize-y py-3 text-sm font-semibold" />
            <button type="submit" disabled={busyIds.has(editing.id)} className="ml-auto min-h-10 rounded-full bg-black px-4 text-sm font-extrabold text-white">
              Guardar
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function QuickTodosPanel({
  profile,
  todos,
  notes,
}: {
  profile: OperationalProfile;
  todos: QuickTodo[];
  notes: QuickNote[];
}) {
  return (
    <aside className="grid content-start gap-3">
      <QuickNotePanel profile={profile} notes={notes} />
      <QuickTodosList profile={profile} todos={todos} />
    </aside>
  );
}
