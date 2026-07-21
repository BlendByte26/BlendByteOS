import { redirect } from "next/navigation";
import {
  fallbackOperationalProfile,
  getOperationalProfile,
  type OperationalProfile,
  type OperationalProfileKey,
  type OperationalRole,
} from "./operational-profiles";
import { getSupabase, isSupabaseConfigured, isSupabaseSchemaError } from "./supabase";

export type AuthenticatedOperationalProfile = Omit<OperationalProfile, "authRole"> & {
  authUserId: string;
  displayName: string;
  authRole: OperationalRole;
  active: boolean;
};

type UserProfileRow = {
  auth_user_id: string;
  profile_key: OperationalProfileKey;
  display_name: string;
  role: OperationalRole;
  active: boolean;
};

function profileFromRow(row: UserProfileRow): AuthenticatedOperationalProfile | null {
  const profile = getOperationalProfile(row.profile_key);
  if (!profile || !row.active) return null;

  return {
    ...profile,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    authRole: row.role,
    active: row.active,
  };
}

export function demoOperationalProfile(): AuthenticatedOperationalProfile {
  const profile = fallbackOperationalProfile();

  return {
    ...profile,
    authUserId: "demo",
    displayName: profile.name,
    authRole: "admin",
    active: true,
  };
}

export async function getAuthenticatedOperationalProfile() {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("auth_user_id, profile_key, display_name, role, active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    if (isSupabaseSchemaError(error)) return null;
    console.error("Erro ao carregar perfil autenticado", { code: error.code });
    return null;
  }

  return data ? profileFromRow(data as UserProfileRow) : null;
}

export async function getRealProfile() {
  const profile = await getAuthenticatedOperationalProfile();
  if (profile) return profile;
  if (!isSupabaseConfigured()) return demoOperationalProfile();
  return null;
}

export async function getCurrentOperationalProfile() {
  const { getEffectiveProfile } = await import("./admin-preview");
  return getEffectiveProfile(await getRealProfile());
}

export async function requireCurrentOperationalProfile() {
  const profile = await getCurrentOperationalProfile();
  if (!profile) redirect("/access");
  return profile;
}

export async function requireRealProfile() {
  const profile = await getRealProfile();
  if (!profile) redirect("/access");
  return profile;
}

export async function requireRole(roles: readonly OperationalRole[]) {
  const profile = await requireCurrentOperationalProfile();
  if (!roles.includes(profile.authRole)) redirect("/");
  return profile;
}

export function canManageClients(profile: Pick<AuthenticatedOperationalProfile, "authRole"> | null) {
  return profile ? ["admin", "marketing"].includes(profile.authRole) : false;
}

export function canDeleteClients(profile: Pick<AuthenticatedOperationalProfile, "authRole"> | null) {
  return profile?.authRole === "admin";
}

export function canManageTeam(profile: Pick<AuthenticatedOperationalProfile, "authRole"> | null) {
  return profile?.authRole === "admin";
}

export function canManageContentAndTasks(profile: Pick<AuthenticatedOperationalProfile, "authRole"> | null) {
  return profile ? ["admin", "marketing", "design"].includes(profile.authRole) : false;
}
