export type ClientVisualToken = {
  bg: string;
  border: string;
  borderStrong: string;
  text: string;
  dot: string;
  shadow: string;
};

const clientVisualPalette: ClientVisualToken[] = [
  {
    bg: "bg-[rgba(83,183,223,0.14)]",
    border: "border-[rgba(83,183,223,0.34)]",
    borderStrong: "border-l-[rgba(83,183,223,0.72)]",
    text: "text-[#15546c]",
    dot: "bg-[rgba(83,183,223,0.92)]",
    shadow: "shadow-[0_8px_18px_rgba(83,183,223,0.12)]",
  },
  {
    bg: "bg-[rgba(140,101,199,0.13)]",
    border: "border-[rgba(140,101,199,0.3)]",
    borderStrong: "border-l-[rgba(140,101,199,0.68)]",
    text: "text-[#4b3573]",
    dot: "bg-[rgba(140,101,199,0.86)]",
    shadow: "shadow-[0_8px_18px_rgba(140,101,199,0.11)]",
  },
  {
    bg: "bg-[rgba(53,171,132,0.13)]",
    border: "border-[rgba(53,171,132,0.3)]",
    borderStrong: "border-l-[rgba(53,171,132,0.68)]",
    text: "text-[#1f5d49]",
    dot: "bg-[rgba(53,171,132,0.86)]",
    shadow: "shadow-[0_8px_18px_rgba(53,171,132,0.1)]",
  },
  {
    bg: "bg-[rgba(236,176,65,0.15)]",
    border: "border-[rgba(204,139,27,0.28)]",
    borderStrong: "border-l-[rgba(204,139,27,0.68)]",
    text: "text-[#674914]",
    dot: "bg-[rgba(204,139,27,0.84)]",
    shadow: "shadow-[0_8px_18px_rgba(204,139,27,0.1)]",
  },
  {
    bg: "bg-[rgba(221,101,148,0.12)]",
    border: "border-[rgba(221,101,148,0.28)]",
    borderStrong: "border-l-[rgba(221,101,148,0.64)]",
    text: "text-[#74344e]",
    dot: "bg-[rgba(221,101,148,0.82)]",
    shadow: "shadow-[0_8px_18px_rgba(221,101,148,0.1)]",
  },
  {
    bg: "bg-[rgba(126,146,176,0.16)]",
    border: "border-[rgba(126,146,176,0.34)]",
    borderStrong: "border-l-[rgba(126,146,176,0.7)]",
    text: "text-[#34465f]",
    dot: "bg-[rgba(126,146,176,0.86)]",
    shadow: "shadow-[0_8px_18px_rgba(126,146,176,0.1)]",
  },
  {
    bg: "bg-[rgba(51,166,177,0.13)]",
    border: "border-[rgba(51,166,177,0.3)]",
    borderStrong: "border-l-[rgba(51,166,177,0.68)]",
    text: "text-[#1f5960]",
    dot: "bg-[rgba(51,166,177,0.86)]",
    shadow: "shadow-[0_8px_18px_rgba(51,166,177,0.1)]",
  },
  {
    bg: "bg-[rgba(96,116,212,0.12)]",
    border: "border-[rgba(96,116,212,0.28)]",
    borderStrong: "border-l-[rgba(96,116,212,0.66)]",
    text: "text-[#35427b]",
    dot: "bg-[rgba(96,116,212,0.84)]",
    shadow: "shadow-[0_8px_18px_rgba(96,116,212,0.1)]",
  },
  {
    bg: "bg-[rgba(116,159,86,0.13)]",
    border: "border-[rgba(116,159,86,0.3)]",
    borderStrong: "border-l-[rgba(116,159,86,0.68)]",
    text: "text-[#405b2d]",
    dot: "bg-[rgba(116,159,86,0.86)]",
    shadow: "shadow-[0_8px_18px_rgba(116,159,86,0.1)]",
  },
  {
    bg: "bg-[rgba(196,115,82,0.13)]",
    border: "border-[rgba(196,115,82,0.3)]",
    borderStrong: "border-l-[rgba(196,115,82,0.66)]",
    text: "text-[#70422f]",
    dot: "bg-[rgba(196,115,82,0.84)]",
    shadow: "shadow-[0_8px_18px_rgba(196,115,82,0.1)]",
  },
];

export type ClientVisualIdentity = {
  clientCode?: string | null;
  shortName?: string | null;
  clientName?: string | null;
};

export function getClientVisualToken(client: ClientVisualIdentity | null | undefined) {
  const source = client?.clientCode || client?.shortName || client?.clientName || "blendbyte";
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return clientVisualPalette[hash % clientVisualPalette.length] ?? clientVisualPalette[0];
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
