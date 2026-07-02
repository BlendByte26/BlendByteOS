import { NextResponse } from "next/server";
import { getSupabaseHealth } from "@/lib/supabase";

export async function GET() {
  const health = await getSupabaseHealth();

  return NextResponse.json({
    app: "BlendByteOS",
    supabase: health.status,
    message:
      health.status === "connected"
        ? "Supabase ligado."
        : health.status === "demo"
          ? "Modo demo: variáveis Supabase em falta."
          : health.message,
  });
}
