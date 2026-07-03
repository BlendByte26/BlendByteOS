"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  createAppAccessToken,
  getAppAccessPassword,
  isProductionEnvironment,
} from "@/lib/app-access";

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/access")) return "/";
  return value;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProductionEnvironment(),
    path: "/",
    maxAge,
  };
}

export async function verifyAppAccess(formData: FormData) {
  const password = getAppAccessPassword();
  const nextPath = safeRedirectPath(formData.get("next"));
  const cookieStore = await cookies();

  if (!password) {
    cookieStore.delete(APP_ACCESS_COOKIE);
    redirect("/access?setup=missing");
  }

  const submittedPassword = String(formData.get("password") ?? "");
  const submittedToken = await createAppAccessToken(submittedPassword);
  const expectedToken = await createAppAccessToken(password);

  if (submittedToken === expectedToken) {
    cookieStore.set(APP_ACCESS_COOKIE, expectedToken, cookieOptions(60 * 60 * 12));
    cookieStore.delete(APP_ACCESS_ERROR_COOKIE);
    redirect(nextPath);
  }

  cookieStore.set(APP_ACCESS_ERROR_COOKIE, "1", cookieOptions(12));
  redirect(`/access?next=${encodeURIComponent(nextPath)}`);
}
