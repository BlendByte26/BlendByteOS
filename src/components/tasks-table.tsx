"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Archive, ClipboardList, Mail, Pencil, Send, Trash2, Video, X } from "lucide-react";
import { ClientBadge } from "@/components/client-badge";
import { TaskForm } from "@/components/forms";
import { LinksIndicator } from "@/components/links";
import { SelectField } from "@/components/select-field";
import { Badge, EmptyState, Panel, TableWrap } from "@/components/ui";
import { getClientLabel } from "@/lib/client-display";
import { getClientVisualToken } from "@/lib/client-visuals";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/labels";
import { parseLinksFormData } from "@/lib/links";
import {
  isInvest2030NewsletterTask,
  isInvest2030SocialContentTask,
  isInvest2030WebinarTask,
} from "@/lib/invest2030-newsletter";
import { taskStatusTones } from "@/lib/status-styles";
import {
  designProfiles,
  isDesignAssigneeName,
  type DesignProfileKey,
} from "@/lib/operational-profiles";
import { getTaskDisplayTitle } from "@/lib/task-display";
import { taskStatuses, type Client, type Task, type TaskStatus, type TeamMember } from "@/lib/types";

type UpdateTaskAction = (id: string, formData: FormData) => void | Promise<void>;
type UpdateTaskStatusAction = (id: string, formData: FormData) => void | Promise<void>;
type SendToDesignAction = (id: string, designerProfileKey?: string) => Promise<Task>;
type ArchiveTaskAction = (id: string) => void | Promise<void>;
type DeleteTaskAction = (id: string) => void | Promise<void>;
type TasksView = "all" | "today" | "week" | "archived";

