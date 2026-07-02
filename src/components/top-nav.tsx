"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const navItems = [
  { href: "/", label: "Painel" },
  { href: "/clients", label: "Clientes" },
  { href: "/content", label: "Conteúdos" },
  { href: "/tasks", label: "Tarefas" },
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

export function TopNav() {
  const pathname = usePathname();
  const action = pageActions[pathname];

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(0,0,0,0.04)] bg-[rgba(247,247,242,0.82)] px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--bb-black)] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
            BB
          </span>
          <span className="hidden text-base font-extrabold tracking-tight text-[var(--bb-charcoal)] sm:inline">
            BlendByteOS
          </span>
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

        <div className="flex min-w-0 justify-end">
          {action ? (
            <Link
              href={action.href}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          ) : (
            <div className="size-11" aria-hidden="true" />
          )}
        </div>
      </div>

      <nav className="mx-auto mt-3 flex max-w-[1280px] gap-1 overflow-x-auto rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition duration-200 ${
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
