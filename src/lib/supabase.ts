import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function getValidSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, anonKey };
}

export async function getSupabase() {
  const config = getValidSupabaseConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}

export function getSupabaseAdmin() {
  const config = getValidSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!config || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(config.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireSupabase() {
  const client = await getSupabase();

  if (!client) {
    throw new Error(
      "Supabase não está configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return client;
}

export function isSupabaseConfigured() {
  return Boolean(getValidSupabaseConfig());
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

export type SupabaseHealth =
  | { status: "demo" }
  | { status: "connected" }
  | { status: "schema_missing"; message: string }
  | { status: "connection_error"; message: string };

export function isSupabaseSchemaError(error: unknown) {
  const candidate = error as SupabaseErrorLike;
  const code = candidate?.code ?? "";
  const message = candidate?.message ?? "";

  return (
    ["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"].includes(code) ||
    message.includes("Could not find the table") ||
    message.includes("Could not find a relationship") ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export async function getSupabaseHealth(): Promise<SupabaseHealth> {
  const client = await getSupabase();

  if (!client) return { status: "demo" };

  const { error } = await client
    .from("clients")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (!error) return { status: "connected" };

  if (isSupabaseSchemaError(error)) {
    return {
      status: "schema_missing",
      message: "Supabase ligado, mas a base de dados ainda não está configurada.",
    };
  }

  return {
    status: "connection_error",
    message: error.message,
  };
}
