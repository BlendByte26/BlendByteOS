"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;

  return createBrowserClient<Database>(url, anonKey);
}
