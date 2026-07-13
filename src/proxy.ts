import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  APP_ACCESS_VIEW_COOKIE,
  isAppAccessView,
  isProductionEnvironment,
} from "@/lib/app-access";
import { getValidSupabaseConfig } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

const ACCESS_PATH = "/access";
const PUBLIC_INVEST2030_PATHS = ["/invest2030/novo-pedido", "/invest2030/pedidos"];

function createNextResponse(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-blendbyte-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

function withPathHeader(request: NextRequest) {
  const response = createNextResponse(request);
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

function redirectForRole(role: string) {
  return role === "design" ? "/?view=design" : "/?view=marketing";
}

function isPublicInvest2030Path(pathname: string) {
  return PUBLIC_INVEST2030_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAccessPage = pathname.startsWith(ACCESS_PATH);
  const isApiRoute = pathname.startsWith("/api");

  if (isPublicInvest2030Path(pathname) || pathname === "/api/health") {
    return withPathHeader(request);
  }

  const config = getValidSupabaseConfig();

  if (!config) {
    if (isProductionEnvironment()) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Supabase Auth não configurado." }, { status: 503 });
      }

      return isAccessPage ? withPathHeader(request) : NextResponse.redirect(accessUrl(request, true));
    }

    return withPathHeader(request);
  }

  let response = withPathHeader(request);
  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = withPathHeader(request);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const authUserId = claimsData?.claims.sub;

  if (claimsError || !authUserId) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Sessão requerida." }, { status: 401 });
    }

    return isAccessPage ? response : NextResponse.redirect(accessUrl(request));
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("profile_key, role, active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError || !profile || !profile.active) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Perfil operacional inativo ou em falta." }, { status: 403 });
    }

    const inactiveUrl = request.nextUrl.clone();
    inactiveUrl.pathname = ACCESS_PATH;
    inactiveUrl.search = "";
    inactiveUrl.searchParams.set("inactive", "1");
    return isAccessPage ? response : NextResponse.redirect(inactiveUrl);
  }

  if (isAccessPage) {
    return NextResponse.redirect(new URL(redirectForRole(profile.role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
