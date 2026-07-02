"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil, Trash2, X } from "lucide-react";
import { TaskForm } from "@/components/forms";
import { Badge, EmptyState, Panel, TableWrap } from "@/components/ui";
import { getClientLabel } from "@/lib/client-display";
import { taskPriorityLabels, taskStatusLabels, taskTypeLabels } from "@/lib/labels";
import { getTaskDisplayTitle } from "@/lib/task-display";
import type { Client, Task } from "@/lib/types";

type UpdateTaskAction = (id: string, formData: FormData) => void | Promise<void>;
type DeleteTaskAction = (id: string) => void | Promise<void>;

type TasksTableProps = {
  tasks: Task[];
  clients: Client[];
  canPersist: boolean;
  updateTaskAction: UpdateTaskAction;
  deleteTaskAction: DeleteTaskAction;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function ActionButton({
  label,
  tone = "neutral",
  onClick,
  children,
}: {
  label: string;
  tone?: "neutral" | "danger";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-grid size-9 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/55 shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
        tone === "danger"
          ? "text-[#a73522] hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)]"
          : "text-[var(--bb-charcoal)] hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

export function TasksTable({
  tasks,
  clients,
  canPersist,
  updateTaskAction,
  deleteTaskAction,
}: TasksTableProps) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [editing]);

  async function saveTask(formData: FormData) {
    if (!editing) return;
    if (!canPersist) {
      setSaveMessage("Modo demo: configure o Supabase para gravar alterações.");
      return;
    }

    setSaveMessage("A guardar...");
    try {
      await updateTaskAction(editing.id, formData);
      setSaveMessage("Guardado.");
      setLocalTasks((current) =>
        current.map((task) =>
          task.id === editing.id
            ? {
                ...task,
                client_id: String(formData.get("client_id") ?? "") || null,
                title: String(formData.get("title") ?? task.title),
                type: String(formData.get("type") ?? task.type) as Task["type"],
                status: String(formData.get("status") ?? task.status) as Task["status"],
                priority: String(formData.get("priority") ?? task.priority) as Task["priority"],
                assignee_name: String(formData.get("assignee_name") ?? "") || null,
                due_date: String(formData.get("due_date") ?? "") || null,
                related_url: String(formData.get("related_url") ?? "") || null,
                is_blocked: formData.get("is_blocked") === "on",
                blocker_reason: String(formData.get("blocker_reason") ?? "") || null,
                notes: String(formData.get("notes") ?? "") || null,
              }
            : task,
        ),
      );
      setEditing(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao guardar tarefa", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar.");
    }
  }

  async function deleteTask(id: string) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para apagar tarefas.");
      return;
    }

    setTableError(null);
    try {
      await deleteTaskAction(id);
      setLocalTasks((current) => current.filter((task) => task.id !== id));
      router.refresh();
    } catch (error) {
      console.error("Erro ao apagar tarefa", error);
      setTableError(error instanceof Error ? error.message : "Não foi possível apagar a tarefa.");
    }
  }

  return (
    <>
      <Panel>
        {tableError ? (
          <div className="border-b border-[var(--bb-border)] bg-[var(--bb-red-soft)] px-5 py-3 text-sm font-bold text-[#8f2415]">
            {tableError}
          </div>
        ) : null}
        {localTasks.length ? (
          <TableWrap>
            <table className="w-full min-w-[980px] table-auto text-left text-sm">
              <thead className="bg-[rgba(255,255,255,0.46)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Tarefa</th>
                  <th className="px-5 py-4 font-extrabold">Cliente</th>
                  <th className="px-5 py-4 font-extrabold">Tipo</th>
                  <th className="px-5 py-4 font-extrabold">Estado</th>
                  <th className="px-5 py-4 font-extrabold">Prioridade</th>
                  <th className="px-5 py-4 font-extrabold">Owner</th>
                  <th className="px-5 py-4 font-extrabold">Prazo</th>
                  <th className="px-5 py-4 font-extrabold">Links</th>
                  <th className="sticky right-0 w-24 bg-white/80 px-5 py-4 pr-6 font-extrabold backdrop-blur">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {localTasks.map((task) => (
                  <tr key={task.id} className={task.is_blocked ? "bg-[var(--bb-red-soft)]" : ""}>
                    <td className="max-w-80 break-words px-5 py-4 font-bold text-[var(--bb-charcoal)]">
                      <span className="bb-line-clamp-2">{getTaskDisplayTitle(task)}</span>
                      {task.is_blocked ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8f2415]">
                          <span className="whitespace-nowrap rounded-full bg-[var(--bb-red-soft)] px-2 py-1 ring-1 ring-[rgba(232,76,49,0.24)]">
                            Bloqueado
                          </span>
                          <span className="min-w-0 break-words">{task.blocker_reason ?? "Motivo por adicionar"}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-52 px-5 py-4 font-medium text-[var(--bb-muted)]">
                      <span className="block truncate">{task.clients ? getClientLabel(task.clients) : "-"}</span>
                    </td>
                    <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{taskTypeLabels[task.type]}</td>
                    <td className="px-5 py-4">
                      <Badge value={task.status} label={taskStatusLabels[task.status]} />
                    </td>
                    <td className="px-5 py-4">
                      <Badge value={task.priority} label={taskPriorityLabels[task.priority]} />
                    </td>
                    <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">{task.assignee_name ?? "-"}</td>
                    <td className="px-5 py-4 font-medium text-[var(--bb-muted)]">
                      <span className="whitespace-nowrap">{formatDate(task.due_date)}</span>
                    </td>
                    <td className="px-5 py-4">
                      {task.related_url ? (
                        <a
                          href={task.related_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/60 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition hover:border-[rgba(83,183,223,0.44)] hover:bg-[var(--bb-primary-soft)]"
                        >
                          Link
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-[var(--bb-muted)]">—</span>
                      )}
                    </td>
                    <td className="sticky right-0 w-24 bg-[rgba(255,255,255,0.82)] px-5 py-4 pr-6 backdrop-blur">
                      <div className="flex items-center gap-2">
                        <ActionButton label="Editar" onClick={() => {
                          setSaveMessage(null);
                          setEditing(task);
                        }}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </ActionButton>
                        <form action={() => deleteTask(task.id)}>
                          <ActionButton label="Apagar" tone="danger">
                            <Trash2 className="size-4" aria-hidden="true" />
                          </ActionButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="Não encontrámos resultados com estes filtros." />
        )}
      </Panel>

      {editing && typeof document !== "undefined" ? createPortal(
        <div
          data-portal="modal"
          className="fixed inset-0 bg-[rgba(12,16,18,0.32)] p-3 font-sans backdrop-blur-sm md:p-6"
          style={{ zIndex: 99990 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Editar tarefa"
            className="mx-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:max-h-[calc(100vh-3rem)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--bb-border)] bg-white/60 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                  <ClipboardList className="size-4" aria-hidden="true" />
                  Editar tarefa
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--bb-charcoal)]">{getTaskDisplayTitle(editing)}</h2>
                <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">
                  {editing.clients ? getClientLabel(editing.clients) : "Sem cliente"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                title="Fechar"
                className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              {saveMessage ? (
                <div className="mb-4 rounded-[16px] border border-[var(--bb-border)] bg-white/55 px-4 py-3 text-sm font-bold text-[var(--bb-muted)]">
                  {saveMessage}
                </div>
              ) : null}
              <TaskForm
                action={saveTask}
                clients={clients}
                task={editing}
                submitLabel="Guardar alterações"
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
