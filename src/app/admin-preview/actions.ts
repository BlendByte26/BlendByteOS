"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRealProfile } from "@/lib/auth";
import { isProductionEnvironment } from "@/lib/app-access";
import {
  ADMIN_PREVIEW_PROFILE_COOKIE,
  isPreviewProfileKey,
} from "@/lib/operational-profiles";

function safeReturnPath(formData: FormData) {
  const value = formData.get("returnPath");
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export async function startAdminPreviewAction(formData: FormData) {
  const realProfile = await requireRealProfile();
  if (realProfile.key !== "guilherme") {
    (await cookies()).delete(ADMIN_PREVIEW_PROFILE_COOKIE);
    throw new Error("Apenas o Guilherme pode iniciar uma pré-visualização.");
  }

  const key = formData.get("profile");
  if (typeof key !== "string" || !isPreviewProfileKey(key)) {
    (await cookies()).delete(ADMIN_PREVIEW_PROFILE_COOKIE);
    throw new Error("Perfil de pré-visualização inválido.");
  }

  (await cookies()).set(ADMIN_PREVIEW_PROFILE_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
  });
  redirect(safeReturnPath(formData));
}

export async function stopAdminPreviewAction(formData: FormData) {
  (await cookies()).delete(ADMIN_PREVIEW_PROFILE_COOKIE);
  redirect(safeReturnPath(formData));
}
