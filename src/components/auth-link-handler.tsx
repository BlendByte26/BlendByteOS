"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

function cleanCurrentUrl() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function getTarget(type: string | null) {
  if (type === "invite" || type === "recovery") return "/access/set-password";
  return "/";
}

export function AuthLinkHandler() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const error = params.get("error") ?? params.get("error_code");

    if (error) {
      cleanCurrentUrl();
      window.location.replace("/access?auth=expired");
      return;
    }

    if (!accessToken || !refreshToken) return;

    const sessionTokens = {
      accessToken,
      refreshToken,
    };
    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) setProcessing(true);
    }, 0);

    async function setSupabaseSession() {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        cleanCurrentUrl();
        window.location.replace("/access?setup=missing");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: sessionTokens.accessToken,
        refresh_token: sessionTokens.refreshToken,
      });

      if (cancelled) return;

      cleanCurrentUrl();
      window.location.replace(sessionError ? "/access?auth=expired" : getTarget(type));
    }

    void setSupabaseSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!processing) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-[16px] border border-[rgba(83,183,223,0.32)] bg-[var(--bb-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--bb-charcoal)]">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      A preparar o teu acesso...
    </div>
  );
}
