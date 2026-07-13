import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

const allowedTypes = new Set(["signup", "invite", "magiclink", "recovery", "email"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/access/set-password";

  if (!tokenHash || !type || !allowedTypes.has(type)) {
    redirect("/access?auth=invalid");
  }

  const supabase = await getSupabase();
  if (!supabase) redirect("/access?setup=missing");

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    redirect("/access?auth=expired");
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/access/set-password");
}
