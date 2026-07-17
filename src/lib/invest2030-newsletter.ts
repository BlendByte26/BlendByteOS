import type { Client, Task } from "./types";

export const INVEST2030_NEWSLETTER_TEMPLATE_VERSION = "invest2030-newsletter-v1";
export const INVEST2030_WEBINAR_TEMPLATE_VERSION = "invest2030-webinar-v1";
export const INVEST2030_DEFAULT_CTA_URL = "https://www.invest2030.pt/pt/contactos/";
export const INVEST2030_WEBINAR_SECONDARY_URL = "https://www.invest2030.pt/pt/contactos/";

export type Invest2030CampaignVariant = "newsletter" | "webinar";

export const invest2030NewsletterStatuses = [
  "draft",
  "in_review",
  "ready_to_export",
  "exported",
  "scheduled",
  "sent",
] as const;

export type Invest2030NewsletterStatus = (typeof invest2030NewsletterStatuses)[number];

export const invest2030NewsletterStatusLabels: Record<Invest2030NewsletterStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  ready_to_export: "Pronta para exportar",
  exported: "Exportada",
  scheduled: "Agendada",
  sent: "Enviada",
};

export type Invest2030NewsletterParsedRequest = {
  campaignName: string;
  actionTypes: string;
  requestedBy: string;
  period: string;
  webinarDateTime: string;
  mainObjective: string;
  targetAudience: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  mainMessage: string;
  mandatoryInformation: string;
  informationStatus: string;
  observations: string;
  originalNotes: string;
  missingFields: string[];
  unrecognizedHeadings: string[];
};

export type Invest2030NewsletterStat = {
  label: string;
  value: string;
};

export type Invest2030WebinarSpeaker = {
  name: string;
  organisation: string;
  image_url: string;
};

export type Invest2030NewsletterContent = {
  subject: string;
  preheader: string;
  eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  stats: Invest2030NewsletterStat[];
  intro_paragraphs: string[];
  benefits_title: string;
  benefits: string[];
  audience_section_title: string;
  audience_title: string;
  audience_body: string;
  exclusions: string;
  closing_paragraphs: string[];
  primary_cta_label: string;
  secondary_cta_label: string;
  cta_url: string;
};

export type Invest2030WebinarContent = {
  subject: string;
  preheader: string;
  eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  stats: Invest2030NewsletterStat[];
  intro_paragraphs: string[];
  session_section_title: string;
  session_topics: string[];
  speaker: Invest2030WebinarSpeaker;
  closing_paragraphs: string[];
  primary_cta_label?: string;
  primary_cta_url?: string;
};

export type Invest2030CampaignContent = Invest2030NewsletterContent | Invest2030WebinarContent;

