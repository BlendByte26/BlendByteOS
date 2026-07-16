import { contentPlatformParts, displayContentPlatform } from "./content-platform";
import { formatContentMonthLabel, isPublishDateInMonth, isValidContentMonth } from "./content-month";
import { getClientLabel } from "./client-display";
import { cleanPrefixedTitle } from "./title-display";
import type { Client, ContentItem, TeamMember } from "./types";

export type ContentPlanningLanguage = "pt" | "en";

export type ContentPlanningExportItemInput = {
  id: string;
  title?: string;
  publishDate?: string | null;
  publishTime?: string | null;
  format?: string | null;
  platform?: string | null;
  objective?: string | null;
  copy?: string | null;
  caption?: string | null;
};

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
  copyBlocks: TextBlock[];
  caption: string | null;
  captionParagraphs: string[];
  hashtags: string | null;
  objective: string | null;
  isShort: boolean;
};

export type ContentPlanningExportData = {
  language: ContentPlanningLanguage;
  client: Pick<Client, "id" | "name" | "client_code" | "short_name" | "logo_url">;
  month: string;
  monthLabel: string;
  generatedAtLabel: string;
  documentTitle: string;
  monthlyObjective: string;
  monthlyThemes: string | null;
  clientContactName: string | null;
  approvalDeadline: string | null;
  approvalDeadlineLabel: string | null;
  approvalInstructions: string;
  emailSubject: string;
  emailBody: string;
  total: number;
  platforms: string[];
  preparedByName: string;
  preparedByEmail: string;
  website: string;
  logoDataUrl: string | null;
  items: ContentPlanningExportItem[];
};

export type ContentPlanningExportPayload = {
  clientId: string;
  month: string;
  language: ContentPlanningLanguage;
  documentTitle: string;
  monthlyObjective: string;
  monthlyThemes: string | null;
  preparedByName: string;
  preparedByEmail: string;
  website: string;
  clientContactName: string | null;
  approvalDeadline: string | null;
  approvalInstructions: string;
  emailSubject: string;
  emailBody: string;
  items: ContentPlanningExportItemInput[];
};

export type ExportPreparer = {
  name: string;
  email: string;
};

export type TextBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "marker"; label: string; text: string };

const monthLabelFormatters: Record<ContentPlanningLanguage, Intl.DateTimeFormat> = {
  pt: new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }),
};

const deadlineFormatters: Record<ContentPlanningLanguage, Intl.DateTimeFormat> = {
  pt: new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
};

export const documentTitleDefaults: Record<ContentPlanningLanguage, string> = {
  pt: "Planeamento de Conteúdos",
  en: "Content Plan",
};

