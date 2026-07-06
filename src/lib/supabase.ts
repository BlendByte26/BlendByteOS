import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let supabase: SupabaseClient<Database> | null = null;

function getValidSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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

export function getSupabase() {
  const config = getValidSupabaseConfig();

  if (!config) {
    return null;
  }

  if (!supabase) {
    supabase = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

export function requireSupabase() {
  const client = getSupabase();

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
  const client = getSupabase();

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
