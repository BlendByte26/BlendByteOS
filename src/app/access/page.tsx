import { BrandLogo } from "@/components/brand-logo";
import { AuthLinkHandler } from "@/components/auth-link-handler";
import { LoginForm } from "@/components/login-form";
import { isProductionEnvironment } from "@/lib/app-access";
import { isSupabaseConfigured } from "@/lib/supabase";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const inactive = valueOf(params, "inactive") === "1";
  const authStatus = valueOf(params, "auth");
  const setupMissing = valueOf(params, "setup") === "missing";
  const supabaseConfigured = isSupabaseConfigured();
  const showSetupNotice = setupMissing || (!supabaseConfigured && isProductionEnvironment());
  const showDemoNotice = !supabaseConfigured && !isProductionEnvironment();

  return (
    <main className="fixed inset-0 z-[100] grid min-h-screen place-items-center overflow-y-auto bg-[var(--bb-bg)] px-4 py-10 text-[var(--bb-charcoal)]">
      <section className="w-full max-w-[460px] rounded-[24px] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.12)] sm:p-7">
        <div className="mb-7 grid gap-3">
          <BrandLogo
            className="h-12 w-[224px] rounded-[14px] shadow-[0_14px_28px_rgba(0,0,0,0.16)]"
            imageClassName="px-2"
            priority
          />
          <div>
            <h1 className="sr-only">BlendByteOS</h1>
            <p className="text-sm font-semibold text-[var(--bb-muted)]">Acesso interno</p>
          </div>
        </div>

        {showSetupNotice ? (
          <div className="mb-4 grid gap-1 rounded-[16px] border border-[rgba(214,69,80,0.28)] bg-[rgba(214,69,80,0.08)] px-4 py-3 text-sm text-[#8a2530]">
            <p className="font-extrabold">Supabase Auth não configurado.</p>
            <p className="font-semibold">Configura as variáveis públicas de Supabase para ativar o login.</p>
          </div>
        ) : null}

        <AuthLinkHandler />

        {inactive ? (
          <div className="mb-4 rounded-[16px] border border-[#f3c56a] bg-[#fff6dd] px-4 py-3 text-sm font-bold leading-6 text-[#6f4a00]">
            A tua conta existe, mas o perfil operacional está inativo.
          </div>
        ) : null}

        {authStatus === "invalid" || authStatus === "expired" ? (
          <div className="mb-4 rounded-[16px] border border-[#f3c56a] bg-[#fff6dd] px-4 py-3 text-sm font-bold leading-6 text-[#6f4a00]">
            {authStatus === "expired"
              ? "O link expirou. Pede um novo convite ou recuperação de password."
              : "O link de autenticação não é válido."}
          </div>
        ) : null}

        {showDemoNotice ? (
          <div className="mb-4 rounded-[16px] border border-[rgba(83,183,223,0.32)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--bb-charcoal)]">
            Modo demo ativo: sem Supabase configurado, a app local continua acessível.
          </div>
        ) : null}

        <LoginForm />
      </section>
    </main>
  );
}