export type Invest2030Newsletter = {
  id: string;
  task_id: string;
  template_version: string;
  parsed_request_json: Invest2030NewsletterParsedRequest;
  content_json: Invest2030NewsletterContent;
  generated_html: string;
  status: Invest2030NewsletterStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  scheduled_note: string | null;
  scheduled_by: string | null;
  scheduled_recorded_at: string | null;
  sent_by: string | null;
  sent_recorded_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ParsedFieldKey = Exclude<
  keyof Invest2030NewsletterParsedRequest,
  "originalNotes" | "missingFields" | "unrecognizedHeadings"
>;

const parsedFieldLabels: Array<[ParsedFieldKey, string]> = [
  ["campaignName", "Nome da campanha"],
  ["actionTypes", "Tipo de ação"],
  ["requestedBy", "Quem está a pedir"],
  ["period", "Período"],
  ["webinarDateTime", "Data/hora do webinar"],
  ["mainObjective", "Objetivo principal"],
  ["targetAudience", "Público-alvo / segmentação"],
  ["primaryButtonText", "Texto do botão principal"],
  ["primaryButtonUrl", "Link do botão principal"],
  ["mainMessage", "Tema / mensagem principal"],
  ["mandatoryInformation", "Informação obrigatória a mencionar"],
  ["informationStatus", "Estado da informação"],
  ["observations", "Observações"],
];

function normalizeHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSearchText(value: string) {
  return normalizeHeading(value).replace(/[^\p{L}\p{N}%]+/gu, " ").trim();
}

export function parseInvest2030TaskNotes(notes: string | null | undefined): Invest2030NewsletterParsedRequest {
  const originalNotes = notes ?? "";
  const emptyFields = Object.fromEntries(
    parsedFieldLabels.map(([key]) => [key, ""]),
  ) as Record<ParsedFieldKey, string>;
  const parsedFields = extractInvest2030TaskFields(originalNotes);

  return {
    ...emptyFields,
    ...parsedFields,
    originalNotes,
    missingFields: [],
    unrecognizedHeadings: [],
  };
}

function extractInvest2030TaskFields(notes: string) {
  const lines = notes.replace(/\r\n/g, "\n").split("\n");
  const headings = new Map<string, { key: ParsedFieldKey; index: number }>();

  lines.forEach((line, index) => {
    const normalized = normalizeHeading(line.replace(/:$/, ""));
    const match = parsedFieldLabels.find(([, label]) => normalizeHeading(label) === normalized);
    if (match) headings.set(normalized, { key: match[0], index });
  });

  const ordered = Array.from(headings.values()).sort((left, right) => left.index - right.index);
  const fields: Partial<Record<ParsedFieldKey, string>> = {};

  ordered.forEach((heading, index) => {
    const next = ordered[index + 1]?.index ?? lines.length;
    fields[heading.key] = lines.slice(heading.index + 1, next).join("\n").trim();
  });

  return fields;
}

function splitInvest2030ActionTypes(value: string) {
  return value
    .split(/,|\be\b|\+|\/|;/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function invest2030ActionTypeIncludes(value: string | null | undefined, actionType: "Newsletter" | "Webinar" | "Redes Sociais") {
  const normalizedAction = normalizeHeading(actionType);
  return splitInvest2030ActionTypes(value ?? "").some((item) => normalizeHeading(item) === normalizedAction);
}

export function isInvest2030NewsletterTask(
  task: Pick<Task, "client_id" | "notes" | "clients"> & { clients?: Pick<Client, "client_code"> | null },
  options: { invest2030ClientId?: string | null } = {},
) {
  const client = task.clients;
  const isInvestClient =
    client?.client_code === "02_I2030" ||
    Boolean(options.invest2030ClientId && task.client_id === options.invest2030ClientId);

  if (!isInvestClient) return false;
  const parsed = parseInvest2030TaskNotes(task.notes);
  if (parsed.actionTypes.trim()) return invest2030ActionTypeIncludes(parsed.actionTypes, "Newsletter");

  const words = normalizeSearchText(task.notes ?? "").split(" ");
  return words.includes("newsletter") && !words.includes("webinar");
}

export function isInvest2030WebinarTask(
  task: Pick<Task, "client_id" | "notes" | "clients"> & { clients?: Pick<Client, "client_code"> | null },
  options: { invest2030ClientId?: string | null } = {},
) {
  const client = task.clients;
  const isInvestClient =
    client?.client_code === "02_I2030" ||
    Boolean(options.invest2030ClientId && task.client_id === options.invest2030ClientId);

  if (!isInvestClient) return false;
  const parsed = parseInvest2030TaskNotes(task.notes);
  if (parsed.actionTypes.trim()) return invest2030ActionTypeIncludes(parsed.actionTypes, "Webinar");

  return normalizeSearchText(task.notes ?? "").split(" ").includes("webinar");
}

export function isInvest2030SocialContentTask(
  task: Pick<Task, "client_id" | "notes" | "clients"> & { clients?: Pick<Client, "client_code"> | null },
  options: { invest2030ClientId?: string | null } = {},
) {
  const client = task.clients;
  const isInvestClient =
    client?.client_code === "02_I2030" ||
    Boolean(options.invest2030ClientId && task.client_id === options.invest2030ClientId);

  if (!isInvestClient) return false;
  const parsed = parseInvest2030TaskNotes(task.notes);
  if (parsed.actionTypes.trim()) {
    return invest2030ActionTypeIncludes(parsed.actionTypes, "Redes Sociais") || invest2030ActionTypeIncludes(parsed.actionTypes, "Newsletter");
  }

  return isInvest2030NewsletterTask(task, options);
}

export function safeInvest2030CtaUrl(rawUrl: string | null | undefined) {
  const value = normalizeCtaUrlInput(rawUrl);
  if (!value || normalizeHeading(value) === "sem link definido") {
    return { url: INVEST2030_DEFAULT_CTA_URL, usedDefault: true };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return { url: parsed.toString(), usedDefault: false };
    }
  } catch {
    return { url: INVEST2030_DEFAULT_CTA_URL, usedDefault: true };
  }

  return { url: INVEST2030_DEFAULT_CTA_URL, usedDefault: true };
}

export function normalizeCtaUrlInput(rawUrl: string | null | undefined) {
  const value = rawUrl?.trim() ?? "";
  const markdownMatch = value.match(/\[[^\]]*?(https?:\/\/[^\]\s]+)[^\]]*?\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownMatch?.[2]) return markdownMatch[2].trim();

  const bareMatch = value.match(/https?:\/\/[^\s)]+/i);
  if (bareMatch?.[0]) return bareMatch[0].trim();

  return value.replace(/^[<(]+|[>),.]+$/g, "").trim();
}

export function initialInvest2030NewsletterContent(
  parsed: Invest2030NewsletterParsedRequest,
): Invest2030NewsletterContent {
  void parsed;
  return {
    subject: "",
    preheader: "",
    eyebrow: "Invest2030",
    hero_title: "",
    hero_subtitle: "",
    stats: [],
    intro_paragraphs: [],
    benefits_title: "O que pode representar para a sua empresa",
    benefits: [],
    audience_section_title: "Enquadramento",
    audience_title: "A quem se destina",
    audience_body: "",
    exclusions: "",
    closing_paragraphs: [],
    primary_cta_label: "Pedir informação",
    secondary_cta_label: "Falar com a Invest2030",
    cta_url: "",
  };
}

export function initialInvest2030WebinarContent(
  parsed: Invest2030NewsletterParsedRequest,
): Invest2030WebinarContent {
  void parsed;
  return {
    subject: "",
    preheader: "",
    eyebrow: "Webinar gratuito",
    hero_title: "",
    hero_subtitle: "",
    stats: [
      { label: "Data", value: "" },
      { label: "Hora", value: "" },
      { label: "Apoio", value: "" },
      { label: "Prazo", value: "" },
    ],
    intro_paragraphs: [],
    session_section_title: "// O que vai ficar claro nesta sessão:",
    session_topics: [],
    speaker: {
      name: "",
      organisation: "",
      image_url: "",
    },
    closing_paragraphs: [],
    primary_cta_label: "Garantir a minha vaga",
    primary_cta_url: safeWebinarPrimaryHref(parsed).url,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
}

function hasHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function assertNoHtml(value: string, label: string, errors: string[]) {
  if (hasHtml(value)) errors.push(`${label} não pode conter HTML.`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assertExactKeys(record: Record<string, unknown>, allowedKeys: readonly string[], errors: string[]) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) errors.push(`Campo não previsto no JSON: ${key}.`);
  }
  for (const key of allowedKeys) {
    if (!(key in record)) errors.push(`Campo obrigatório em falta no JSON: ${key}.`);
  }
}

