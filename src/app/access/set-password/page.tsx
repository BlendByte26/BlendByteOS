import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SetPasswordForm } from "@/components/set-password-form";
import { getAuthenticatedOperationalProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function SetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/access?setup=missing");

  const profile = await getAuthenticatedOperationalProfile();
  if (!profile) redirect("/access");

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
            <h1 className="text-lg font-extrabold text-[var(--bb-charcoal)]">Definir password</h1>
            <p className="mt-1 text-sm font-semibold text-[var(--bb-muted)]">
              {profile.displayName}, cria a tua password para entrar no BlendByteOS.
            </p>
          </div>
        </div>

        <SetPasswordForm />
      </section>
    </main>
  );
}
