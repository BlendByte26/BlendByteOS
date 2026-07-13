"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, ListPlus, LogOut, Plus } from "lucide-react";
import type { MouseEvent } from "react";
import { logoutAction } from "@/app/access/actions";
import { BrandLogo } from "@/components/brand-logo";
import type { AuthenticatedOperationalProfile } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Painel" },
  { href: "/clients", label: "Clientes" },
  { href: "/content", label: "Conteúdos" },
  { href: "/tasks", label: "Tarefas" },
  { href: "/team", label: "Equipa" },
  { href: "/archive", label: "Arquivo" },
];

const pageActions: Record<string, { href: string; label: string }> = {
  "/clients": { href: "/clients/new", label: "Novo cliente" },
  "/content": { href: "/content/new", label: "Novo conteúdo" },
  "/tasks": { href: "/tasks/new", label: "Nova tarefa" },
  "/team": { href: "/team?new=1", label: "Novo membro" },
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ profile }: { profile: AuthenticatedOperationalProfile | null }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  const rawAction = pageActions[pathname];
  const isAdmin = profile?.authRole === "admin";
  const action =
    rawAction &&
    (pathname === "/clients" || pathname === "/team" ? isAdmin : Boolean(profile))
      ? rawAction
      : null;
  const showProfileControls = isDashboard && profile;
  const bulkContentHref = pathname === "/content" ? "/content?bulk=1" : null;

  function openBulkContent(event: MouseEvent<HTMLAnchorElement>) {
    if (typeof window === "undefined") return;

    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set("bulk", "1");
    window.location.assign(`/content?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(0,0,0,0.04)] bg-[rgba(247,247,242,0.82)] px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandLogo
            className="h-10 w-[138px] rounded-[12px] shadow-[0_14px_28px_rgba(0,0,0,0.16)] sm:w-[180px]"
            imageClassName="px-2"
            priority
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
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
          {showProfileControls ? (
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="hidden max-w-[190px] truncate rounded-full border border-[var(--bb-border)] bg-white/55 px-3 py-2 text-xs font-extrabold text-[var(--bb-muted)] sm:inline-flex">
                Perfil: {profile.name}
              </span>
              <Link
                href="/access/set-password"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/55 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                title="Alterar password"
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Password</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--bb-border)] bg-white/55 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] transition hover:bg-[var(--bb-primary-soft)]"
                  title="Terminar sessão"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          ) : null}
          {bulkContentHref ? (
            <Link
              href={bulkContentHref}
              onClick={openBulkContent}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--bb-border)] bg-white/65 px-4 text-sm font-bold text-[var(--bb-charcoal)] shadow-[0_12px_28px_rgba(0,0,0,0.07)] transition duration-200 hover:bg-[var(--bb-primary-hover)]"
            >
              <ListPlus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Criar em lote</span>
            </Link>
          ) : null}
          {action ? (
            <Link
              href={action.href}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          ) : showProfileControls ? null : (
            <div className="size-11" aria-hidden="true" />
          )}
        </div>
      </div>

      <nav className="mx-auto mt-3 grid max-w-[1280px] grid-cols-6 gap-1 rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-0 truncate rounded-full px-1.5 py-2 text-center text-[12px] font-semibold transition duration-200 ${
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
    </header>
  );
}
