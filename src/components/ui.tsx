import Link from "next/link";
import { CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { getClientInitials } from "@/lib/client-display";
import { statusTone } from "@/lib/labels";
import { getContentStatusStyle, getTaskStatusStyle } from "@/lib/status-styles";
import type { Client, ContentStatus, TaskStatus } from "@/lib/types";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--bb-charcoal)] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--bb-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bb-black)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
    >
      <Plus className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 text-sm font-bold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl transition duration-200 hover:bg-[var(--bb-primary-hover)]"
    >
      {children}
    </Link>
  );
}

export function Badge({
  value,
  label,
  statusKind,
}: {
  value: string;
  label: string;
  statusKind?: "task" | "content";
}) {
  const statusStyle =
    statusKind === "task"
      ? getTaskStatusStyle(value as TaskStatus)
      : statusKind === "content"
        ? getContentStatusStyle(value as ContentStatus)
        : null;

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${
        statusStyle
          ? `border ${statusStyle.pill}`
          : `ring-1 ring-inset ${statusTone[value] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"}`
      } whitespace-nowrap`}
    >
      {statusStyle ? <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${statusStyle.dot}`} /> : null}
      {label}
    </span>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`min-w-0 rounded-[24px] border border-[rgba(0,0,0,0.11)] bg-[rgba(255,255,255,0.86)] shadow-[0_18px_52px_rgba(0,0,0,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(0,0,0,0.15)] hover:shadow-[0_24px_64px_rgba(0,0,0,0.11)] ${className}`}
    >
      {children}
    </section>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-4 py-7 text-center text-sm font-medium text-[var(--bb-muted)]">
      <CheckCircle2 className="size-5 text-[var(--bb-muted)]" aria-hidden="true" />
      {title}
    </div>
  );
}

export function ConfigNotice() {
  return (
    <div className="mb-6 flex gap-3 rounded-[18px] border border-[rgba(236,254,84,0.55)] bg-[var(--bb-yellow-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--bb-charcoal)] shadow-[0_14px_36px_rgba(0,0,0,0.04)]">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--bb-yellow)] ring-4 ring-[rgba(236,254,84,0.16)]" />
      <span>
        Supabase ainda não está configurado. A app está a mostrar dados de exemplo; para
        gravar alterações, aplique o SQL em <span className="font-extrabold">supabase/schema.sql</span>
        {" "}e defina <span className="font-extrabold">NEXT_PUBLIC_SUPABASE_URL</span> e
        <span className="font-extrabold"> NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
      </span>
    </div>
  );
}

export function SupabaseSchemaNotice({ message }: { message: string }) {
  return (
    <div className="mb-6 flex gap-3 rounded-[18px] border border-[rgba(232,76,49,0.28)] bg-[var(--bb-red-soft)] px-4 py-3 text-sm font-medium leading-6 text-[#8f2415] shadow-[0_14px_36px_rgba(0,0,0,0.04)]">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--bb-red)] ring-4 ring-[rgba(232,76,49,0.16)]" />
      <span>
        <span className="font-extrabold">{message}</span>{" "}
        Aplique o SQL em <span className="font-extrabold">supabase/schema.sql</span> no projeto Supabase.
      </span>
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain rounded-[24px] pb-2 [scrollbar-gutter:stable]">
      {children}
    </div>
  );
}

export function ExternalLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-zinc-400">—</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--bb-border)] bg-white/60 px-3 text-xs font-extrabold text-[var(--bb-charcoal)] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition hover:border-[rgba(83,183,223,0.44)] hover:bg-[var(--bb-primary-soft)]"
    >
      {label}
    </a>
  );
}

export function ClearFiltersLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Limpar filtros"
      title="Limpar filtros"
      className="inline-grid size-11 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition duration-200 hover:bg-[var(--bb-primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
    </Link>
  );
}

const actionIconClass =
  "inline-grid size-9 shrink-0 place-items-center rounded-full border border-[var(--bb-border)] bg-white/55 shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)]";

export function EditIconLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Editar"
      title="Editar"
      className={`${actionIconClass} text-[var(--bb-charcoal)] hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]`}
    >
      <Pencil className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function DeleteIconButton() {
  return (
    <button
      type="submit"
      aria-label="Apagar"
      title="Apagar"
      className={`${actionIconClass} text-[#a73522] hover:border-[rgba(232,76,49,0.32)] hover:bg-[var(--bb-red-soft)]`}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}

export function WorkflowLinkCard({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return (
      <div className="rounded-[18px] border border-dashed border-[var(--bb-border)] bg-white/35 px-4 py-3">
        <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{label}</div>
        <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">Por adicionar</div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-[18px] border border-[var(--bb-border)] bg-white/55 px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)]"
    >
      <div className="text-sm font-extrabold text-[var(--bb-charcoal)]">{label}</div>
      <div className="mt-1 text-xs font-bold text-[var(--bb-muted)]">Abrir link</div>
    </a>
  );
}

export function ClientAvatar({
  client,
  size = "sm",
}: {
  client: Pick<Client, "name" | "short_name" | "logo_url">;
  size?: "xs" | "sm" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "size-16 rounded-2xl text-sm"
      : size === "xs"
        ? "size-8 rounded-xl text-[10px]"
        : "size-10 rounded-xl text-xs";

  return (
    <div
      className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden border border-[var(--bb-border)] bg-white/60 font-extrabold text-[var(--bb-charcoal)] shadow-[0_10px_24px_rgba(0,0,0,0.06)]`}
      aria-hidden="true"
    >
      {client.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={client.logo_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getClientInitials(client)}</span>
      )}
    </div>
  );
}
