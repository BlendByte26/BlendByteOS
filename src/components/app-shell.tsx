import { cookies } from "next/headers";
import { getSupabaseHealth } from "@/lib/supabase";
import {
  OPERATIONAL_PROFILE_COOKIE,
  getOperationalProfile,
} from "@/lib/operational-profiles";
import { ConfigNotice, SupabaseSchemaNotice } from "./ui";
import { TopNav } from "./top-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const health = await getSupabaseHealth();
  const cookieStore = await cookies();
  const profile = getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value);

  return (
    <div className="min-h-screen text-[var(--bb-charcoal)]">
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-14 pt-4 md:px-6 md:pt-6">
        {health.status === "demo" ? <ConfigNotice /> : null}
        {health.status === "schema_missing" ? (
          <SupabaseSchemaNotice message={health.message} />
        ) : null}
        {health.status === "connection_error" ? (
          <SupabaseSchemaNotice message={`Supabase ligado, mas a ligação falhou: ${health.message}`} />
        ) : null}
        {children}
      </main>
    </div>
  );
}