function assertStringField(record: Record<string, unknown>, key: string, errors: string[]) {
  if (typeof record[key] !== "string") errors.push(`Campo ${key} tem de ser texto.`);
}

function assertStringArrayField(record: Record<string, unknown>, key: string, errors: string[]) {
  if (!Array.isArray(record[key]) || !(record[key] as unknown[]).every((item) => typeof item === "string")) {
    errors.push(`Campo ${key} tem de ser uma lista de textos.`);
  }
}

export function parseInvest2030NewsletterJson(rawJson: string): {
  content: Invest2030NewsletterContent | null;
  errors: string[];
} {
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return { content: null, errors: ["JSON inválido. Confirme se colou apenas JSON válido, sem markdown."] };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { content: null, errors: ["A resposta tem de ser um objeto JSON."] };
  }

  const record = value as Record<string, unknown>;
  const errors: string[] = [];
  const statsValue = Array.isArray(record.stats) ? record.stats : [];
  const stats = statsValue.map((item) => {
    const stat = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      label: stringValue(stat.label),
      value: stringValue(stat.value),
    };
  });

  const content: Invest2030NewsletterContent = {
    subject: stringValue(record.subject),
    preheader: stringValue(record.preheader),
    eyebrow: stringValue(record.eyebrow),
    hero_title: stringValue(record.hero_title),
    hero_subtitle: stringValue(record.hero_subtitle),
    stats,
    intro_paragraphs: stringArray(record.intro_paragraphs),
    benefits_title: stringValue(record.benefits_title),
    benefits: stringArray(record.benefits),
    audience_section_title: stringValue(record.audience_section_title),
    audience_title: stringValue(record.audience_title),
    audience_body: stringValue(record.audience_body),
    exclusions: stringValue(record.exclusions),
    closing_paragraphs: stringArray(record.closing_paragraphs),
    primary_cta_label: stringValue(record.primary_cta_label),
    secondary_cta_label: stringValue(record.secondary_cta_label),
    cta_url: normalizeCtaUrlInput(stringValue(record.cta_url)),
  };

  if (stats.length !== 4) errors.push("O campo stats tem de conter exatamente quatro indicadores.");
  const allowedKeys = new Set([
    "subject",
    "preheader",
    "eyebrow",
    "hero_title",
    "hero_subtitle",
    "stats",
    "intro_paragraphs",
    "benefits_title",
    "benefits",
    "audience_section_title",
    "audience_title",
    "audience_body",
    "exclusions",
    "closing_paragraphs",
    "primary_cta_label",
    "secondary_cta_label",
    "cta_url",
  ]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) errors.push(`Campo não previsto no JSON: ${key}.`);
  }

  const fieldsToCheck = [
    ["Assunto", content.subject],
    ["Preheader", content.preheader],
    ["Eyebrow", content.eyebrow],
    ["Título principal", content.hero_title],
    ["Subtítulo", content.hero_subtitle],
    ["Título dos benefícios", content.benefits_title],
    ["Título da secção de público", content.audience_section_title],
    ["Título do público", content.audience_title],
    ["Texto do público", content.audience_body],
    ["Exclusões", content.exclusions],
    ["Texto do primeiro CTA", content.primary_cta_label],
    ["Texto do segundo CTA", content.secondary_cta_label],
    ["URL dos CTAs", content.cta_url],
    ...content.stats.flatMap((stat, index) => [
      [`Indicador ${index + 1} - valor`, stat.value] as [string, string],
      [`Indicador ${index + 1} - legenda`, stat.label] as [string, string],
    ]),
    ...content.intro_paragraphs.map((item, index) => [`Parágrafo de introdução ${index + 1}`, item] as [string, string]),
    ...content.benefits.map((item, index) => [`Benefício ${index + 1}`, item] as [string, string]),
    ...content.closing_paragraphs.map((item, index) => [`Parágrafo final ${index + 1}`, item] as [string, string]),
  ];
  fieldsToCheck.forEach(([label, fieldValue]) => assertNoHtml(fieldValue, label, errors));

  return { content: errors.length ? null : content, errors };
}

