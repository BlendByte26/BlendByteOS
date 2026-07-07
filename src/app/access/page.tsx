import { cookies } from "next/headers";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  getAppAccessPassword,
  isValidAppAccessToken,
  isProductionEnvironment,
} from "@/lib/app-access";
import {
  OPERATIONAL_PROFILE_COOKIE,
  getOperationalProfile,
  operationalProfiles,
} from "@/lib/operational-profiles";
import { selectOperationalProfile, verifyAppAccess } from "./actions";

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
  const passwordConfigured = Boolean(getAppAccessPassword());
  const productionMissing = isProductionEnvironment() && !passwordConfigured;
  const cookieStore = await cookies();
  const hasError = Boolean(cookieStore.get(APP_ACCESS_ERROR_COOKIE));
  const currentProfile = getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value);
  const password = getAppAccessPassword();
  const hasAccess = password
    ? await isValidAppAccessToken(cookieStore.get(APP_ACCESS_COOKIE)?.value, password)
    : !productionMissing;
  const showProfileSelection =
    hasAccess && (valueOf(params, "profile") === "1" || valueOf(params, "switch") === "1");

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
        ) : showProfileSelection ? (
          <div className="grid gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Entrar como</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--bb-muted)]">Escolhe o perfil operacional.</p>
            </div>
            <div className="grid gap-2">
              {Object.values(operationalProfiles).map((profile) => {
                const active = currentProfile?.key === profile.key;

                return (
                  <form key={profile.key} action={selectOperationalProfile}>
                    <button
                      type="submit"
                      name="profile"
                      value={profile.key}
                      className={`w-full min-h-24 rounded-[18px] border px-4 py-3 text-left shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(83,183,223,0.42)] hover:bg-[var(--bb-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-primary-soft)] ${
                        active
                          ? "border-[rgba(83,183,223,0.5)] bg-[var(--bb-primary-soft)]"
                          : "border-[var(--bb-border)] bg-white/65"
                      }`}
                    >
                      <span className="block text-base font-extrabold leading-5 text-[var(--bb-charcoal)]">
                        {profile.name}
                      </span>
                      <span className="mt-2 block text-sm font-bold leading-5 text-[var(--bb-muted)]">
                        {profile.role}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
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
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)]"
            >
              Continuar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
