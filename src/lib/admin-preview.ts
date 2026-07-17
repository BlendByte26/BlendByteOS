import { cookies } from "next/headers";
import {
  ADMIN_PREVIEW_PROFILE_COOKIE,
  isPreviewProfileKey,
  operationalProfiles,
  type PreviewProfileKey,
} from "./operational-profiles";
import type { AuthenticatedOperationalProfile } from "./auth";

export const ADMIN_PREVIEW_READ_ONLY_MESSAGE =
  "Esta ação está desativada durante a pré-visualização de outro perfil.";

export async function getPreviewProfileKey(): Promise<PreviewProfileKey | null> {
  const value = (await cookies()).get(ADMIN_PREVIEW_PROFILE_COOKIE)?.value;
  return isPreviewProfileKey(value) ? value : null;
}

export async function getPreviewProfile(realProfile: AuthenticatedOperationalProfile | null) {
  if (realProfile?.key !== "guilherme") return null;
  const key = await getPreviewProfileKey();
  return key ? operationalProfiles[key] : null;
}

export async function isAdminPreviewMode(realProfile: AuthenticatedOperationalProfile | null) {
  return Boolean(await getPreviewProfile(realProfile));
}

export async function getEffectiveProfile(realProfile: AuthenticatedOperationalProfile | null) {
  if (!realProfile) return null;
  const preview = await getPreviewProfile(realProfile);
  if (!preview) return realProfile;

  return {
    ...realProfile,
    ...preview,
    displayName: preview.name,
  } satisfies AuthenticatedOperationalProfile;
}

export async function assertNotAdminPreviewMode() {
  const { getRealProfile } = await import("./auth");
  if (await isAdminPreviewMode(await getRealProfile())) {
    throw new Error(ADMIN_PREVIEW_READ_ONLY_MESSAGE);
  }
}
