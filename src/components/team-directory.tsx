"use client";

import { useActionState, useState } from "react";
import { Link as LinkIcon, Mail, Pencil, Phone, Plus, Save, Trash2, UserPlus, X } from "lucide-react";
import { LinksEditor, LinksList } from "@/components/links";
import {
  createCompanyContactAction,
  createTeamMemberAction,
  createUsefulLinkAction,
  deleteCompanyContactAction,
  deleteUsefulLinkAction,
  updateCompanyContactAction,
  updateTeamMemberAction,
  updateUsefulLinkAction,
  type UsefulLinkMutationResult,
} from "@/lib/actions";
import type { CompanyContact, TeamMember, UsefulLink } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

const inputClass = "bb-input text-sm font-semibold";
const labelClass = "grid gap-1.5 text-xs font-extrabold uppercase text-[var(--bb-muted)]";

function normalizePhoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

function ContactChip({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
    >
      {icon}
      <span className="truncate">{children}</span>
    </a>
  );
}

function TeamMemberFields({ member }: { member?: TeamMember }) {
  return (
    <div className="grid gap-3">
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
      <LinksEditor links={member?.links} />
    </div>
  );
}

function CompanyContactFields({ contact }: { contact?: CompanyContact }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          Nome/label
          <input name="label" required defaultValue={contact?.label ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Email
          <input name="email" type="email" required defaultValue={contact?.email ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Telefone opcional
          <input name="phone" type="tel" defaultValue={contact?.phone ?? ""} className={inputClass} />
        </label>
      </div>
      <LinksEditor links={contact?.links} />
    </div>
  );
}

type UsefulLinkFormState = { error: string | null };
type UsefulLinkFormAction = (formData: FormData) => Promise<UsefulLinkMutationResult | void>;

function isRedirectSignal(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function UsefulLinkFields({ link }: { link?: UsefulLink }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className={labelClass}>
        Nome
        <input name="name" required defaultValue={link?.name ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Link
        <input
          name="url"
          required
          inputMode="url"
          defaultValue={link?.url ?? ""}
          className={inputClass}
          placeholder="https://..."
        />
      </label>
    </div>
  );
}

function UsefulLinkForm({
  link,
  action,
  submitLabel,
}: {
  link?: UsefulLink;
  action: UsefulLinkFormAction;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_previousState: UsefulLinkFormState, formData: FormData): Promise<UsefulLinkFormState> => {
      try {
        const result = await action(formData);
        if (result?.ok === false) return { error: result.message };
        return { error: null };
      } catch (error) {
        if (isRedirectSignal(error)) throw error;
        return {
          error: error instanceof Error ? error.message : "Não foi possível guardar o link útil.",
        };
      }
    },
    { error: null },
  );

  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <div
          role="alert"
          className="rounded-[16px] border border-[rgba(214,69,80,0.28)] bg-[rgba(214,69,80,0.08)] px-4 py-3 text-sm font-bold leading-6 text-[#8a2530]"
        >
          {state.error}
        </div>
      ) : null}
      <UsefulLinkFields link={link} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-wait disabled:opacity-70"
        >
          <Save className="size-4" aria-hidden="true" />
          {pending ? "A guardar..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function MemberContacts({ member }: { member: TeamMember }) {
  const phoneHref = member.phone ? normalizePhoneHref(member.phone) : null;

  if (!member.email && !phoneHref && !member.links.length) {
    return <span className="text-xs font-bold text-[var(--bb-muted)]">Sem contactos</span>;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {member.email ? (
        <ContactChip href={`mailto:${member.email}`} icon={<Mail className="size-3.5" aria-hidden="true" />}>
          {member.email}
        </ContactChip>
      ) : null}
      {phoneHref ? (
        <ContactChip href={phoneHref} icon={<Phone className="size-3.5" aria-hidden="true" />}>
          {member.phone}
        </ContactChip>
      ) : null}
      <LinksList links={member.links} />
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
  companyContacts,
  usefulLinks,
  createOpen = false,
  canEdit = false,
}: {
  teamMembers: TeamMember[];
  companyContacts: CompanyContact[];
  usefulLinks: UsefulLink[];
  createOpen?: boolean;
  canEdit?: boolean;
}) {
  const [creating, setCreating] = useState(createOpen);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null);
  const [creatingUsefulLink, setCreatingUsefulLink] = useState(false);
  const [editingUsefulLink, setEditingUsefulLink] = useState<UsefulLink | null>(null);

  return (
    <>
      <div className="grid gap-4">
        <Panel className="p-4">
          <div className="mb-4">
            <h1 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Equipa</h1>
          </div>
          {teamMembers.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {teamMembers.map((member) => (
                <article
                  key={member.id}
                  className="grid min-h-40 gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/55 p-4"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-[var(--bb-charcoal)]">{member.name}</h2>
                    <p className="mt-1 truncate text-sm font-bold text-[var(--bb-muted)]">
                      {member.role ?? "Função por definir"}
                    </p>
                  </div>
                  <MemberContacts member={member} />
                  {canEdit ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(member)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Editar
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Ainda não existem membros na equipa." />
          )}
        </Panel>

        <Panel className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Contactos gerais BlendByte</h2>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setCreatingContact(true)}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Contacto
              </button>
            ) : null}
          </div>
          {companyContacts.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {companyContacts.map((contact) => {
                const phoneHref = contact.phone ? normalizePhoneHref(contact.phone) : null;

                return (
                  <article
                    key={contact.id}
                    className="grid gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/55 p-3"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-[var(--bb-charcoal)]">{contact.label}</h3>
                      <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                        <ContactChip
                          href={`mailto:${contact.email}`}
                          icon={<Mail className="size-3.5" aria-hidden="true" />}
                        >
                          {contact.email}
                        </ContactChip>
                        {phoneHref ? (
                          <ContactChip href={phoneHref} icon={<Phone className="size-3.5" aria-hidden="true" />}>
                            {contact.phone}
                          </ContactChip>
                        ) : null}
                        <LinksList links={contact.links} />
                      </div>
                    </div>
                    {canEdit ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingContact(contact)}
                          className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                          aria-label="Editar contacto"
                          title="Editar contacto"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <form
                          action={deleteCompanyContactAction.bind(null, contact.id)}
                          onSubmit={(event) => {
                            if (
                              !window.confirm(
                                `Apagar definitivamente o contacto "${contact.label}"?\n\nEsta ação não pode ser anulada.`,
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <button
                            type="submit"
                            className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[#a73522] transition hover:bg-[var(--bb-red-soft)]"
                            aria-label="Apagar contacto"
                            title="Apagar contacto"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Sem contactos gerais guardados." />
          )}
        </Panel>

        <Panel className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Links úteis</h2>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setCreatingUsefulLink(true)}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/70 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Link
              </button>
            ) : null}
          </div>
          {usefulLinks.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {usefulLinks.map((link) => (
                <article
                  key={link.id}
                  className="grid min-w-0 gap-3 rounded-[16px] border border-[var(--bb-border)] bg-white/55 p-3"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-[var(--bb-charcoal)]">{link.name}</h3>
                    <div className="mt-2 flex min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                      >
                        <LinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">{link.url}</span>
                      </a>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingUsefulLink(link)}
                        className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                        aria-label="Editar link útil"
                        title="Editar link útil"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <form
                        action={deleteUsefulLinkAction.bind(null, link.id)}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Apagar definitivamente o link "${link.name}"?\n\nEsta ação não pode ser anulada.`,
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <button
                          type="submit"
                          className="grid size-8 place-items-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[#a73522] transition hover:bg-[var(--bb-red-soft)]"
                          aria-label="Apagar link útil"
                          title="Apagar link útil"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem links úteis guardados." />
          )}
        </Panel>
      </div>

      {canEdit && creating ? (
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

      {canEdit && editing ? (
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

      {canEdit && creatingContact ? (
        <ModalShell title="Novo contacto" onClose={() => setCreatingContact(false)}>
          <form action={createCompanyContactAction} className="grid gap-4">
            <CompanyContactFields />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
              >
                <Plus className="size-4" aria-hidden="true" />
                Guardar contacto
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {canEdit && editingContact ? (
        <ModalShell title="Editar contacto" onClose={() => setEditingContact(null)}>
          <form action={updateCompanyContactAction.bind(null, editingContact.id)} className="grid gap-4">
            <CompanyContactFields contact={editingContact} />
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

      {canEdit && creatingUsefulLink ? (
        <ModalShell title="Novo link útil" onClose={() => setCreatingUsefulLink(false)}>
          <UsefulLinkForm action={createUsefulLinkAction} submitLabel="Guardar link" />
        </ModalShell>
      ) : null}

      {canEdit && editingUsefulLink ? (
        <ModalShell title="Editar link útil" onClose={() => setEditingUsefulLink(null)}>
          <UsefulLinkForm
            link={editingUsefulLink}
            action={updateUsefulLinkAction.bind(null, editingUsefulLink.id)}
            submitLabel="Guardar"
          />
        </ModalShell>
      ) : null}
    </>
  );
}
