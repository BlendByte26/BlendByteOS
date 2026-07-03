import { NextRequest, NextResponse } from "next/server";
import {
  APP_ACCESS_COOKIE,
  createAppAccessToken,
  getAppAccessPassword,
  isProductionEnvironment,
} from "@/lib/app-access";

const ACCESS_PATH = "/access";

function withPathHeader(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-blendbyte-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
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

export async function middleware(request: NextRequest) {
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

  if (hasAccess) {
    if (isAccessPage) {
      const nextPath = request.nextUrl.searchParams.get("next");
      const redirectUrl =
        nextPath?.startsWith("/") && !nextPath.startsWith("//")
          ? new URL(nextPath, request.url)
          : new URL("/", request.url);
      return NextResponse.redirect(redirectUrl);
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
