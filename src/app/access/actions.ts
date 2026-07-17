"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  APP_ACCESS_VIEW_COOKIE,
  isProductionEnvironment,
} from "@/lib/app-access";
import { ADMIN_PREVIEW_PROFILE_COOKIE, OPERATIONAL_PROFILE_COOKIE } from "@/lib/operational-profiles";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AppAccessView } from "@/lib/app-access";
import { ADMIN_PREVIEW_READ_ONLY_MESSAGE, isAdminPreviewMode } from "@/lib/admin-preview";
import { getRealProfile } from "@/lib/auth";

export type LoginState = {
  error: string | null;
};

export type SetPasswordState = {
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
  cookieStore.delete(ADMIN_PREVIEW_PROFILE_COOKIE);
}

function redirectViewForRole(role: string): AppAccessView {
  return role === "design" ? "design" : "marketing";
}

async function redirectToOperationalHome(authUserId: string): Promise<never> {
  const supabase = await getSupabase();
  if (!supabase) redirect("/access");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/access");
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    redirect("/access?inactive=1");
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

  return await redirectToOperationalHome(signInData.user.id);
}

export async function setPasswordAction(
  _previousState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  if (await isAdminPreviewMode(await getRealProfile())) {
    return { error: ADMIN_PREVIEW_READ_ONLY_MESSAGE };
  }
  const password = text(formData, "password");
  const passwordConfirm = text(formData, "password_confirm");

  if (password.length < 8) {
    return { error: "A password deve ter pelo menos 8 caracteres." };
  }

  if (password !== passwordConfirm) {
    return { error: "As passwords não coincidem." };
  }

  const supabase = await getSupabase();
  if (!supabase) return { error: "Supabase não está configurado." };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "A sessão expirou. Abre novamente o link do convite." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Não foi possível definir a password. Tenta novamente." };
  }

  return await redirectToOperationalHome(user.id);
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
