import { cookies } from "next/headers";
import { APP_ACCESS_ERROR_COOKIE, getAppAccessPassword, isProductionEnvironment } from "@/lib/app-access";
import { verifyAppAccess } from "./actions";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const nextPath = valueOf(params, "next") ?? "/";
  const setup = valueOf(params, "setup");
  const passwordConfigured = Boolean(getAppAccessPassword());
  const productionMissing = isProductionEnvironment() && !passwordConfigured;
  const cookieStore = await cookies();
  const hasError = Boolean(cookieStore.get(APP_ACCESS_ERROR_COOKIE));

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bb-cream)] px-4 py-10 text-[var(--bb-charcoal)]">
      <section className="w-full max-w-sm rounded-[22px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.12)]">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[15px] bg-[var(--bb-black)] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
            BB
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">BlendByteOS</h1>
            <p className="text-sm font-semibold text-[var(--bb-muted)]">Acesso interno</p>
          </div>
        </div>

        {productionMissing || setup === "missing" ? (
          <div className="rounded-[16px] border border-[rgba(214,69,80,0.28)] bg-[rgba(214,69,80,0.08)] px-4 py-3 text-sm font-bold text-[#8a2530]">
            Acesso não configurado.
          </div>
        ) : (
          <form action={verifyAppAccess} className="grid gap-4">
            <input type="hidden" name="next" value={nextPath.startsWith("/") ? nextPath : "/"} />
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
              />
            </label>
            {hasError ? (
              <p className="text-sm font-bold text-[#8a2530]">Password errada. Tenta novamente.</p>
            ) : null}
            <button
              type="submit"
              className="min-h-12 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              Entrar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
