"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  APP_ACCESS_VIEW_COOKIE,
  createAppAccessToken,
  getAppAccessPassword,
  isValidAppAccessToken,
  isProductionEnvironment,
} from "@/lib/app-access";
import {
  OPERATIONAL_PROFILE_COOKIE,
  getOperationalProfile,
} from "@/lib/operational-profiles";

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
  const cookieStore = await cookies();

  if (!password) {
    cookieStore.delete(APP_ACCESS_COOKIE);
    cookieStore.delete(OPERATIONAL_PROFILE_COOKIE);
    redirect("/access?setup=missing");
  }

  const submittedPassword = String(formData.get("password") ?? "");
  const submittedToken = await createAppAccessToken(submittedPassword);
  const expectedToken = await createAppAccessToken(password);

  if (submittedToken === expectedToken) {
    cookieStore.set(APP_ACCESS_COOKIE, expectedToken, cookieOptions(60 * 60 * 12));
    cookieStore.delete(APP_ACCESS_ERROR_COOKIE);
    redirect("/access?profile=1");
  }

  cookieStore.set(APP_ACCESS_ERROR_COOKIE, "1", cookieOptions(12));
  redirect("/access");
}

export async function selectOperationalProfile(formData: FormData) {
  const profile = getOperationalProfile(String(formData.get("profile") ?? ""));
  const cookieStore = await cookies();
  const password = getAppAccessPassword();

  if (password) {
    const hasAccess = await isValidAppAccessToken(cookieStore.get(APP_ACCESS_COOKIE)?.value, password);
    if (!hasAccess) {
      redirect("/access");
    }
  }

  if (!profile) {
    redirect("/access?profile=1");
  }

  cookieStore.set(OPERATIONAL_PROFILE_COOKIE, profile.key, cookieOptions(60 * 60 * 24 * 90));
  cookieStore.set(APP_ACCESS_VIEW_COOKIE, profile.defaultView, cookieOptions(60 * 60 * 24 * 90));
  redirect(`/?view=${profile.defaultView}`);
}