function normalizeForCompare(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeExportText(value: string | null | undefined) {
  const normalized = (value ?? "")
    .replace(/\u00ad/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\ufffd/g, "")
    .replace(/[•●▪]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  return normalized || null;
}

export function paragraphsFromText(value: string | null | undefined) {
  return (normalizeExportText(value) ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function dateFromMonth(month: string) {
  if (!isValidContentMonth(month)) return null;
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
}

export function formatPlanningMonth(month: string, language: ContentPlanningLanguage) {
  const date = dateFromMonth(month);
  if (!date) return formatContentMonthLabel(month);
  const label = monthLabelFormatters[language].format(date);
  return language === "pt" ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

export function formatApprovalDate(value: string | null | undefined, language: ContentPlanningLanguage) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return deadlineFormatters[language].format(new Date(year, month - 1, day));
}

export function contentBelongsToPlanningPeriod(
  item: Pick<ContentItem, "publish_date" | "month">,
  month: string,
) {
  return isPublishDateInMonth(item.publish_date, month) || item.month === month;
}

export function sortContentForPlanning(items: ContentItem[]) {
  return [...items].sort((a, b) => sortPlanningValues(a, b));
}

function sortPlanningValues(
  a: Pick<ContentItem, "publish_date" | "publish_time" | "title">,
  b: Pick<ContentItem, "publish_date" | "publish_time" | "title">,
) {
  if (a.publish_date && !b.publish_date) return -1;
  if (!a.publish_date && b.publish_date) return 1;

  const dateCompare = (a.publish_date ?? "").localeCompare(b.publish_date ?? "");
  if (dateCompare) return dateCompare;

  const timeCompare = (a.publish_time ?? "99:99:99").localeCompare(b.publish_time ?? "99:99:99");
  if (timeCompare) return timeCompare;

  return a.title.localeCompare(b.title, "pt", { sensitivity: "base" });
}

export function contentItemsForPlanningPeriod(items: ContentItem[], clientId: string, month: string) {
  if (!clientId || !isValidContentMonth(month)) return [];
  return sortContentForPlanning(
    items.filter((item) => item.client_id === clientId && contentBelongsToPlanningPeriod(item, month)),
  );
}

export function planningPlatformList(items: Array<Pick<ContentItem, "platform"> | { platform: string | null }>) {
  const platforms = items.flatMap((item) => contentPlatformParts(item.platform));
  return Array.from(new Set(platforms)).sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
}

export function buildExportItemInput(item: ContentItem): ContentPlanningExportItemInput {
  return {
    id: item.id,
    title: cleanPrefixedTitle(item.title, item.clients),
    publishDate: item.publish_date,
    publishTime: item.publish_time?.slice(0, 5) ?? null,
    format: item.format,
    platform: displayContentPlatform(item.platform),
    objective: null,
    copy: item.copy_text,
    caption: item.description,
  };
}

const markerPattern = /(?:^|\n|\s)((?:slide|frame|story|cena|card)\s*0*\d+)\s*(?::|-|\.)?/giu;

export function copyBlocksFromText(value: string | null | undefined): TextBlock[] {
  const text = normalizeExportText(value);
  if (!text) return [];
  const prepared = text.replace(markerPattern, (_match, label: string, offset: number) => {
    const prefix = offset === 0 ? "" : "\n\n";
    return `${prefix}${label.toUpperCase()}\n`;
  });
  const lines = prepared.split("\n");
  const blocks: TextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      index += 1;
      continue;
    }

    if (/^(?:SLIDE|FRAME|STORY|CENA|CARD)\s*0*\d+$/i.test(line)) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length) {
        const nextLine = lines[index]?.trim() ?? "";
        if (/^(?:SLIDE|FRAME|STORY|CENA|CARD)\s*0*\d+$/i.test(nextLine)) break;
        body.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "marker", label: line.toUpperCase(), text: body.join("\n").trim() });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index]?.trim() ?? "";
      if (!nextLine || /^(?:SLIDE|FRAME|STORY|CENA|CARD)\s*0*\d+$/i.test(nextLine)) break;
      paragraph.push(nextLine);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks.filter((block) => block.kind === "marker" || block.text.trim());
}

