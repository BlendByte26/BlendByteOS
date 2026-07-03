import Link from "next/link";
import { ClientLogo } from "./client-logo";
import { getClientDisplayCode, getClientVisualToken } from "@/lib/client-visuals";

type ClientBadgeProps = {
  clientId?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
  variant?: "compact" | "default" | "pill" | "header";
  showCode?: boolean;
  href?: string;
  className?: string;
};

export function ClientBadge({
  clientId,
  clientCode,
  clientName,
  shortName,
  logoUrl,
  variant = "default",
  showCode = true,
  href,
  className = "",
}: ClientBadgeProps) {
  const token = getClientVisualToken({ clientCode, clientName, shortName });
  const code = getClientDisplayCode({ clientCode, clientName, shortName });
  const compact = variant === "compact";
  const pill = variant === "pill";
  const header = variant === "header";
  const label = compact ? shortName || clientName || code : clientName || shortName || code;
  const targetHref = href ?? (clientId ? `/clients/${clientId}` : undefined);
  const mark = header ? (
    <ClientLogo
      logoPath={logoUrl}
      fallback={code}
      className={`grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white/64 text-sm font-extrabold ${token.border} ${token.text} shadow-[0_10px_24px_rgba(0,0,0,0.06)]`}
      imageClassName="h-full w-full object-contain p-1.5"
    />
  ) : (
    <span
      className={`${token.dot} shrink-0 rounded-full ${
        compact ? "size-2" : pill ? "size-2.5" : "size-3"
      }`}
      aria-hidden="true"
    />
  );
  const content = (
    <>
      {mark}
      {showCode ? (
        <span
          className={`shrink-0 rounded-full bg-white/62 font-extrabold ${token.text} ${
            compact ? "px-1.5 py-0.5 text-[10px]" : header ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
          }`}
        >
          {code}
        </span>
      ) : null}
      <span className={`min-w-0 truncate font-extrabold ${token.text}`}>
        {label}
      </span>
    </>
  );
  const classes = [
    "inline-flex max-w-full items-center gap-1.5 border align-middle transition",
    token.bg,
    token.border,
    token.shadow,
    compact ? "min-h-8 rounded-[13px] px-2 text-xs" : "",
    variant === "default" ? "min-h-10 rounded-[16px] px-2.5 text-sm" : "",
    pill ? "min-h-9 rounded-full px-3 text-xs" : "",
    header ? "min-h-20 gap-3 rounded-[20px] border-0 bg-transparent p-0 text-base shadow-none" : "",
    targetHref ? "hover:bg-white/82 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]" : "",
    header && targetHref ? "hover:bg-transparent hover:shadow-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (targetHref) {
    return (
      <Link href={targetHref} className={classes}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
