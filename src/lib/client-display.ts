import type { Client } from "./types";

type ClientIdentity = Pick<
  Client,
  "name" | "client_code" | "short_name" | "display_order" | "logo_url"
>;

export function getClientLabel(client: Pick<Client, "name" | "client_code">) {
  return client.client_code ? `${client.client_code} — ${client.name}` : client.name;
}

export function getClientInitials(client: Pick<Client, "name" | "short_name">) {
  if (client.short_name) return client.short_name;

  const parts = client.name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function compareClients(a: ClientIdentity, b: ClientIdentity) {
  const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) return orderA - orderB;
  if ((a.client_code ?? "") !== (b.client_code ?? "")) {
    return (a.client_code ?? "").localeCompare(b.client_code ?? "", "pt");
  }

  return a.name.localeCompare(b.name, "pt");
}
