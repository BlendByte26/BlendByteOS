import { clientColorKeys, type ClientColorKey } from "@/lib/types";

export type ClientVisualToken = {
  bg: string;
  border: string;
  borderStrong: string;
  text: string;
  dot: string;
  softDot: string;
  shadow: string;
};

export const clientColorLabels: Record<ClientColorKey, string> = {
  slate: "Slate",
  blue: "Azul",
  cyan: "Ciano",
  green: "Verde",
  emerald: "Esmeralda",
  lime: "Lima",
  yellow: "Amarelo",
  orange: "Laranja",
  red: "Vermelho",
  pink: "Rosa",
  purple: "Roxo",
  violet: "Violeta",
};

export const clientColorPalette: Record<ClientColorKey, ClientVisualToken> = {
  slate: {
    bg: "bg-slate-100/80",
    border: "border-slate-300/70",
    borderStrong: "border-l-slate-500",
    text: "text-slate-700",
    dot: "bg-slate-500",
    softDot: "bg-slate-200",
    shadow: "shadow-[0_8px_18px_rgba(71,85,105,0.10)]",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    borderStrong: "border-l-blue-500",
    text: "text-blue-700",
    dot: "bg-blue-500",
    softDot: "bg-blue-100",
    shadow: "shadow-[0_8px_18px_rgba(59,130,246,0.11)]",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    borderStrong: "border-l-cyan-500",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
    softDot: "bg-cyan-100",
    shadow: "shadow-[0_8px_18px_rgba(6,182,212,0.11)]",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    borderStrong: "border-l-green-500",
    text: "text-green-700",
    dot: "bg-green-500",
    softDot: "bg-green-100",
    shadow: "shadow-[0_8px_18px_rgba(34,197,94,0.10)]",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    borderStrong: "border-l-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    softDot: "bg-emerald-100",
    shadow: "shadow-[0_8px_18px_rgba(16,185,129,0.10)]",
  },
  lime: {
    bg: "bg-lime-50",
    border: "border-lime-200",
    borderStrong: "border-l-lime-500",
    text: "text-lime-800",
    dot: "bg-lime-500",
    softDot: "bg-lime-100",
    shadow: "shadow-[0_8px_18px_rgba(132,204,22,0.10)]",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    borderStrong: "border-l-yellow-500",
    text: "text-yellow-800",
    dot: "bg-yellow-500",
    softDot: "bg-yellow-100",
    shadow: "shadow-[0_8px_18px_rgba(234,179,8,0.11)]",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    borderStrong: "border-l-orange-500",
    text: "text-orange-700",
    dot: "bg-orange-500",
    softDot: "bg-orange-100",
    shadow: "shadow-[0_8px_18px_rgba(249,115,22,0.11)]",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    borderStrong: "border-l-red-500",
    text: "text-red-700",
    dot: "bg-red-500",
    softDot: "bg-red-100",
    shadow: "shadow-[0_8px_18px_rgba(239,68,68,0.11)]",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    borderStrong: "border-l-pink-500",
    text: "text-pink-700",
    dot: "bg-pink-500",
    softDot: "bg-pink-100",
    shadow: "shadow-[0_8px_18px_rgba(236,72,153,0.10)]",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    borderStrong: "border-l-purple-500",
    text: "text-purple-700",
    dot: "bg-purple-500",
    softDot: "bg-purple-100",
    shadow: "shadow-[0_8px_18px_rgba(168,85,247,0.10)]",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    borderStrong: "border-l-violet-500",
    text: "text-violet-700",
    dot: "bg-violet-500",
    softDot: "bg-violet-100",
    shadow: "shadow-[0_8px_18px_rgba(139,92,246,0.11)]",
  },
};

export type ClientVisualIdentity = {
  clientCode?: string | null;
  shortName?: string | null;
  clientName?: string | null;
  colorKey?: string | null;
};

export function normalizeClientColorKey(value: string | null | undefined): ClientColorKey {
  return clientColorKeys.includes(value as ClientColorKey) ? (value as ClientColorKey) : "slate";
}

export function getClientVisualToken(client: ClientVisualIdentity | null | undefined) {
  return clientColorPalette[normalizeClientColorKey(client?.colorKey)];
}

export function getClientDisplayCode(client: ClientVisualIdentity) {
  if (client.clientCode) return client.clientCode;
  if (client.shortName) return client.shortName;
  if (!client.clientName) return "—";

  const parts = client.clientName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts.length > 1 ? parts.slice(0, 2).map((part) => part[0]).join("") : parts[0]?.slice(0, 4) ?? "—")
    .toUpperCase();
}