export function parseInvest2030WebinarJson(rawJson: string): {
  content: Invest2030WebinarContent | null;
  errors: string[];
} {
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return { content: null, errors: ["JSON inválido. Confirme se colou apenas JSON válido, sem markdown."] };
  }

  if (!isPlainObject(value)) {
    return { content: null, errors: ["A resposta tem de ser um objeto JSON."] };
  }

  const record = value;
  const errors: string[] = [];
  const allowedKeys = [
    "subject",
    "preheader",
    "eyebrow",
    "hero_title",
    "hero_subtitle",
    "stats",
    "intro_paragraphs",
    "session_section_title",
    "session_topics",
    "speaker",
    "closing_paragraphs",
    "primary_cta_label",
    "primary_cta_url",
  ] as const;
  const optionalKeys = new Set(["primary_cta_label", "primary_cta_url"]);
  const requiredKeys = allowedKeys.filter((key) => !optionalKeys.has(key));
  const stringKeys = ["subject", "preheader", "eyebrow", "hero_title", "hero_subtitle", "session_section_title"] as const;
  const arrayKeys = ["intro_paragraphs", "session_topics", "closing_paragraphs"] as const;

  assertExactKeys(
    Object.fromEntries(Object.entries(record).filter(([key]) => !optionalKeys.has(key))),
    requiredKeys,
    errors,
  );
  if ("primary_cta_url" in record && typeof record.primary_cta_url !== "string") {
    errors.push("Campo primary_cta_url tem de ser texto.");
  }
  if ("primary_cta_label" in record && typeof record.primary_cta_label !== "string") {
    errors.push("Campo primary_cta_label tem de ser texto.");
  }
  stringKeys.forEach((key) => assertStringField(record, key, errors));
  arrayKeys.forEach((key) => assertStringArrayField(record, key, errors));

  if (!Array.isArray(record.stats)) {
    errors.push("Campo stats tem de ser uma lista.");
  }

  const expectedStatLabels = ["Data", "Hora", "Apoio", "Prazo"] as const;
  const stats = Array.isArray(record.stats)
    ? record.stats.map((item, index) => {
        if (!isPlainObject(item)) {
          errors.push(`Indicador ${index + 1} tem de ser um objeto.`);
          return { label: "", value: "" };
        }
        assertExactKeys(item, ["label", "value"], errors);
        if (typeof item.label !== "string") errors.push(`Indicador ${index + 1} precisa de label em texto.`);
        if (typeof item.value !== "string") errors.push(`Indicador ${index + 1} precisa de value em texto.`);
        return {
          label: stringValue(item.label),
          value: stringValue(item.value),
        };
      })
    : [];

  if (stats.length !== 4) errors.push("O campo stats tem de conter exatamente quatro indicadores.");
  expectedStatLabels.forEach((label, index) => {
    if (stats[index]?.label !== label) {
      errors.push(`Indicador ${index + 1} tem de ter a label "${label}".`);
    }
  });

  if (!isPlainObject(record.speaker)) {
    errors.push("Campo speaker tem de ser um objeto.");
  }

  const speakerRecord = isPlainObject(record.speaker) ? record.speaker : {};
  assertExactKeys(speakerRecord, ["name", "organisation", "image_url"], errors);
  ["name", "organisation", "image_url"].forEach((key) => assertStringField(speakerRecord, key, errors));

  const speaker = {
    name: stringValue(speakerRecord.name),
    organisation: stringValue(speakerRecord.organisation),
    image_url: stringValue(speakerRecord.image_url),
  };

  if (speaker.image_url && !validUrl(speaker.image_url)) {
    errors.push("speaker.image_url tem de estar vazio ou ser um URL HTTP/HTTPS válido.");
  }

  const content: Invest2030WebinarContent = {
    subject: stringValue(record.subject),
    preheader: stringValue(record.preheader),
    eyebrow: stringValue(record.eyebrow),
    hero_title: stringValue(record.hero_title),
    hero_subtitle: stringValue(record.hero_subtitle),
    stats,
    intro_paragraphs: stringArray(record.intro_paragraphs),
    session_section_title: stringValue(record.session_section_title),
    session_topics: stringArray(record.session_topics),
    speaker,
    closing_paragraphs: stringArray(record.closing_paragraphs),
    primary_cta_label: stringValue(record.primary_cta_label) || "Garantir a minha vaga",
    primary_cta_url: stringValue(record.primary_cta_url),
  };

  const fieldsToCheck = [
    ["Assunto", content.subject],
    ["Preheader", content.preheader],
    ["Eyebrow", content.eyebrow],
    ["Título principal", content.hero_title],
    ["Subtítulo", content.hero_subtitle],
    ["Título da sessão", content.session_section_title],
    ["Nome do orador", content.speaker.name],
    ["Organização do orador", content.speaker.organisation],
    ...content.stats.flatMap((stat, index) => [
      [`Indicador ${index + 1} - valor`, stat.value] as [string, string],
      [`Indicador ${index + 1} - legenda`, stat.label] as [string, string],
    ]),
    ...content.intro_paragraphs.map((item, index) => [`Parágrafo de introdução ${index + 1}`, item] as [string, string]),
    ...content.session_topics.map((item, index) => [`Tópico da sessão ${index + 1}`, item] as [string, string]),
    ...content.closing_paragraphs.map((item, index) => [`Parágrafo final ${index + 1}`, item] as [string, string]),
  ];
  fieldsToCheck.forEach(([label, fieldValue]) => assertNoHtml(fieldValue, label, errors));

  return { content: errors.length ? null : content, errors };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value: string) {
  const parts = value.split("**");
  return parts
    .map((part, index) => {
      const escaped = escapeHtml(part);
      return index % 2 === 1 ? `<strong>${escaped}</strong>` : escaped;
    })
    .join("");
}

function renderHeroStat(value: string) {
  return renderInline(value).replace(/\n/g, "<br />");
}

function renderMainParagraphs(paragraphs: string[], lastMargin = "24px") {
  const visibleParagraphs = paragraphs.filter((paragraph) => paragraph.trim());
  return visibleParagraphs
    .map((paragraph, index) => {
      const margin = index === visibleParagraphs.length - 1 ? lastMargin : "24px";
      return `<p style="margin:0 0 ${margin} 0;">${renderInline(paragraph)}</p>`;
    })
    .join("\n\n                ");
}

function renderClosingParagraphs(paragraphs: string[]) {
  const visibleParagraphs = paragraphs.filter((paragraph) => paragraph.trim());
  return visibleParagraphs
    .map((paragraph, index) => {
      const margin = index === visibleParagraphs.length - 1 ? "32px" : "26px";
      return `<p style="margin:0 0 ${margin} 0;">${renderInline(paragraph)}</p>`;
    })
    .join("\n\n                ");
}

function renderApprovedBenefitRows(benefits: string[]) {
  const visibleBenefits = benefits.filter((benefit) => benefit.trim());
  return visibleBenefits
    .map((benefit, index) => {
      const isFirst = index === 0;
      const isLast = index === visibleBenefits.length - 1;
      const bulletPadding = isFirst ? "0 0 14px 0" : "14px 0";
      const contentPadding = isFirst ? "0 0 14px 0" : "14px 0";
      const border = isLast ? "" : " border-bottom:1px solid #e4e4e4;";

      return `<tr>
                      <td style="padding:${bulletPadding}; font-size:22px; line-height:24px; color:#1e63b6;" valign="top" width="18">•</td>
                      <td style="padding:${contentPadding}; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:25px; color:#2e2e2e;${border}">${renderInline(benefit)}</td>
                    </tr>`;
    })
    .join("\n                    ");
}

