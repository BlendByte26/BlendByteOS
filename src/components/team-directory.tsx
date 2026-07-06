"use client";

import { useState } from "react";
import { Mail, Pencil, Phone, Save, UserPlus, X } from "lucide-react";
import { createTeamMemberAction, updateTeamMemberAction } from "@/lib/actions";
import type { TeamMember } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

const inputClass = "bb-input text-sm font-semibold";
const labelClass = "grid gap-1.5 text-xs font-extrabold uppercase text-[var(--bb-muted)]";

function normalizePhoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

function TeamMemberFields({ member }: { member?: TeamMember }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className={labelClass}>
        Nome
        <input name="name" required defaultValue={member?.name ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Função
        <input name="role" defaultValue={member?.role ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Email
        <input name="email" type="email" defaultValue={member?.email ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Telemóvel
        <input name="phone" type="tel" defaultValue={member?.phone ?? ""} className={inputClass} />
      </label>
    </div>
  );
}

function ContactLinks({ member }: { member: TeamMember }) {
  const phoneHref = member.phone ? normalizePhoneHref(member.phone) : null;

  if (!member.email && !phoneHref) {
    return <span className="text-xs font-bold text-[var(--bb-muted)]">Sem contactos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {member.email ? (
        <a
          href={`mailto:${member.email}`}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <Mail className="size-3.5" aria-hidden="true" />
          Email
        </a>
      ) : null}
      {phoneHref ? (
        <a
          href={phoneHref}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
        >
          <Phone className="size-3.5" aria-hidden="true" />
          Telemóvel
        </a>
      ) : null}
    </div>
  );
}

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
      <section className="w-full max-w-2xl rounded-[22px] border border-[var(--bb-border)] bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="grid size-9 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 transition hover:bg-[var(--bb-primary-soft)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function TeamDirectory({
  teamMembers,
  createOpen = false,
}: {
  teamMembers: TeamMember[];
  createOpen?: boolean;
}) {
  const [creating, setCreating] = useState(createOpen);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  return (
    <>
      <Panel className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Equipa</h1>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Novo membro
          </button>
        </div>
        {teamMembers.length ? (
          <div className="grid gap-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/50 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-[var(--bb-charcoal)]">{member.name}</div>
                  <div className="mt-0.5 truncate text-xs font-bold text-[var(--bb-muted)]">
                    {member.role ?? "Função por definir"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ContactLinks member={member} />
                  <button
                    type="button"
                    onClick={() => setEditing(member)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Ainda não existem membros na equipa." />
        )}
      </Panel>

      {creating ? (
        <ModalShell title="Novo membro" onClose={() => setCreating(false)}>
          <form action={createTeamMemberAction} className="grid gap-4">
            <TeamMemberFields />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Criar membro
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {editing ? (
        <ModalShell title="Editar membro" onClose={() => setEditing(null)}>
          <form action={updateTeamMemberAction.bind(null, editing.id)} className="grid gap-4">
            <TeamMemberFields member={editing} />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
              >
                <Save className="size-4" aria-hidden="true" />
                Guardar
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
