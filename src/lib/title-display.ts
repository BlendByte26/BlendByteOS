import { getClientLabel } from "./client-display";
import type { Client } from "./types";

type RowClient = Pick<Client, "name" | "client_code" | "short_name" | "display_order" | "logo_url">;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanPrefixedTitle(title: string, client?: RowClient | null) {
  const trimmed = title.trim();
  if (!client) return capitalize(trimmed);

  const candidates = [
    client.name,
    client.short_name,
    client.client_code,
    getClientLabel(client),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    const cleaned = trimmed.replace(
      new RegExp(`^${escapeRegExp(candidate)}\\s*[:\\-–—]\\s*`, "i"),
      "",
    );

    if (cleaned !== trimmed) return capitalize(cleaned);
  }

  return capitalize(trimmed);
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