export function generateInvest2030NewsletterHtml(content: Invest2030NewsletterContent) {
  const safeUrl = safeInvest2030CtaUrl(content.cta_url).url;
  const stats = [...content.stats.slice(0, 4)];
  while (stats.length < 4) stats.push({ label: "", value: "" });

  return `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${escapeHtml(content.subject)}</title>
  <style type="text/css">
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f3f1ea;
    }

    a {
      text-decoration: none;
    }

    @media screen and (max-width: 640px) {
      .container {
        width: 100% !important;
      }

      .mobile-padding {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }

      .hero-title {
        font-size: 28px !important;
        line-height: 36px !important;
      }

      .hero-subtitle {
        font-size: 20px !important;
        line-height: 28px !important;
      }

      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .info-cell {
        padding-bottom: 18px !important;
      }

      .button {
        width: 100% !important;
      }

      .button a {
        display: block !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f3f1ea;">
<!-- Preheader invisível -->
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; font-size:1px; line-height:1px;">
  ${escapeHtml(content.preheader)}
</div>

<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f1ea;" width="100%">
  <tbody>
    <tr>
      <td align="center" style="padding:24px 10px;">
        <!-- Container principal -->
        <table border="0" cellpadding="0" cellspacing="0" class="container" role="presentation" style="width:680px; max-width:680px; background-color:#ffffff; border-collapse:collapse;" width="680">
          <tbody>
            <!-- Topo -->
            <tr>
              <td class="mobile-padding" style="padding:24px 36px 16px 36px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#555555;">
                Newsletter Invest2030
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding:0 20px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#18182d; border-collapse:collapse;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" class="mobile-padding" style="padding:56px 34px 28px 34px; font-family:Arial, Helvetica, sans-serif;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px auto;">
                          <tbody>
                            <tr>
                              <td align="center">
                                <img alt="Invest2030" src="https://www.invest2030.pt/pt/wp-content/uploads/2024/04/logo_branco.png" style="display:block; width:150px; max-width:150px; height:auto; border:0; outline:none; text-decoration:none;" width="150" />
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div style="font-size:13px; line-height:18px; letter-spacing:4px; color:#aeb4cc; font-weight:bold; text-transform:uppercase;">${escapeHtml(content.eyebrow)}</div>

                        <div class="hero-title" style="padding-top:24px; font-size:34px; line-height:42px; color:#ffffff; font-weight:bold;">${renderInline(content.hero_title)}</div>

                        <div class="hero-subtitle" style="font-size:29px; line-height:37px; color:#ffffff; font-weight:bold;">${renderInline(content.hero_subtitle)}</div>
                      </td>
                    </tr>

                    <!-- Info blocks -->
                    <tr>
                      <td style="padding:0 28px 46px 28px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                          <tbody>
                            <tr>
                              <td align="center" class="stack-column info-cell" style="font-family:Arial, Helvetica, sans-serif; padding:0 6px;" width="25%">
                                <div style="font-size:12px; line-height:18px; color:#aeb4cc; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">${renderInline(stats[0]?.label ?? "")}</div>
                                <div style="font-size:15px; line-height:21px; color:#ffffff; font-weight:bold; padding-top:8px;">${renderHeroStat(stats[0]?.value ?? "")}</div>
                              </td>
                              <td align="center" class="stack-column info-cell" style="font-family:Arial, Helvetica, sans-serif; padding:0 6px;" width="25%">
                                <div style="font-size:12px; line-height:18px; color:#aeb4cc; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">${renderInline(stats[1]?.label ?? "")}</div>
                                <div style="font-size:15px; line-height:21px; color:#ffffff; font-weight:bold; padding-top:8px;">${renderHeroStat(stats[1]?.value ?? "")}</div>
                              </td>
                              <td align="center" class="stack-column info-cell" style="font-family:Arial, Helvetica, sans-serif; padding:0 6px;" width="25%">
                                <div style="font-size:12px; line-height:18px; color:#aeb4cc; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">${renderInline(stats[2]?.label ?? "")}</div>
                                <div style="font-size:15px; line-height:21px; color:#ffffff; font-weight:bold; padding-top:8px;">${renderHeroStat(stats[2]?.value ?? "")}</div>
                              </td>
                              <td align="center" class="stack-column" style="font-family:Arial, Helvetica, sans-serif; padding:0 6px;" width="25%">
                                <div style="font-size:12px; line-height:18px; color:#aeb4cc; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">${renderInline(stats[3]?.label ?? "")}</div>
                                <div style="font-size:15px; line-height:21px; color:#ffffff; font-weight:bold; padding-top:8px;">${renderHeroStat(stats[3]?.value ?? "")}</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Conteúdo principal -->
            <tr>
              <td class="mobile-padding" style="padding:42px 56px 20px 56px; font-family:Arial, Helvetica, sans-serif; font-size:19px; line-height:31px; color:#2e2e2e;">
                ${renderMainParagraphs(content.intro_paragraphs, "34px")}

                <!-- Botão -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" class="button" role="presentation" style="margin:0 auto;">
                  <tbody>
                    <tr>
                      <td align="center" bgcolor="#1e63b6" style="border-radius:8px;">
                        <a href="${escapeHtml(safeUrl)}" style="display:inline-block; padding:16px 34px; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:20px; color:#ffffff; font-weight:bold; text-transform:uppercase;" target="_blank">${escapeHtml(content.primary_cta_label)}</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Separador -->
            <tr>
              <td class="mobile-padding" style="padding:18px 56px 0 56px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #dddddd; font-size:1px; line-height:1px;"> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Lista -->
            <tr>
              <td class="mobile-padding" style="padding:36px 56px 18px 56px; font-family:Arial, Helvetica, sans-serif;">
                <div style="font-size:15px; line-height:22px; color:#7a7a7a; font-weight:bold; letter-spacing:1px;">// ${escapeHtml(content.benefits_title)}</div>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;" width="100%">
                  <tbody>
                    ${renderApprovedBenefitRows(content.benefits)}
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Separador -->
            <tr>
              <td class="mobile-padding" style="padding:18px 56px 0 56px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #dddddd; font-size:1px; line-height:1px;"> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Enquadramento -->
            <tr>
              <td class="mobile-padding" style="padding:36px 56px 18px 56px; font-family:Arial, Helvetica, sans-serif;">
                <div style="font-size:15px; line-height:22px; color:#7a7a7a; font-weight:bold; letter-spacing:1px;">// ${escapeHtml(content.audience_section_title)}</div>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px; background-color:#f3f1ea;" width="100%">
                  <tbody>
                    <tr>
                      <td style="padding:26px 28px; font-family:Arial, Helvetica, sans-serif;">
                        <div style="font-size:18px; line-height:26px; color:#111111; font-weight:bold; margin-bottom:10px;">${renderInline(content.audience_title)}</div>

                        <div style="font-size:16px; line-height:25px; color:#555555;">${renderInline(content.audience_body)}</div>

                        ${
                          content.exclusions.trim()
                            ? `<div style="font-size:15px; line-height:24px; color:#666666; margin-top:18px;">${renderInline(content.exclusions)}</div>`
                            : ""
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Separador -->
            <tr>
              <td class="mobile-padding" style="padding:18px 56px 0 56px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #dddddd; font-size:1px; line-height:1px;"> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Fecho -->
            <tr>
              <td class="mobile-padding" style="padding:34px 56px 42px 56px; font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:30px; color:#2e2e2e;">
                ${renderClosingParagraphs(content.closing_paragraphs)}

                <table align="center" border="0" cellpadding="0" cellspacing="0" class="button" role="presentation" style="margin:0 auto;">
                  <tbody>
                    <tr>
                      <td align="center" bgcolor="#1e63b6" style="border-radius:8px;">
                        <a href="${escapeHtml(safeUrl)}" style="display:inline-block; padding:16px 34px; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:20px; color:#ffffff; font-weight:bold; text-transform:uppercase;" target="_blank">${escapeHtml(content.secondary_cta_label)}</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#18182d; padding:28px 36px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#b8bdd0; text-align:center;">
                [COMPANY_FULL_ADDRESS]<br />
                <br />
                <br />
                <br />
                Recebeu este email porque está inscrito na nossa lista de comunicações.<br>
                <a href="[UNSUBSCRIBE_URL]" style="color:#ffffff; text-decoration:underline;" target="_blank">Remover subscrição</a>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Fim container -->
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}

function safeWebinarPrimaryHref(parsed: Invest2030NewsletterParsedRequest) {
  const rawUrl = normalizeCtaUrlInput(parsed.primaryButtonUrl);
  if (!rawUrl || normalizeHeading(rawUrl) === "sem link definido") {
    return { url: "#inscricao-webinar-por-definir", valid: false };
  }

  return validUrl(rawUrl) ? { url: new URL(rawUrl).toString(), valid: true } : { url: "#inscricao-webinar-por-definir", valid: false };
}

function renderWebinarButtonRows(primaryUrl: string, primaryLabel: string) {
  return `<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                  <tbody>
                    <tr>
                      <td align="center" bgcolor="#1e63b6" style="border-radius:8px;">
                        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block; padding:15px 28px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:20px; color:#ffffff; font-weight:bold; text-transform:uppercase;" target="_blank">${escapeHtml(primaryLabel)}</a>
                      </td>
                      <td style="width:12px; font-size:1px; line-height:1px;"> </td>
                      <td align="center" bgcolor="#ffffff" style="border:1px solid #1e63b6; border-radius:8px;">
                        <a href="${escapeHtml(INVEST2030_WEBINAR_SECONDARY_URL)}" style="display:inline-block; padding:14px 25px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:20px; color:#1e63b6; font-weight:bold; text-transform:uppercase;" target="_blank">Saber mais</a>
                      </td>
                    </tr>
                  </tbody>
                </table>`;
}

function renderWebinarTopicRows(topics: string[]) {
  return topics
    .filter((topic) => topic.trim())
    .map((topic, index, visibleTopics) => {
      const border = index === visibleTopics.length - 1 ? "" : " border-bottom:1px solid #e4e4e4;";
      return `<tr>
                      <td style="padding:14px 0; font-size:20px; line-height:24px; color:#1e63b6;" valign="top" width="24">•</td>
                      <td style="padding:14px 0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:26px; color:#2e2e2e;${border}">${renderInline(topic)}</td>
                    </tr>`;
    })
    .join("\n                    ");
}

function renderWebinarSpeaker(content: Invest2030WebinarContent) {
  const name = content.speaker.name.trim();
  const organisation = content.speaker.organisation.trim();
  const imageUrl = content.speaker.image_url.trim();

  if (!name && !organisation) return "";

  const imageCell = imageUrl
    ? `<td class="stack-column" style="padding:0 24px 0 0;" valign="top" width="140">
                        <img alt="${escapeHtml(name || "Orador")}" src="${escapeHtml(imageUrl)}" style="display:block; width:120px; max-width:120px; height:auto; border-radius:60px; border:0; outline:none; text-decoration:none;" width="120" />
                      </td>`
    : "";

  return `            <!-- Separador -->
            <tr>
              <td class="mobile-padding" style="padding:18px 56px 0 56px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #dddddd; font-size:1px; line-height:1px;"> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Orador -->
            <tr>
              <td class="mobile-padding" style="padding:36px 56px 18px 56px; font-family:Arial, Helvetica, sans-serif;">
                <div style="font-size:15px; line-height:22px; color:#7a7a7a; font-weight:bold; letter-spacing:1px;">// Orador</div>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:22px;" width="100%">
                  <tbody>
                    <tr>
                      ${imageCell}
                      <td class="stack-column" style="font-family:Arial, Helvetica, sans-serif;" valign="middle">
                        ${name ? `<div style="font-size:22px; line-height:29px; color:#111111; font-weight:bold;">${escapeHtml(name)}</div>` : ""}
                        ${organisation ? `<div style="font-size:16px; line-height:24px; color:#555555; padding-top:5px;">${escapeHtml(organisation)}</div>` : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
`;
}

export function generateInvest2030WebinarHtml(
  content: Invest2030WebinarContent,
  parsed: Invest2030NewsletterParsedRequest,
) {
  const primaryHref = safeInvest2030WebinarRegistrationUrl(parsed, content).url;
  const primaryLabel = content.primary_cta_label?.trim() || "Garantir a minha vaga";
  const stats = [...content.stats.slice(0, 4)];
  while (stats.length < 4) stats.push({ label: "", value: "" });

  return `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${escapeHtml(content.subject)}</title>
  <style type="text/css">
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f3f1ea;
    }

    a {
      text-decoration: none;
    }

    @media screen and (max-width: 640px) {
      .container {
        width: 100% !important;
      }

      .mobile-padding {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }

      .hero-title {
        font-size: 29px !important;
        line-height: 37px !important;
      }

      .hero-subtitle {
        font-size: 20px !important;
        line-height: 28px !important;
      }

      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .info-cell {
        padding-bottom: 18px !important;
      }

      .button-row td {
        display: block !important;
        width: 100% !important;
        margin-bottom: 10px !important;
      }

      .button-row a {
        display: block !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f3f1ea;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; font-size:1px; line-height:1px;">
  ${escapeHtml(content.preheader)}
</div>

<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f1ea;" width="100%">
  <tbody>
    <tr>
      <td align="center" style="padding:24px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" class="container" role="presentation" style="width:680px; max-width:680px; background-color:#ffffff; border-collapse:collapse;" width="680">
          <tbody>
            <tr>
              <td class="mobile-padding" style="padding:24px 36px 16px 36px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#555555;">
                Webinar Invest2030
              </td>
            </tr>

            <tr>
              <td style="padding:0 20px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#18182d; border-collapse:collapse;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" class="mobile-padding" style="padding:52px 34px 28px 34px; font-family:Arial, Helvetica, sans-serif;">
                        <img alt="Invest2030" src="https://www.invest2030.pt/pt/wp-content/uploads/2024/04/logo_branco.png" style="display:block; width:150px; max-width:150px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto 28px auto;" width="150" />
                        <div style="font-size:13px; line-height:18px; letter-spacing:4px; color:#aeb4cc; font-weight:bold; text-transform:uppercase;">${escapeHtml(content.eyebrow)}</div>
                        <div class="hero-title" style="padding-top:24px; font-size:35px; line-height:43px; color:#ffffff; font-weight:bold;">${renderInline(content.hero_title)}</div>
                        <div class="hero-subtitle" style="font-size:22px; line-height:31px; color:#ffffff; font-weight:bold; padding-top:14px;">${renderInline(content.hero_subtitle)}</div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:0 28px 46px 28px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                          <tbody>
                            <tr>
                              ${stats.map((stat, index) => `<td align="center" class="stack-column ${index < 3 ? "info-cell" : ""}" style="font-family:Arial, Helvetica, sans-serif; padding:0 6px;" width="25%">
                                <div style="font-size:12px; line-height:18px; color:#aeb4cc; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">${escapeHtml(stat.label)}</div>
                                <div style="font-size:15px; line-height:21px; color:#ffffff; font-weight:bold; padding-top:8px;">${renderHeroStat(stat.value)}</div>
                              </td>`).join("\n                              ")}
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-padding" style="padding:42px 56px 20px 56px; font-family:Arial, Helvetica, sans-serif; font-size:19px; line-height:31px; color:#2e2e2e;">
                ${renderMainParagraphs(content.intro_paragraphs, "34px")}
                ${renderWebinarButtonRows(primaryHref, primaryLabel).replace("<tr>", '<tr class="button-row">')}
              </td>
            </tr>

            <tr>
              <td class="mobile-padding" style="padding:18px 56px 0 56px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #dddddd; font-size:1px; line-height:1px;"> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td class="mobile-padding" style="padding:36px 56px 18px 56px; font-family:Arial, Helvetica, sans-serif;">
                <div style="font-size:15px; line-height:22px; color:#7a7a7a; font-weight:bold; letter-spacing:1px;">${escapeHtml(content.session_section_title)}</div>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;" width="100%">
                  <tbody>
                    ${renderWebinarTopicRows(content.session_topics)}
                  </tbody>
                </table>
              </td>
            </tr>

${renderWebinarSpeaker(content)}
            <tr>
              <td class="mobile-padding" style="padding:34px 56px 42px 56px; font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:30px; color:#2e2e2e;">
                ${renderClosingParagraphs(content.closing_paragraphs)}
                ${renderWebinarButtonRows(primaryHref, primaryLabel).replace("<tr>", '<tr class="button-row">')}
              </td>
            </tr>

            <tr>
              <td style="background-color:#18182d; padding:28px 36px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#b8bdd0; text-align:center;">
                [COMPANY_FULL_ADDRESS]<br />
                <br />
                <br />
                <br />
                Recebeu este email porque está inscrito na nossa lista de comunicações.<br>
                <a href="[UNSUBSCRIBE_URL]" style="color:#ffffff; text-decoration:underline;" target="_blank">Remover subscrição</a>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}

function validUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateInvest2030Newsletter(
  content: Invest2030NewsletterContent,
  _parsed: Invest2030NewsletterParsedRequest,
) {
  void _parsed;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const html = generateInvest2030NewsletterHtml(content);

  if (!content.subject.trim()) blockers.push("Assunto vazio.");
  if (!content.preheader.trim()) blockers.push("Preheader vazio.");
  if (!content.hero_title.trim()) blockers.push("Título principal vazio.");
  if (!content.hero_subtitle.trim()) blockers.push("Subtítulo vazio.");
  if (content.stats.length !== 4) blockers.push("A newsletter tem de ter exatamente quatro indicadores.");
  if (!content.benefits.some((benefit) => benefit.trim())) blockers.push("Adicione pelo menos um benefício.");
  if (!validUrl(safeInvest2030CtaUrl(content.cta_url).url)) blockers.push("URL final inválido.");
  if (/\{\{|\}\}|__|TODO|LOREM|PLACEHOLDER/i.test(html)) blockers.push("Existem campos técnicos internos ou placeholders por preencher.");
  if (!html.startsWith("<!doctype html>") || !html.endsWith("</html>")) blockers.push("HTML estrutural inválido.");
  if (!html.includes("[COMPANY_FULL_ADDRESS]") || !html.includes("[UNSUBSCRIBE_URL]")) blockers.push("Tags MagicSpider obrigatórias em falta.");
  if (html.includes("Ver no navegador") || html.includes('href=""')) blockers.push("Footer contém elementos proibidos.");

  return { blockers: Array.from(new Set(blockers)), warnings: Array.from(new Set(warnings)) };
}

export function validateInvest2030Webinar(
  content: Invest2030WebinarContent,
  parsed: Invest2030NewsletterParsedRequest,
) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const html = generateInvest2030WebinarHtml(content, parsed);
  const primaryLink = safeInvest2030WebinarRegistrationUrl(parsed, content);

  if (!content.subject.trim()) blockers.push("Assunto vazio.");
  if (!content.preheader.trim()) blockers.push("Preheader vazio.");
  if (!content.hero_title.trim()) blockers.push("Título principal vazio.");
  if (!content.hero_subtitle.trim()) blockers.push("Subtítulo vazio.");
  if (content.stats.length !== 4) blockers.push("O webinar tem de ter exatamente quatro indicadores.");
  ["Data", "Hora", "Apoio", "Prazo"].forEach((label, index) => {
    if (content.stats[index]?.label !== label) blockers.push(`Indicador ${index + 1} tem de ser ${label}.`);
  });
  if (!content.session_topics.some((topic) => topic.trim())) blockers.push("Adicione pelo menos um tópico da sessão.");
  if (content.primary_cta_label !== undefined && !content.primary_cta_label.trim()) blockers.push("Texto do botão principal vazio.");
  if (!primaryLink.valid) blockers.push("Falta definir um link válido para a inscrição no webinar.");
  if (/\{\{|\}\}|__|TODO|LOREM|PLACEHOLDER/i.test(html)) blockers.push("Existem campos técnicos internos ou placeholders por preencher.");
  if (!html.startsWith("<!doctype html>") || !html.endsWith("</html>")) blockers.push("HTML estrutural inválido.");
  if (!html.includes("[COMPANY_FULL_ADDRESS]") || !html.includes("[UNSUBSCRIBE_URL]")) blockers.push("Tags MagicSpider obrigatórias em falta.");
  if (html.includes("Ver no navegador") || html.includes('href=""')) blockers.push("Footer contém elementos proibidos.");
  if (html.includes("<script") || html.includes("<iframe") || html.includes("<form")) blockers.push("HTML contém elementos proibidos para email.");
  if (content.speaker.image_url && !validUrl(content.speaker.image_url)) blockers.push("Imagem do orador inválida.");

  return { blockers: Array.from(new Set(blockers)), warnings: Array.from(new Set(warnings)) };
}

export function buildInvest2030GptBriefing(
  parsed: Invest2030NewsletterParsedRequest,
  variant: Invest2030CampaignVariant = "newsletter",
) {
  const campaignType = variant === "webinar" ? "campanha de webinar" : "newsletter";
  return `Gera o JSON desta ${campaignType} com base no briefing integral abaixo.
Usa as instruções permanentes deste GPT e devolve exclusivamente JSON válido.

${parsed.originalNotes || "Sem briefing original."}

Não adicionar parsing, resumos ou reorganização.
Não omitir nenhuma parte das notas da tarefa.
Não é necessário incluir novamente o schema, porque está nas instruções permanentes do GPT personalizado.`;
}

export function invest2030NewsletterFilename(campaignName: string) {
  const slug = normalizeHeading(campaignName || "newsletter")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `invest2030-${slug || "newsletter"}.html`;
}

export function invest2030CampaignFilename(variant: Invest2030CampaignVariant, campaignName: string) {
  const fallback = variant === "webinar" ? "webinar" : "newsletter";
  const slug = normalizeHeading(campaignName || fallback)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `invest2030-${slug || fallback}.html`;
}

export function safeInvest2030WebinarRegistrationUrl(
  parsed: Invest2030NewsletterParsedRequest,
  content?: Pick<Invest2030WebinarContent, "primary_cta_url">,
) {
  const editedUrl = normalizeCtaUrlInput(content?.primary_cta_url ?? "");
  return editedUrl ? safeWebinarPrimaryHref({ ...parsed, primaryButtonUrl: editedUrl }) : safeWebinarPrimaryHref(parsed);
}
