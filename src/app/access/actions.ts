"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_ERROR_COOKIE,
  APP_ACCESS_VIEW_COOKIE,
  createAppAccessToken,
  getAppAccessPassword,
  isAppAccessView,
  isProductionEnvironment,
} from "@/lib/app-access";

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
  const selectedView = String(formData.get("view") ?? "");
  const view = isAppAccessView(selectedView) ? selectedView : "marketing";
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
    cookieStore.set(APP_ACCESS_VIEW_COOKIE, view, cookieOptions(60 * 60 * 24 * 90));
    cookieStore.delete(APP_ACCESS_ERROR_COOKIE);
    redirect(`/?view=${view}`);
  }

  cookieStore.set(APP_ACCESS_ERROR_COOKIE, "1", cookieOptions(12));
  redirect(`/access?view=${view}`);
}
