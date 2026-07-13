import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { invest2030PublicHref } from "@/lib/invest2030-public";

export function Invest2030PublicShell({
  accessToken,
  active,
  children,
}: {
  accessToken: string;
  active: "new" | "history";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-5 text-[var(--bb-charcoal)] md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="mb-6 rounded-[24px] border border-[rgba(0,0,0,0.11)] bg-[rgba(255,255,255,0.88)] px-4 py-4 shadow-[0_18px_52px_rgba(0,0,0,0.08)] backdrop-blur-xl md:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <BrandLogo
                  className="h-8 w-[150px] rounded-[10px] shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
                  imageClassName="px-1.5"
                  priority
                />
                <span className="text-xs font-extrabold uppercase text-[var(--bb-muted)]">
                  x Invest2030
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--bb-charcoal)] md:text-3xl">
                Pedidos Invest2030
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-[var(--bb-muted)]">
                Campanhas, newsletters, webinars, reenvios e diretrizes de conteúdo
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                href={invest2030PublicHref("/invest2030/novo-pedido", accessToken)}
                className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-extrabold transition ${
                  active === "new"
                    ? "bg-[var(--bb-black)] text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                    : "border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
                }`}
              >
                Novo pedido
              </Link>
              <Link
                href={invest2030PublicHref("/invest2030/pedidos", accessToken)}
                className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-extrabold transition ${
                  active === "history"
                    ? "bg-[var(--bb-black)] text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                    : "border border-[var(--bb-border)] bg-white/65 text-[var(--bb-charcoal)] hover:bg-[var(--bb-primary-soft)]"
                }`}
              >
                Histórico
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function Invest2030InvalidAccess() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-[var(--bb-charcoal)]">
      <section className="w-full max-w-md rounded-[24px] border border-[rgba(0,0,0,0.11)] bg-[rgba(255,255,255,0.88)] p-6 text-center shadow-[0_18px_52px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <BrandLogo
          className="mx-auto h-9 w-[168px] rounded-[10px] shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
          imageClassName="px-1.5"
          priority
        />
        <div className="mt-3 text-xs font-extrabold uppercase text-[var(--bb-muted)]">Pedidos Invest2030</div>
        <h1 className="mt-2 text-2xl font-extrabold text-[var(--bb-charcoal)]">
          Acesso inválido.
        </h1>
      </section>
    </main>
  );
}
