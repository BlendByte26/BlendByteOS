"use client";

import { useState } from "react";
import { TaskComments } from "@/components/content-comments";
import { TaskForm } from "@/components/forms";
import type { OperationalProfile } from "@/lib/operational-profiles";
import type { Client, Task, TaskComment, TeamMember } from "@/lib/types";

type TaskFormAction = (formData: FormData) => void | Promise<void>;

type TaskCommentsResult =
  | { ok: true; comments: TaskComment[] }
  | { ok: false; message: string };

type TaskCommentMutationResult =
  | { ok: true; comment?: TaskComment }
  | { ok: false; message: string };

type TaskEditorTabsProps = {
  task: Task;
  clients: Client[];
  teamMembers: TeamMember[];
  activeProfile: OperationalProfile;
  canPersist: boolean;
  taskAction: TaskFormAction;
  submitLabel: string;
  initialComments?: TaskComment[];
  listCommentsAction?: (taskId: string) => Promise<TaskCommentsResult>;
  createCommentAction: (formData: FormData) => Promise<TaskCommentMutationResult>;
  deleteCommentAction: (commentId: string) => Promise<TaskCommentMutationResult>;
  onCancel?: () => void;
  footerAction?: React.ReactNode;
};

export function TaskEditorTabs({
  task,
  clients,
  teamMembers,
  activeProfile,
  canPersist,
  taskAction,
  submitLabel,
  initialComments = [],
  listCommentsAction,
  createCommentAction,
  deleteCommentAction,
  onCancel,
  footerAction,
}: TaskEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<"data" | "comments">("data");
  const [commentCount, setCommentCount] = useState(initialComments.length);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-1.5 rounded-[18px] border border-[var(--bb-border)] bg-white/45 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => setActiveTab("data")}
          className={`inline-flex min-h-9 items-center rounded-2xl px-3.5 text-sm font-extrabold transition ${
            activeTab === "data"
              ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
              : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
          }`}
        >
          Dados
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={`inline-flex min-h-9 items-center rounded-2xl px-3.5 text-sm font-extrabold transition ${
            activeTab === "comments"
              ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
              : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
          }`}
        >
          Comentários ({commentCount})
        </button>
      </div>

      {activeTab === "data" ? (
        <TaskForm
          action={taskAction}
          clients={clients}
          teamMembers={teamMembers}
          task={task}
          submitLabel={submitLabel}
          onCancel={onCancel}
          footerAction={footerAction}
        />
      ) : (
        <TaskComments
          key={task.id}
          taskId={task.id}
          initialComments={initialComments}
          activeProfile={activeProfile}
          canPersist={canPersist}
          listAction={listCommentsAction}
          createAction={createCommentAction}
          deleteAction={deleteCommentAction}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
}
