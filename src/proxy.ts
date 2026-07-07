import { NextRequest, NextResponse } from "next/server";
import {
  APP_ACCESS_COOKIE,
  APP_ACCESS_VIEW_COOKIE,
  createAppAccessToken,
  getAppAccessPassword,
  isAppAccessView,
  isProductionEnvironment,
} from "@/lib/app-access";
import {
  OPERATIONAL_PROFILE_COOKIE,
  getOperationalProfile,
} from "@/lib/operational-profiles";

const ACCESS_PATH = "/access";

function withPathHeader(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-blendbyte-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers } });
  const view = request.nextUrl.pathname === "/" ? request.nextUrl.searchParams.get("view") : null;

  if (isAppAccessView(view)) {
    response.cookies.set(APP_ACCESS_VIEW_COOKIE, view, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProductionEnvironment(),
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  return response;
}

function accessUrl(request: NextRequest, setupMissing = false) {
  const url = request.nextUrl.clone();
  url.pathname = ACCESS_PATH;
  url.search = "";

  if (setupMissing) {
    url.searchParams.set("setup", "missing");
  } else {
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return url;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAccessPage = pathname.startsWith(ACCESS_PATH);
  const isApiRoute = pathname.startsWith("/api");
  const password = getAppAccessPassword();

  if (!password) {
    if (isProductionEnvironment()) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Acesso não configurado." }, { status: 503 });
      }

      return isAccessPage ? withPathHeader(request) : NextResponse.redirect(accessUrl(request, true));
    }

    return withPathHeader(request);
  }

  const expectedToken = await createAppAccessToken(password);
  const currentToken = request.cookies.get(APP_ACCESS_COOKIE)?.value;
  const hasAccess = currentToken === expectedToken;
  const currentProfile = getOperationalProfile(request.cookies.get(OPERATIONAL_PROFILE_COOKIE)?.value);

  if (hasAccess) {
    if (isAccessPage) {
      if (
        request.nextUrl.searchParams.get("switch") === "1" ||
        request.nextUrl.searchParams.get("profile") === "1"
      ) {
        return withPathHeader(request);
      }

      if (!currentProfile) {
        const profileUrl = request.nextUrl.clone();
        profileUrl.pathname = ACCESS_PATH;
        profileUrl.search = "";
        profileUrl.searchParams.set("profile", "1");
        return NextResponse.redirect(profileUrl);
      }

      const nextPath = request.nextUrl.searchParams.get("next");
      const redirectUrl =
        nextPath?.startsWith("/") && !nextPath.startsWith("//")
          ? new URL(nextPath, request.url)
          : new URL("/", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (!currentProfile && !isApiRoute) {
      const profileUrl = request.nextUrl.clone();
      profileUrl.pathname = ACCESS_PATH;
      profileUrl.search = "";
      profileUrl.searchParams.set("profile", "1");
      return NextResponse.redirect(profileUrl);
    }

    return withPathHeader(request);
  }

  if (isApiRoute) {
    return NextResponse.json({ error: "Acesso requerido." }, { status: 401 });
  }

  return isAccessPage ? withPathHeader(request) : NextResponse.redirect(accessUrl(request));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