export function splitCaptionAndHashtags(value: string | null | undefined) {
  const text = normalizeExportText(value);
  if (!text) return { caption: null, paragraphs: [], hashtags: null };
  const paragraphs = paragraphsFromText(text);
  if (!paragraphs.length) return { caption: null, paragraphs: [], hashtags: null };

  const last = paragraphs[paragraphs.length - 1] ?? "";
  const hashtagOnly = /^(?:#[\p{L}\p{N}_-]+\s*)+$/u;
  const trailingHashtags = /(?:\s|^)((?:#[\p{L}\p{N}_-]+\s*)+)$/u;

  if (hashtagOnly.test(last)) {
    const body = paragraphs.slice(0, -1);
    return { caption: body.join("\n\n") || null, paragraphs: body, hashtags: last.trim() };
  }

  const match = last.match(trailingHashtags);
  if (match?.[1] && (match.index ?? -1) > 0) {
    const bodyLast = last.slice(0, match.index).trim();
    const body = [...paragraphs.slice(0, -1), bodyLast].filter(Boolean);
    return { caption: body.join("\n\n") || null, paragraphs: body, hashtags: match[1].trim() };
  }

  return { caption: text, paragraphs, hashtags: null };
}

export function buildContentPlanningExportData({
  client,
  month,
  language,
  documentTitle,
  monthlyObjective,
  monthlyThemes,
  preparedByName,
  preparedByEmail,
  website,
  clientContactName,
  approvalDeadline,
  approvalInstructions,
  emailSubject,
  emailBody,
  items,
  logoDataUrl,
}: {
  client: Pick<Client, "id" | "name" | "client_code" | "short_name" | "logo_url">;
  month: string;
  language: ContentPlanningLanguage;
  documentTitle: string;
  monthlyObjective: string;
  monthlyThemes?: string | null;
  preparedByName: string;
  preparedByEmail: string;
  website: string;
  clientContactName?: string | null;
  approvalDeadline?: string | null;
  approvalInstructions: string;
  emailSubject: string;
  emailBody: string;
  items: ContentPlanningExportItemInput[];
  logoDataUrl?: string | null;
}): ContentPlanningExportData {
  const exportItems = items.map((item, index) => {
    const caption = splitCaptionAndHashtags(item.caption);
    const copyBlocks = copyBlocksFromText(item.copy);
    const cleanTitle = normalizeExportText(item.title) ?? `#${index + 1}`;
    const cleanPlatform = normalizeExportText(item.platform) ?? displayContentPlatform(null);
    const textLength = [cleanTitle, item.objective, item.copy, item.caption].filter(Boolean).join(" ").length;

    return {
      id: item.id,
      sequence: index + 1,
      title: cleanTitle,
      publishDate: item.publishDate?.trim() || null,
      publishTime: item.publishTime?.slice(0, 5) || null,
      platform: cleanPlatform,
      platforms: contentPlatformParts(cleanPlatform),
      format: normalizeExportText(item.format),
      copy: normalizeExportText(item.copy),
      copyBlocks,
      caption: caption.caption,
      captionParagraphs: caption.paragraphs,
      hashtags: caption.hashtags,
      objective: normalizeExportText(item.objective),
      isShort: textLength < 700 && copyBlocks.length <= 2 && caption.paragraphs.length <= 2,
    };
  });

  return {
    language,
    client,
    month,
    monthLabel: formatPlanningMonth(month, language),
    generatedAtLabel: deadlineFormatters[language].format(new Date()),
    documentTitle: normalizeExportText(documentTitle) ?? documentTitleDefaults[language],
    monthlyObjective: normalizeExportText(monthlyObjective) ?? "",
    monthlyThemes: normalizeExportText(monthlyThemes),
    clientContactName: normalizeExportText(clientContactName),
    approvalDeadline: approvalDeadline?.trim() || null,
    approvalDeadlineLabel: formatApprovalDate(approvalDeadline, language),
    approvalInstructions: normalizeExportText(approvalInstructions) ?? defaultApprovalInstructions(language, month),
    emailSubject: normalizeExportText(emailSubject) ?? buildEmailDraft({ language, clientName: client.name, month, preparedByName, preparedByEmail, website }).subject,
    emailBody: normalizeExportText(emailBody) ?? buildEmailDraft({ language, clientName: client.name, month, preparedByName, preparedByEmail, website }).body,
    total: exportItems.length,
    platforms: Array.from(new Set(exportItems.flatMap((item) => item.platforms))).sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" })),
    preparedByName: normalizeExportText(preparedByName) ?? "",
    preparedByEmail: normalizeExportText(preparedByEmail) ?? "",
    website: normalizeExportText(website) ?? "blendbyte.pt",
    logoDataUrl: logoDataUrl ?? null,
    items: exportItems,
  };
}

export function defaultApprovalInstructions(language: ContentPlanningLanguage, month: string) {
  const monthLabel = formatPlanningMonth(month, language);
  if (language === "en") {
    return [
      "Please reply with one of the following:",
      "",
      `APPROVED - The ${monthLabel} content plan is approved.`,
      "",
      "APPROVED WITH CHANGES - Identify the content number and requested adjustment.",
      "",
      "REVISION REQUIRED - Indicate the contents that require a new direction.",
      "",
      "Example:",
      "",
      "#03 - Replace the opening sentence.",
      "#08 - Approved without changes.",
    ].join("\n");
  }

  return [
    "Por favor, responda com uma das seguintes opções:",
    "",
    `APROVADO - O planeamento de conteúdos de ${monthLabel} está aprovado.`,
    "",
    "APROVADO COM ALTERAÇÕES - Identifique o número do conteúdo e a alteração pretendida.",
    "",
    "NECESSITA DE REVISÃO - Identifique os conteúdos que necessitam de uma nova direção.",
    "",
    "Exemplo:",
    "",
    "#03 - Substituir a frase de abertura.",
    "#08 - Aprovado sem alterações.",
  ].join("\n");
}

export function buildEmailDraft({
  language,
  clientName,
  month,
  contactName,
  monthlyThemes,
  monthlyObjective,
  approvalDeadline,
  preparedByName,
  preparedByEmail,
  website,
}: {
  language: ContentPlanningLanguage;
  clientName: string;
  month: string;
  contactName?: string | null;
  monthlyThemes?: string | null;
  monthlyObjective?: string | null;
  approvalDeadline?: string | null;
  preparedByName: string;
  preparedByEmail: string;
  website: string;
}) {
  const monthLabel = formatPlanningMonth(month, language);
  const deadline = formatApprovalDate(approvalDeadline, language);
  const themes = normalizeExportText(monthlyThemes) || normalizeExportText(monthlyObjective) || (language === "en" ? "the monthly priorities" : "as prioridades do mês");

  if (language === "en") {
    return {
      subject: `${clientName} - ${monthLabel} Content Plan | Approval`,
      body: [
        `Hello ${contactName?.trim() || clientName},`,
        "",
        `Please find attached the ${clientName} content plan for ${monthLabel}.`,
        "",
        `The plan is structured around ${themes}.`,
        "",
        `To keep the production calendar on schedule, we would appreciate your validation${deadline ? ` by ${deadline}` : ""}, replying with one of the following options:`,
        "",
        "APPROVED",
        "",
        "APPROVED WITH CHANGES - Please identify the content number and the requested adjustment.",
        "",
        "REVISION REQUIRED - Please identify the contents that require a new direction.",
        "",
        "Approval covers the themes, dates, platforms, creative text and captions included in the document. Visual creatives will be developed according to the approved direction.",
        "",
        "Thank you,",
        "",
        preparedByName,
        "BlendByte",
        preparedByEmail,
        website,
      ].join("\n"),
    };
  }

  return {
    subject: `${clientName} - Planeamento de Conteúdos ${monthLabel} | Aprovação`,
    body: [
      `Olá, ${contactName?.trim() || clientName},`,
      "",
      `Enviamos em anexo o planeamento de conteúdos da ${clientName} para ${monthLabel}.`,
      "",
      `O plano está estruturado em torno de ${themes}.`,
      "",
      `Para mantermos o calendário de produção, agradecemos a validação${deadline ? ` até ${deadline}` : ""}, respondendo com uma das seguintes opções:`,
      "",
      "APROVADO",
      "",
      "APROVADO COM ALTERAÇÕES - Identificando o número do conteúdo e a alteração pretendida.",
      "",
      "NECESSITA DE REVISÃO - Identificando os conteúdos que necessitam de uma nova abordagem.",
      "",
      "A aprovação abrange os temas, datas, plataformas, textos dos criativos e legendas incluídos no documento. Os criativos visuais serão desenvolvidos de acordo com a direção aprovada.",
      "",
      "Obrigado,",
      "",
      preparedByName,
      "BlendByte",
      preparedByEmail,
      website,
    ].join("\n"),
  };
}

export function contentPlanningFilename(client: Pick<Client, "name" | "client_code">, month: string) {
  const monthDate = dateFromMonth(month);
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
