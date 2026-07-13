"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  APP_ACCESS_VIEW_COOKIE,
  isProductionEnvironment,
} from "@/lib/app-access";
import { OPERATIONAL_PROFILE_COOKIE } from "@/lib/operational-profiles";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AppAccessView } from "@/lib/app-access";

export type LoginState = {
  error: string | null;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function clearLegacyOperationalCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(APP_ACCESS_COOKIE);
  cookieStore.delete(APP_ACCESS_ERROR_COOKIE);
  cookieStore.delete(OPERATIONAL_PROFILE_COOKIE);
}

function redirectViewForRole(role: string): AppAccessView {
  return role === "design" ? "design" : "marketing";
}

export async function loginWithPasswordAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return {
      error: isProductionEnvironment()
        ? "Supabase Auth ainda não está configurado para produção."
        : "Supabase não está configurado. O modo demo continua disponível sem login.",
    };
  }

  const email = text(formData, "email");
  const password = text(formData, "password");

  if (!email || !password) {
    return { error: "Preenche o email e a password." };
  }

  const supabase = await getSupabase();
  if (!supabase) return { error: "Supabase não está configurado." };

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    return { error: "Email ou password inválidos." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("profile_key, role, active")
    .eq("auth_user_id", signInData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Esta conta ainda não tem perfil operacional associado." };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "Esta conta está inativa. Fala com o administrador." };
  }

  const view = redirectViewForRole(profile.role);
  const cookieStore = await cookies();
  clearLegacyOperationalCookies(cookieStore);
  cookieStore.set(APP_ACCESS_VIEW_COOKIE, view, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  redirect(`/?view=${view}`);
}

export async function logoutAction() {
  const supabase = await getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  clearLegacyOperationalCookies(cookieStore);
  cookieStore.delete(APP_ACCESS_VIEW_COOKIE);
  redirect("/access");
}
