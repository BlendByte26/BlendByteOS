"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, KeyRound, ListPlus, LogOut, Plus, X } from "lucide-react";
import type { MouseEvent } from "react";
import { logoutAction } from "@/app/access/actions";
import { startAdminPreviewAction, stopAdminPreviewAction } from "@/app/admin-preview/actions";
import { BrandLogo } from "@/components/brand-logo";
import type { AuthenticatedOperationalProfile } from "@/lib/auth";
import {
  operationalProfiles,
  previewProfileKeys,
  type OperationalProfile,
  type OperationalProfileKey,
  type OperationalRole,
} from "@/lib/operational-profiles";

const navItems: Array<{
  href: string;
  label: string;
  roles?: OperationalRole[];
  profileKeys?: OperationalProfileKey[];
}> = [
  { href: "/", label: "Painel" },
  { href: "/clients", label: "Clientes" },
  { href: "/commercial", label: "Comercial", roles: ["admin"], profileKeys: ["guilherme"] },
  { href: "/content", label: "Conteúdos" },
  { href: "/tasks", label: "Tarefas" },
  { href: "/approvals", label: "Aprovações", roles: ["admin", "marketing"] },
  { href: "/team", label: "BlendHub" },
  { href: "/archive", label: "Arquivo" },
];

const pageActions: Record<string, { href: string; label: string }> = {
  "/clients": { href: "/clients/new", label: "Novo cliente" },
  "/content": { href: "/content/new", label: "Novo conteúdo" },
  "/tasks": { href: "/tasks/new", label: "Nova tarefa" },
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  profile: AuthenticatedOperationalProfile | null;
  realProfile: AuthenticatedOperationalProfile | null;
  previewProfile: OperationalProfile | null;
};

export function TopNav({ profile, realProfile, previewProfile }: Props) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  const rawAction = pageActions[pathname];
  const isAdmin = profile?.authRole === "admin";
  const canManageClients = profile ? ["admin", "marketing"].includes(profile.authRole) : false;
  const isPreview = Boolean(previewProfile);
  const returnPath = pathname;
  const action =
    rawAction &&
    (pathname === "/clients"
      ? canManageClients
      : pathname === "/team"
        ? isAdmin
        : Boolean(profile))
      ? rawAction
      : null;
  const showProfileControls = isDashboard && profile;
  const bulkContentHref = !isPreview && pathname === "/content" ? "/content?bulk=1" : null;
  const visibleNavItems = navItems.filter(
    (item) =>
      (!item.roles || (profile && item.roles.includes(profile.authRole))) &&
      (!item.profileKeys || (profile && item.profileKeys.includes(profile.key))),
  );

  function openBulkContent(event: MouseEvent<HTMLAnchorElement>) {
    if (typeof window === "undefined") return;

    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set("bulk", "1");
    window.location.assign(`/content?${params.toString()}`);
  }

  const previewMenu = realProfile?.key === "guilherme" ? (
    <details className="relative shrink-0">
      <summary
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--bb-border)] bg-white/70 text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.07)] transition hover:bg-[var(--bb-primary-soft)]"
        aria-label="Ver aplicação como"
        title="Ver aplicação como"
      >
        <Eye className="size-4" aria-hidden="true" />
      </summary>
      <div className="absolute left-0 top-12 z-50 w-64 rounded-2xl border border-[var(--bb-border)] bg-white p-2 shadow-2xl">
        <p className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--bb-muted)]">
          Ver aplicação como
        </p>
        {previewProfileKeys.map((key) => {
          const item = operationalProfiles[key];

          return (
            <form action={startAdminPreviewAction} key={key}>
              <input type="hidden" name="profile" value={key} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <button
                disabled={previewProfile?.key === key}
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--bb-primary-soft)] disabled:opacity-50"
              >
                <span className="block text-sm font-extrabold">{item.name}</span>
                <span className="text-xs font-semibold text-[var(--bb-muted)]">{item.role}</span>
              </button>
            </form>
          );
        })}
      </div>
    </details>
  ) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(0,0,0,0.04)] bg-[rgba(247,247,242,0.92)] backdrop-blur-xl">
      {previewProfile ? (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-950">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs font-extrabold sm:text-sm">
            <Eye className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Estás a visualizar a aplicação como {previewProfile.name}. As alterações estão
              desativadas neste modo.
            </span>
            <form action={stopAdminPreviewAction}>
              <input type="hidden" name="returnPath" value={returnPath} />
              <button className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-3 py-1 text-xs text-white">
                <X className="size-3" aria-hidden="true" />
                Sair da pré-visualização
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-4 md:px-6">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[230px_minmax(0,1fr)_auto] lg:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex min-w-0 items-center">
              <BrandLogo
                className="h-10 w-[138px] rounded-[12px] shadow-[0_14px_28px_rgba(0,0,0,0.16)] sm:w-[180px]"
                imageClassName="px-2"
                priority
              />
            </Link>
            {previewMenu}
          </div>

          <nav className="hidden min-w-0 justify-self-center rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:flex">
            {visibleNavItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition duration-200 xl:px-4 ${
                    active
                      ? "bg-[var(--bb-primary)] text-[var(--bb-black)] shadow-[0_8px_20px_rgba(83,183,223,0.28)]"
                      : "text-[var(--bb-muted)] hover:bg-[var(--bb-primary-hover)] hover:text-[var(--bb-black)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-2">
            {showProfileControls && !isPreview ? (
              <div className="flex min-w-0 items-center justify-end gap-2">
                <span className="hidden max-w-[190px] truncate rounded-full border border-[var(--bb-border)] bg-white/55 px-3 py-2 text-xs font-extrabold text-[var(--bb-muted)] xl:inline-flex">
                  Perfil: {profile.name}
                </span>
                <Link
                  href="/access/set-password"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/55 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  title="Alterar password"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">Password</span>
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/55 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                    title="Terminar sessão"
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                    <span className="hidden xl:inline">Sair</span>
                  </button>
                </form>
              </div>
            ) : null}
            {bulkContentHref ? (
              <Link
                href={bulkContentHref}
                onClick={openBulkContent}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/65 px-3 text-sm font-bold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.07)] transition duration-200 hover:bg-[var(--bb-primary-hover)] xl:px-4"
              >
                <ListPlus className="size-4" aria-hidden="true" />
                <span className="hidden xl:inline">Criar em lote</span>
              </Link>
            ) : null}
            {action && !isPreview ? (
              <Link
                href={action.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] xl:px-4"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden xl:inline">{action.label}</span>
              </Link>
            ) : showProfileControls ? null : (
              <div className="size-11" aria-hidden="true" />
            )}
          </div>
        </div>

        <nav className="mx-auto mt-3 flex max-w-[1280px] gap-1 overflow-x-auto rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden">
          {visibleNavItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-2 text-center text-[12px] font-semibold transition duration-200 ${
                  active
                    ? "bg-[var(--bb-primary)] text-[var(--bb-black)]"
                    : "text-[var(--bb-muted)] hover:bg-[rgba(0,0,0,0.05)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
