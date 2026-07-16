import { contentPlatformParts, displayContentPlatform } from "./content-platform";
import { formatContentMonthLabel, isPublishDateInMonth, isValidContentMonth } from "./content-month";
import { getClientLabel } from "./client-display";
import { cleanPrefixedTitle } from "./title-display";
import type { Client, ContentItem, TeamMember } from "./types";

export type ContentPlanningExportItem = {
  id: string;
  sequence: number;
  title: string;
  publishDate: string | null;
  publishTime: string | null;
  platform: string;
  platforms: string[];
  format: string | null;
  copy: string | null;
  description: string | null;
  objective: string | null;
  isLong: boolean;
};

export type ContentPlanningExportData = {
  client: Pick<Client, "id" | "name" | "client_code" | "short_name" | "logo_url">;
  month: string;
  monthLabel: string;
  total: number;
  platforms: string[];
  preparedByName: string;
  preparedByEmail: string;
  website: "blendbyte.pt";
  logoDataUrl: string | null;
  items: ContentPlanningExportItem[];
};

export type ExportPreparer = {
  name: string;
  email: string;
};

function normalizeText(value: string | null | undefined) {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue.replace(/\r\n/g, "\n") : null;
}

function normalizeForCompare(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function contentBelongsToPlanningPeriod(
  item: Pick<ContentItem, "publish_date" | "month">,
  month: string,
) {
  return isPublishDateInMonth(item.publish_date, month) || item.month === month;
}

export function sortContentForPlanning(items: ContentItem[]) {
  return [...items].sort((a, b) => {
    if (a.publish_date && !b.publish_date) return -1;
    if (!a.publish_date && b.publish_date) return 1;

    const dateCompare = (a.publish_date ?? "").localeCompare(b.publish_date ?? "");
    if (dateCompare) return dateCompare;

    const timeCompare = (a.publish_time ?? "99:99:99").localeCompare(b.publish_time ?? "99:99:99");
    if (timeCompare) return timeCompare;

    return a.title.localeCompare(b.title, "pt", { sensitivity: "base" });
  });
}

export function contentItemsForPlanningPeriod(items: ContentItem[], clientId: string, month: string) {
  if (!clientId || !isValidContentMonth(month)) return [];
  return sortContentForPlanning(
    items.filter((item) => item.client_id === clientId && contentBelongsToPlanningPeriod(item, month)),
  );
}

export function planningPlatformList(items: Pick<ContentItem, "platform">[]) {
  const platforms = items.flatMap((item) => contentPlatformParts(item.platform));
  return Array.from(new Set(platforms)).sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
}

export function buildContentPlanningItems(items: ContentItem[]): ContentPlanningExportItem[] {
  return sortContentForPlanning(items).map((item, index) => {
    const title = cleanPrefixedTitle(item.title, item.clients);
    const copy = normalizeText(item.copy_text);
    const description = normalizeText(item.description);
    const platform = displayContentPlatform(item.platform);
    const textLength = [title, copy, description].filter(Boolean).join(" ").length;

    return {
      id: item.id,
      sequence: index + 1,
      title,
      publishDate: item.publish_date,
      publishTime: item.publish_time?.slice(0, 5) ?? null,
      platform,
      platforms: contentPlatformParts(item.platform),
      format: normalizeText(item.format),
      copy,
      description,
      objective: null,
      isLong: textLength > 980,
    };
  });
}

export function buildContentPlanningExportData({
  client,
  month,
  items,
  preparedByName,
  preparedByEmail,
  logoDataUrl,
}: {
  client: Pick<Client, "id" | "name" | "client_code" | "short_name" | "logo_url">;
  month: string;
  items: ContentItem[];
  preparedByName: string;
  preparedByEmail: string;
  logoDataUrl?: string | null;
}): ContentPlanningExportData {
  const sortedItems = sortContentForPlanning(items);

  return {
    client,
    month,
    monthLabel: formatContentMonthLabel(month),
    total: sortedItems.length,
    platforms: planningPlatformList(sortedItems),
    preparedByName: preparedByName.trim(),
    preparedByEmail: preparedByEmail.trim(),
    website: "blendbyte.pt",
    logoDataUrl: logoDataUrl ?? null,
    items: buildContentPlanningItems(sortedItems),
  };
}

export function contentPlanningFilename(client: Pick<Client, "name" | "client_code">, month: string) {
  const monthDate = isValidContentMonth(month)
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)
    : null;
  const monthName = monthDate
    ? new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(monthDate)
    : formatContentMonthLabel(month);
  const clientLabel = (client.client_code || client.name).replace(/^\d+_/, "");
  const normalizedClient = normalizeFilenameSegment(clientLabel);
  const normalizedMonth = normalizeFilenameSegment(monthName);
  const year = isValidContentMonth(month) ? month.slice(0, 4) : "";

  return ["Planeamento_Conteudos", normalizedClient, normalizedMonth, year]
    .filter(Boolean)
    .join("_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .concat(".pdf");
}

export function normalizeFilenameSegment(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "Planeamento";
}

export function defaultExportPreparer(
  profileName: string,
  teamMembers: TeamMember[],
): ExportPreparer {
  const normalizedProfileName = normalizeForCompare(profileName);
  const member = teamMembers.find((teamMember) => {
    const normalizedMemberName = normalizeForCompare(teamMember.name);
    return (
      normalizedMemberName === normalizedProfileName ||
      normalizedMemberName.includes(normalizedProfileName) ||
      normalizedProfileName.includes(normalizedMemberName)
    );
  });

  return {
    name: member?.name || profileName,
    email: member?.email ?? "",
  };
}

export function displayExportClient(client: Pick<Client, "name" | "client_code">) {
  return getClientLabel(client);
}
