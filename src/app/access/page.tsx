import { cookies } from "next/headers";
import {
  APP_ACCESS_ERROR_COOKIE,
  getAppAccessPassword,
  isAppAccessView,
  isProductionEnvironment,
} from "@/lib/app-access";
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
  const setup = valueOf(params, "setup");
  const selectedView = valueOf(params, "view");
  const initialView = isAppAccessView(selectedView) ? selectedView : "marketing";
  const passwordConfigured = Boolean(getAppAccessPassword());
  const productionMissing = isProductionEnvironment() && !passwordConfigured;
  const cookieStore = await cookies();
  const hasError = Boolean(cookieStore.get(APP_ACCESS_ERROR_COOKIE));

  return (
    <main className="fixed inset-0 z-[100] grid min-h-screen place-items-center overflow-y-auto bg-[var(--bb-bg)] px-4 py-10 text-[var(--bb-charcoal)]">
      <section className="w-full max-w-[460px] rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.12)] sm:p-7">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[16px] bg-[var(--bb-black)] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
            BB
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">BlendByteOS</h1>
            <p className="text-sm font-semibold text-[var(--bb-muted)]">Acesso interno</p>
          </div>
        </div>

        {productionMissing || setup === "missing" ? (
          <div className="grid gap-1 rounded-[16px] border border-[rgba(214,69,80,0.28)] bg-[rgba(214,69,80,0.08)] px-4 py-3 text-sm text-[#8a2530]">
            <p className="font-extrabold">Acesso não configurado.</p>
            <p className="font-semibold">Configura APP_ACCESS_PASSWORD no Vercel para ativar o acesso.</p>
          </div>
        ) : (
          <form action={verifyAppAccess} className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
              />
            </label>
            {hasError ? (
              <p className="text-sm font-bold text-[#8a2530]">Password errada. Tenta novamente.</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "marketing",
                  label: "Entrar em Marketing / Gestão",
                  note: "Painel de prioridades e publicação",
                },
                {
                  value: "design",
                  label: "Entrar em Design",
                  note: "Painel de produção visual",
                },
              ].map((option) => {
                const active = initialView === option.value;

                return (
                  <button
                    key={option.value}
                    type="submit"
                    name="view"
                    value={option.value}
                    className={`min-h-28 rounded-[18px] border px-4 py-3 text-left shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
                      active
                        ? "border-[rgba(83,183,223,0.5)] bg-[var(--bb-primary-soft)]"
                        : "border-[var(--bb-border)] bg-white/65"
                    }`}
                  >
                    <span className="block text-sm font-extrabold leading-5 text-[var(--bb-charcoal)]">
                      {option.label}
                    </span>
                    <span className="mt-2 block text-xs font-bold leading-5 text-[var(--bb-muted)]">
                      {option.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
