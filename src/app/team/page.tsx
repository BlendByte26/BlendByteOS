import { Mail, Phone, Save, UserPlus } from "lucide-react";
import { createTeamMemberAction, updateTeamMemberAction } from "@/lib/actions";
import { getTeamMembers } from "@/lib/data";
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
    <div className="grid gap-3 md:grid-cols-4">
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

export default async function TeamPage() {
  const teamMembers = await getTeamMembers();

  return (
    <div className="grid gap-5">
      <Panel className="p-4">
        <form action={createTeamMemberAction} className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Equipa</h1>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Adicionar
            </button>
          </div>
          <TeamMemberFields />
        </form>
      </Panel>

      <Panel className="p-4">
        {teamMembers.length ? (
          <div className="grid gap-3">
            {teamMembers.map((member) => (
              <form
                key={member.id}
                action={updateTeamMemberAction.bind(null, member.id)}
                className="grid gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{member.name}</div>
                    <div className="mt-0.5 text-xs font-bold text-[var(--bb-muted)]">
                      {member.role ?? "Função por definir"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ContactLinks member={member} />
                    <button
                      type="submit"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                    >
                      <Save className="size-3.5" aria-hidden="true" />
                      Guardar
                    </button>
                  </div>
                </div>
                <TeamMemberFields member={member} />
              </form>
            ))}
          </div>
        ) : (
          <EmptyState title="Ainda não existem membros na equipa." />
        )}
      </Panel>
    </div>
  );
}
