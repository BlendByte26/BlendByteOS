export const APP_ACCESS_COOKIE = "blendbyteos_app_access";
export const APP_ACCESS_ERROR_COOKIE = "blendbyteos_app_access_error";
export const APP_ACCESS_VIEW_COOKIE = "bb_access_view";

export type AppAccessView = "marketing" | "design";

const TOKEN_PREFIX = "blendbyteos-app-access-v1";

export function getAppAccessPassword() {
  const password = process.env.APP_ACCESS_PASSWORD?.trim();
  return password?.length ? password : null;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function isAppAccessView(value: string | null | undefined): value is AppAccessView {
  return value === "marketing" || value === "design";
}

export async function createAppAccessToken(password: string) {
  const data = new TextEncoder().encode(`${TOKEN_PREFIX}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidAppAccessToken(token: string | undefined, password: string) {
  if (!token) return false;
  return token === (await createAppAccessToken(password));
}