type TasksTableProps = {
  tasks: Task[];
  clients: Client[];
  teamMembers: TeamMember[];
  view: TasksView;
  emptyTitle: string;
  canPersist: boolean;
  canDelete: boolean;
  updateTaskAction: UpdateTaskAction;
  updateStatusAction: UpdateTaskStatusAction;
  sendToDesignAction: SendToDesignAction;
  archiveTaskAction: ArchiveTaskAction;
  deleteTaskAction: DeleteTaskAction;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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

function TaskModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-portal="modal"
      className="fixed inset-0 bg-[rgba(12,16,18,0.32)] p-3 font-sans backdrop-blur-sm md:p-6"
      style={{ zIndex: 99990 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mx-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--bb-border)] bg-white/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[var(--bb-muted)]">
              <ClipboardList className="size-4" aria-hidden="true" />
              Tarefa
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
            {subtitle ? (
              <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="grid size-10 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function taskBelongsInView(task: Task, view: TasksView) {
  if (view === "archived") return task.status === "archived";
  return task.status !== "archived";
}

function isAssignedToDesign(assigneeName: string | null) {
  return isDesignAssigneeName(assigneeName);
}

function canSendToDesign(task: Task) {
  return task.status !== "archived" && !isAssignedToDesign(task.assignee_name);
}

function TaskStatusControl({
  task,
  view,
  canPersist,
  updateStatusAction,
  onStatusSaved,
}: {
  task: Task;
  view: TasksView;
  canPersist: boolean;
  updateStatusAction: UpdateTaskStatusAction;
  onStatusSaved: (taskId: string, status: TaskStatus, visible: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(task.status);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus: string) {
    if (nextStatus === status) return;

    if (!canPersist) {
      setMessage("Modo demo.");
      return;
    }

    const previousStatus = status;
    const nextTask = { ...task, status: nextStatus as TaskStatus };
    const formData = new FormData();
    formData.set("status", nextStatus);
    setStatus(nextStatus as TaskStatus);
    setMessage("A atualizar...");

    startTransition(() => {
      void Promise.resolve(updateStatusAction(task.id, formData))
        .then(() => {
          setMessage(null);
          onStatusSaved(task.id, nextStatus as TaskStatus, taskBelongsInView(nextTask, view));
          router.refresh();
        })
        .catch((error: unknown) => {
          console.error("Erro ao atualizar estado da tarefa", error);
          setStatus(previousStatus);
          setMessage(error instanceof Error ? error.message : "Não foi possível atualizar.");
        });
    });
  }

  return (
    <div className="grid w-40 min-w-0 gap-1">
      <SelectField
        name={`status-${task.id}`}
        value={status}
        onValueChange={updateStatus}
        compact
        ariaLabel="Atualizar estado"
        options={taskStatuses.map((option) => ({
          value: option,
          label: taskStatusLabels[option],
          tone: taskStatusTones[option],
        }))}
      />
      {message ? (
        <span className="text-[11px] font-bold text-[var(--bb-muted)]" aria-live="polite">
          {isPending ? "A atualizar..." : message}
        </span>
      ) : null}
    </div>
  );
}

export function TasksTable({
  tasks,
  clients,
  teamMembers,
  view,
  emptyTitle,
  canPersist,
  canDelete,
  updateTaskAction,
  updateStatusAction,
  sendToDesignAction,
  archiveTaskAction,
  deleteTaskAction,
}: TasksTableProps) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const [handoffTask, setHandoffTask] = useState<Task | null>(null);
  const [handoffDesignerKey, setHandoffDesignerKey] = useState<DesignProfileKey>("carlota");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const invest2030ClientId = clients.find((client) => client.client_code === "02_I2030")?.id ?? null;

  function taskFromFormData(task: Task, formData: FormData): Task {
    const clientId = String(formData.get("client_id") ?? "") || null;
    const selectedClient = clientId ? clients.find((client) => client.id === clientId) : null;

    return {
      ...task,
      client_id: clientId,
      clients: selectedClient ?? null,
      title: String(formData.get("title") ?? task.title),
      status: String(formData.get("status") ?? task.status) as Task["status"],
      priority: String(formData.get("priority") ?? task.priority) as Task["priority"],
      assignee_name: String(formData.get("assignee_name") ?? "") || null,
      due_date: String(formData.get("due_date") ?? "") || null,
      links: parseLinksFormData(formData),
      notes: String(formData.get("notes") ?? "") || null,
    };
  }

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
          task.id === editing.id ? taskFromFormData(task, formData) : task,
        ),
      );
      setEditing(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao guardar tarefa", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar.");
    }
  }

  async function prepareNewsletterFromModal(
    task: Task,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const form = event.currentTarget.form;
    if (!form) return;

    if (!canPersist) {
      setSaveMessage("Modo demo: configure o Supabase para gravar alterações antes de preparar a newsletter.");
      return;
    }

    const formData = new FormData(form);
    const taskToSave = taskFromFormData(task, formData);
    if (!isInvest2030NewsletterTask(taskToSave, { invest2030ClientId })) {
      setSaveMessage("Esta tarefa não cumpre os critérios para preparar newsletter Invest2030.");
      return;
    }

    setSaveMessage("A guardar alterações antes de abrir a newsletter...");
    try {
      await updateTaskAction(task.id, formData);
      setLocalTasks((current) =>
        current.map((item) => (item.id === task.id ? taskToSave : item)),
      );
      router.refresh();
      router.push(`/tasks/${task.id}/newsletter`);
    } catch (error) {
      console.error("Erro ao guardar tarefa antes de preparar newsletter", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar antes de abrir a newsletter.");
    }
  }

  async function prepareWebinarFromModal(
    task: Task,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const form = event.currentTarget.form;
    if (!form) return;

    if (!canPersist) {
      setSaveMessage("Modo demo: configure o Supabase para gravar alterações antes de preparar o webinar.");
      return;
    }

    const formData = new FormData(form);
    const taskToSave = taskFromFormData(task, formData);
    if (!isInvest2030WebinarTask(taskToSave, { invest2030ClientId })) {
      setSaveMessage("Esta tarefa não cumpre os critérios para preparar webinar Invest2030.");
      return;
    }

    setSaveMessage("A guardar alterações antes de abrir o webinar...");
    try {
      await updateTaskAction(task.id, formData);
      setLocalTasks((current) =>
        current.map((item) => (item.id === task.id ? taskToSave : item)),
      );
      router.refresh();
      router.push(`/tasks/${task.id}/webinar`);
    } catch (error) {
      console.error("Erro ao guardar tarefa antes de preparar webinar", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar antes de abrir o webinar.");
    }
  }

  async function createContentFromNewsletterTask(
    task: Task,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const form = event.currentTarget.form;
    if (!form) return;

    if (!canPersist) {
      setSaveMessage("Modo demo: configure o Supabase para gravar alterações antes de criar conteúdo.");
      return;
    }

    const formData = new FormData(form);
    const taskToSave = taskFromFormData(task, formData);
    if (!isInvest2030SocialContentTask(taskToSave, { invest2030ClientId })) {
      setSaveMessage("Esta tarefa não cumpre os critérios para criar conteúdo Invest2030.");
      return;
    }

    setSaveMessage("A guardar alterações antes de criar conteúdo...");
    try {
      await updateTaskAction(task.id, formData);
      setLocalTasks((current) =>
        current.map((item) => (item.id === task.id ? taskToSave : item)),
      );
      router.refresh();
      router.push(`/content/new?sourceTaskId=${encodeURIComponent(task.id)}`);
    } catch (error) {
      console.error("Erro ao guardar tarefa antes de criar conteúdo", error);
      setSaveMessage(error instanceof Error ? error.message : "Não foi possível guardar antes de criar conteúdo.");
    }
  }

  async function archiveTask(id: string) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para arquivar tarefas.");
      return;
    }

    const task = localTasks.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Arquivar a tarefa "${task ? getTaskDisplayTitle(task) : "selecionada"}"?\n\nEla passa para a vista Arquivadas.`,
    );
    if (!confirmed) return;

    setTableError(null);
    try {
      await archiveTaskAction(id);
      setLocalTasks((current) => current.filter((task) => task.id !== id));
      router.refresh();
    } catch (error) {
      console.error("Erro ao arquivar tarefa", error);
      setTableError(error instanceof Error ? error.message : "Não foi possível arquivar a tarefa.");
    }
  }

  async function deleteTask(id: string) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para apagar tarefas.");
      return;
    }

    const task = localTasks.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Apagar definitivamente a tarefa "${task ? getTaskDisplayTitle(task) : "selecionada"}"?\n\nEsta ação não pode ser anulada.`,
    );
    if (!confirmed) return;

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

  async function sendTaskToDesign(task: Task, designerProfileKey: DesignProfileKey) {
    if (!canPersist) {
      setTableError("Modo demo: configure o Supabase para enviar tarefas para Design.");
      return;
    }

    setTableError(null);
    setSaveMessage("A enviar para Design...");
    try {
      const updatedTask = await sendToDesignAction(task.id, designerProfileKey);
      setLocalTasks((current) =>
        current.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
      );
      if (editing?.id === updatedTask.id) setEditing(updatedTask);
      setHandoffTask(null);
      setSaveMessage("Enviado para Design.");
      router.refresh();
    } catch (error) {
      console.error("Erro ao enviar tarefa para Design", error);
      const message = error instanceof Error ? error.message : "Não foi possível enviar para Design.";
      setTableError(message);
      setSaveMessage(message);
    }
  }

  function applyStatusChange(taskId: string, status: TaskStatus, visible: boolean) {
    setLocalTasks((current) => {
      const updated = current.map((task) => (task.id === taskId ? { ...task, status } : task));
      return visible ? updated : updated.filter((task) => task.id !== taskId);
    });
  }

  return (
    <>
      <Panel>
        <div className="border-b border-[var(--bb-border)] bg-white/45 px-5 py-4">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--bb-charcoal)]">Tarefas</h1>
            <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">
              Lista operacional por prazo, cliente, responsável e estado.
            </p>
          </div>
        </div>

        {tableError ? (
          <div className="border-b border-[var(--bb-border)] bg-[var(--bb-red-soft)] px-5 py-3 text-sm font-bold text-[#8f2415]">
            {tableError}
          </div>
        ) : null}

        {localTasks.length ? (
          <TableWrap>
            <table className="bb-sticky-actions-table w-full min-w-[940px] table-auto text-left text-sm">
              <thead className="bg-[rgba(246,248,250,0.9)] text-xs uppercase text-[var(--bb-muted)]">
                <tr>
                  <th className="px-4 py-4 font-extrabold">Prazo</th>
                  <th className="min-w-[260px] px-4 py-4 font-extrabold">Tarefa</th>
                  <th className="px-4 py-4 font-extrabold">Cliente</th>
                  <th className="px-4 py-4 font-extrabold">Responsável</th>
                  <th className="px-4 py-4 font-extrabold">Prioridade</th>
                  <th className="px-4 py-4 font-extrabold">Estado</th>
                  <th className="bb-actions-col sticky right-0 px-2 py-4 font-extrabold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-border)]">
                {localTasks.map((task) => {
                  const clientToken = getClientVisualToken({
                    clientCode: task.clients?.client_code,
                    clientName: task.clients?.name,
                    shortName: task.clients?.short_name,
                    colorKey: task.clients?.color_key,
                  });
                  const isArchived = task.status === "archived";

                  return (
                    <tr key={task.id} className="odd:bg-white/18">
                      <td className={`border-l-4 px-4 py-4 font-medium whitespace-nowrap text-[var(--bb-muted)] ${clientToken.borderStrong}`}>
                        {formatDate(task.due_date)}
                      </td>
                      <td className="max-w-[360px] px-4 py-4 font-bold text-[var(--bb-charcoal)]">
                        <button
                          type="button"
                          onClick={() => {
                            setSaveMessage(null);
                            setEditing(task);
                          }}
                          className="text-left transition hover:text-[var(--bb-black)]"
                        >
                          <span className="bb-line-clamp-2 block">{getTaskDisplayTitle(task)}</span>
                        </button>
                        {task.notes ? (
                          <span className="mt-1 block max-w-[340px] truncate text-xs font-semibold text-[var(--bb-muted)]">
                            {task.notes}
                          </span>
                        ) : null}
                        <div className="mt-1">
                          <LinksIndicator links={task.links} />
                        </div>
                      </td>
                      <td className="max-w-56 px-4 py-4">
                        {task.clients ? (
                          <ClientBadge
                            clientId={task.clients.id}
                            clientCode={task.clients.client_code}
                            clientName={task.clients.name}
                            shortName={task.clients.short_name}
                            colorKey={task.clients.color_key}
                            variant="compact"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[var(--bb-muted)]">Interna</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--bb-muted)]">{task.assignee_name ?? "-"}</td>
                      <td className="px-4 py-4">
                        <Badge
                          value={task.priority === "urgent" ? "urgent" : "normal"}
                          label={task.priority === "urgent" ? taskPriorityLabels.urgent : taskPriorityLabels.normal}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <TaskStatusControl
                          task={task}
                          view={view}
                          canPersist={canPersist}
                          updateStatusAction={updateStatusAction}
                          onStatusSaved={applyStatusChange}
                        />
                      </td>
                      <td className="bb-actions-col sticky right-0 px-2 py-4">
                        <div className="bb-actions-row">
                          <ActionButton
                            label="Editar"
                            onClick={() => {
                              setSaveMessage(null);
                              setEditing(task);
                            }}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </ActionButton>
                          {isArchived && canDelete ? (
                            <form action={() => deleteTask(task.id)}>
                              <ActionButton label="Apagar" tone="danger">
                                <Trash2 className="size-4" aria-hidden="true" />
                              </ActionButton>
                            </form>
                          ) : !isArchived ? (
                            <form action={() => archiveTask(task.id)}>
                              <ActionButton label="Arquivar">
                                <Archive className="size-4" aria-hidden="true" />
                              </ActionButton>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title={emptyTitle} />
        )}
      </Panel>

      {editing ? (
        <TaskModal
          title={getTaskDisplayTitle(editing)}
          subtitle={editing.clients ? getClientLabel(editing.clients) : "Sem cliente"}
          onClose={() => setEditing(null)}
        >
          {(() => {
            const isInvestNewsletter = isInvest2030NewsletterTask(editing, { invest2030ClientId });
            const isInvestWebinar = isInvest2030WebinarTask(editing, { invest2030ClientId });
            const hasInvestContent = isInvest2030SocialContentTask(editing, { invest2030ClientId });

            return (
              <>
                {saveMessage ? (
                  <div className="mb-4 rounded-[16px] border border-[var(--bb-border)] bg-white/55 px-4 py-3 text-sm font-bold text-[var(--bb-muted)]">
                    {saveMessage}
                  </div>
                ) : null}
                <TaskForm
                  action={saveTask}
                  clients={clients}
                  teamMembers={teamMembers}
                  task={editing}
                  submitLabel="Guardar alterações"
                  onCancel={() => setEditing(null)}
                  footerAction={
                    isInvestNewsletter ||
                    isInvestWebinar ||
                    hasInvestContent ||
                    canSendToDesign(editing) ? (
                      <>
                        {isInvestNewsletter ? (
                          <button
                            type="button"
                            onClick={(event) => prepareNewsletterFromModal(editing, event)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                          >
                            <Mail className="size-4" aria-hidden="true" />
                            Preparar newsletter
                          </button>
                        ) : null}
                        {isInvestWebinar ? (
                          <button
                            type="button"
                            onClick={(event) => prepareWebinarFromModal(editing, event)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                          >
                            <Video className="size-4" aria-hidden="true" />
                            Preparar webinar
                          </button>
                        ) : null}
                        {hasInvestContent ? (
                          <button
                            type="button"
                            onClick={(event) => createContentFromNewsletterTask(editing, event)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                          >
                            <ClipboardList className="size-4" aria-hidden="true" />
                            Criar conteúdo
                          </button>
                        ) : null}
                        {!isInvestNewsletter && !isInvestWebinar && !hasInvestContent && canSendToDesign(editing) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setHandoffDesignerKey("carlota");
                              setHandoffTask(editing);
                            }}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-5 text-sm font-bold text-[var(--bb-charcoal)] transition hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
                          >
                            <Send className="size-4" aria-hidden="true" />
                            Enviar para Design
                          </button>
                        ) : null}
                      </>
                    ) : null
                  }
                />
              </>
            );
          })()}
        </TaskModal>
      ) : null}

      {handoffTask ? (
        <TaskModal
          title="Enviar para Design"
          subtitle={getTaskDisplayTitle(handoffTask)}
          onClose={() => setHandoffTask(null)}
        >
          <form
            action={() => sendTaskToDesign(handoffTask, handoffDesignerKey)}
            className="grid gap-4"
          >
            <label className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
              Designer responsável
              <SelectField
                name="designer_profile_key"
                value={handoffDesignerKey}
                onValueChange={(value) => setHandoffDesignerKey(value as DesignProfileKey)}
                options={designProfiles.map((profile) => ({
                  value: profile.key,
                  label: profile.name,
                }))}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setHandoffTask(null)}
                className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-white/70 px-4 text-sm font-extrabold text-[var(--bb-muted)] transition hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
              >
                <Send className="size-4" aria-hidden="true" />
                Confirmar
              </button>
            </div>
          </form>
        </TaskModal>
      ) : null}
    </>
  );
}
