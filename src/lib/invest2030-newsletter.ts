import type { Client, Task } from "./types";

export const INVEST2030_NEWSLETTER_TEMPLATE_VERSION = "invest2030-newsletter-v1";
export const INVEST2030_DEFAULT_CTA_URL = "https://www.invest2030.pt/pt/contactos/";

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
  ["mainObjective", "Objetivo principal"],
  ["targetAudience", "Público-alvo / segmentação"],
  ["primaryButtonText", "Texto do botão principal"],
  ["primaryButtonUrl", "Link do botão principal"],
  ["mainMessage", "Tema / mensagem principal"],
  ["mandatoryInformation", "Informação obrigatória a mencionar"],
  ["informationStatus", "Estado da informação"],
  ["observations", "Observações"],
];

const parsedFieldLabelMap = new Map(
  parsedFieldLabels.map(([key, label]) => [normalizeHeading(label), key]),
);

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

function compact(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

export function parseInvest2030TaskNotes(notes: string | null | undefined): Invest2030NewsletterParsedRequest {
  const originalNotes = notes ?? "";
  const fields = Object.fromEntries(
    parsedFieldLabels.map(([key]) => [key, ""]),
  ) as Record<ParsedFieldKey, string>;
  const seen = new Set<ParsedFieldKey>();
  const unrecognizedHeadings: string[] = [];
  let currentKey: ParsedFieldKey | null = null;

  for (const rawLine of originalNotes.replace(/\r\n/g, "\n").split("\n")) {
    const colonIndex = rawLine.indexOf(":");
    const possibleHeading = colonIndex >= 0 ? rawLine.slice(0, colonIndex).trim() : "";
    const matchedKey = possibleHeading ? parsedFieldLabelMap.get(normalizeHeading(possibleHeading)) : undefined;

    if (matchedKey) {
      currentKey = matchedKey;
      seen.add(matchedKey);
      const inlineValue = rawLine.slice(colonIndex + 1);
      fields[currentKey] = fields[currentKey] ? `${fields[currentKey]}\n${inlineValue}` : inlineValue;
      continue;
    }

    if (
      possibleHeading &&
      rawLine.trim().endsWith(":") &&
      !rawLine.trim().startsWith("http")
    ) {
      unrecognizedHeadings.push(possibleHeading);
    }

    if (currentKey) {
      fields[currentKey] = fields[currentKey] ? `${fields[currentKey]}\n${rawLine}` : rawLine;
    }
  }

  const missingFields = parsedFieldLabels
    .filter(([key]) => !seen.has(key))
    .map(([, label]) => label);

  return {
    campaignName: compact(fields.campaignName),
    actionTypes: compact(fields.actionTypes),
    requestedBy: compact(fields.requestedBy),
    period: compact(fields.period),
    mainObjective: compact(fields.mainObjective),
    targetAudience: compact(fields.targetAudience),
    primaryButtonText: compact(fields.primaryButtonText),
    primaryButtonUrl: compact(fields.primaryButtonUrl),
    mainMessage: compact(fields.mainMessage),
    mandatoryInformation: compact(fields.mandatoryInformation),
    informationStatus: compact(fields.informationStatus),
    observations: compact(fields.observations),
    originalNotes,
    missingFields,
    unrecognizedHeadings: Array.from(new Set(unrecognizedHeadings)),
  };
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
  return normalizeHeading(parsed.actionTypes)
    .split(/[,;/|]+|\be\b/)
    .map((item) => item.trim())
    .some((item) => item === "newsletter");
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
  const cta = safeInvest2030CtaUrl(parsed.primaryButtonUrl);
  return {
    subject: parsed.campaignName,
    preheader: parsed.mainObjective,
    eyebrow: "Invest2030",
    hero_title: parsed.mainMessage || parsed.campaignName,
    hero_subtitle: parsed.mainObjective,
    stats: [
      { label: "Apoio", value: "" },
      { label: "Prazo", value: parsed.period },
      { label: "Destino", value: "" },
      { label: "Condição", value: "" },
    ],
    intro_paragraphs: [parsed.mandatoryInformation || parsed.mainMessage].filter(Boolean),
    benefits_title: "O que pode representar para a sua empresa",
    benefits: [],
    audience_section_title: "Enquadramento",
    audience_title: "A quem se destina",
    audience_body: parsed.targetAudience,
    exclusions: "",
    closing_paragraphs: [parsed.observations].filter(Boolean),
    primary_cta_label: parsed.primaryButtonText || "Pedir informação",
    secondary_cta_label: "Falar com a Invest2030",
    cta_url: cta.url,
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
    cta_url: safeInvest2030CtaUrl(stringValue(record.cta_url)).url,
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

function renderParagraphs(paragraphs: string[], color = "#364047") {
  return paragraphs
    .filter((paragraph) => paragraph.trim())
    .map(
      (paragraph) => `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.62;color:${color};">${renderInline(paragraph)}</p>`,
    )
    .join("\n");
}

function renderBenefits(benefits: string[]) {
  return benefits
    .filter((benefit) => benefit.trim())
    .map(
      (benefit) => `<tr>
  <td width="26" valign="top" style="padding:0 0 12px;">
    <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#1e63b6;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;text-align:center;font-weight:bold;">✓</span>
  </td>
  <td style="padding:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#383c48;">${renderInline(benefit)}</td>
</tr>`,
    )
    .join("\n");
}

export function generateInvest2030NewsletterHtml(content: Invest2030NewsletterContent) {
  const safeUrl = safeInvest2030CtaUrl(content.cta_url).url;
  const stats = [...content.stats.slice(0, 4)];
  while (stats.length < 4) stats.push({ label: "", value: "" });

  return `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${escapeHtml(content.subject)}</title>
  <style>
    body { margin:0; padding:0; background:#f3f1ea; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    @media only screen and (max-width: 480px) {
      .outer { width:100% !important; }
      .container { width:100% !important; max-width:100% !important; }
      .px { padding-left:24px !important; padding-right:24px !important; }
      .hero-title { font-size:30px !important; line-height:1.08 !important; }
      .stack { display:block !important; width:100% !important; }
      .stat-cell { display:block !important; width:100% !important; padding:0 0 14px !important; }
      .mobile-center { text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" class="outer" width="100%" bgcolor="#f3f1ea" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:34px 12px;">
        <table role="presentation" class="container" width="680" cellpadding="0" cellspacing="0" style="width:680px;max-width:680px;background:#ffffff;border-radius:0;overflow:hidden;">
          <tr>
            <td bgcolor="#18182d" class="px" style="padding:30px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <img src="https://www.invest2030.pt/assets/logo_branco.png" width="188" alt="Invest2030" style="display:block;width:188px;max-width:188px;height:auto;">
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#ffffff;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(content.eyebrow)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#18182d" class="px" style="padding:46px 44px 42px;background:#18182d;">
              <h1 class="hero-title" style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:42px;line-height:1.1;color:#ffffff;font-weight:800;">${renderInline(content.hero_title)}</h1>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.55;color:#e4e6f4;">${renderInline(content.hero_subtitle)}</p>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:30px 44px 12px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${stats
                    .map(
                      (stat) => `<td class="stat-cell" width="25%" valign="top" style="padding:0 12px 18px 0;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.12;color:#1e63b6;font-weight:800;">${renderInline(stat.value)}</div>
                    <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;color:#5f6472;font-weight:bold;text-transform:uppercase;">${renderInline(stat.label)}</div>
                  </td>`,
                    )
                    .join("\n")}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:18px 44px 12px;background:#ffffff;">
              ${renderParagraphs(content.intro_paragraphs)}
            </td>
          </tr>
          <tr>
            <td align="center" class="px" style="padding:8px 44px 34px;background:#ffffff;">
              <a href="${escapeHtml(safeUrl)}" target="_blank" style="display:inline-block;background:#1e63b6;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1;font-weight:800;padding:16px 28px;border-radius:3px;">${escapeHtml(content.primary_cta_label)}</a>
            </td>
          </tr>
          <tr>
            <td class="px" bgcolor="#f6f7fb" style="padding:34px 44px;">
              <h2 style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.22;color:#18182d;font-weight:800;">${renderInline(content.benefits_title)}</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${renderBenefits(content.benefits)}
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:34px 44px;background:#ffffff;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#1e63b6;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(content.audience_section_title)}</div>
              <h2 style="margin:8px 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:#18182d;font-weight:800;">${renderInline(content.audience_title)}</h2>
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.62;color:#383c48;">${renderInline(content.audience_body)}</p>
              ${
                content.exclusions.trim()
                  ? `<div style="margin-top:18px;padding:16px 18px;background:#f3f1ea;border-left:4px solid #1e63b6;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#383c48;"><strong>Exclusões e notas:</strong> ${renderInline(content.exclusions)}</div>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:14px 44px 8px;background:#ffffff;">
              ${renderParagraphs(content.closing_paragraphs)}
            </td>
          </tr>
          <tr>
            <td align="center" class="px" style="padding:10px 44px 42px;background:#ffffff;">
              <a href="${escapeHtml(safeUrl)}" target="_blank" style="display:inline-block;background:#1e63b6;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1;font-weight:800;padding:16px 28px;border-radius:3px;">${escapeHtml(content.secondary_cta_label)}</a>
            </td>
          </tr>
          <tr>
            <td bgcolor="#18182d" class="px" style="padding:26px 44px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#ffffff;">[COMPANY_FULL_ADDRESS]</p>
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#d8daea;">Recebeu este email porque manifestou interesse em comunicações da Invest2030 ou porque o seu contacto consta da nossa base de dados empresarial.</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#d8daea;"><a href="[UNSUBSCRIBE_URL]" target="_blank" style="color:#ffffff;text-decoration:underline;">Remover subscrição</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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

function allContentText(content: Invest2030NewsletterContent) {
  return normalizeSearchText(
    [
      content.subject,
      content.preheader,
      content.eyebrow,
      content.hero_title,
      content.hero_subtitle,
      ...content.stats.flatMap((stat) => [stat.label, stat.value]),
      ...content.intro_paragraphs,
      content.benefits_title,
      ...content.benefits,
      content.audience_section_title,
      content.audience_title,
      content.audience_body,
      content.exclusions,
      ...content.closing_paragraphs,
      content.primary_cta_label,
      content.secondary_cta_label,
    ].join(" "),
  );
}

function normalizedIncludes(haystack: string, needle: string) {
  const normalizedNeedle = normalizeSearchText(needle);
  return Boolean(normalizedNeedle && haystack.includes(normalizedNeedle));
}

function extractMatches(value: string, regex: RegExp) {
  return Array.from(value.matchAll(regex), (match) => match[0]).filter(Boolean);
}

function factualRequestText(parsed: Invest2030NewsletterParsedRequest) {
  return [
    parsed.mandatoryInformation,
    parsed.targetAudience,
    parsed.mainMessage,
  ].join(" ");
}

function observationsIndicateExclusions(value: string) {
  const normalized = normalizeSearchText(value);
  return (
    normalized.includes("exclu") ||
    normalized.includes("fica de fora") ||
    normalized.includes("ficam de fora") ||
    normalized.includes("nao abrang") ||
    normalized.includes("nao eleg")
  );
}

export function validateInvest2030Newsletter(
  content: Invest2030NewsletterContent,
  parsed: Invest2030NewsletterParsedRequest,
) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const html = generateInvest2030NewsletterHtml(content);
  const text = allContentText(content);

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

  const requestText = factualRequestText(parsed);

  for (const date of extractMatches(requestText, /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b/g)) {
    if (!normalizedIncludes(text, date)) warnings.push(`Data aparentemente ausente no conteúdo: ${date}.`);
  }

  for (const percentage of extractMatches(requestText, /\b\d+(?:[,.]\d+)?\s?%/g)) {
    if (!normalizedIncludes(text, percentage)) warnings.push(`Percentagem aparentemente ausente no conteúdo: ${percentage}.`);
  }

  const mandatoryTokens = normalizeSearchText(parsed.mandatoryInformation)
    .split(" ")
    .filter((token) => token.length >= 5)
    .slice(0, 8);
  if (mandatoryTokens.length && mandatoryTokens.filter((token) => text.includes(token)).length < Math.min(2, mandatoryTokens.length)) {
    warnings.push("Informação obrigatória aparentemente ausente.");
  }

  if (observationsIndicateExclusions(parsed.observations) && !normalizeSearchText(content.exclusions)) {
    warnings.push("Exclusões nas observações aparentemente ausentes.");
  }

  if (normalizeHeading(parsed.informationStatus) !== "informacao completa") {
    warnings.push(`Estado da informação no pedido: ${parsed.informationStatus || "não definido"}.`);
  }

  return { blockers: Array.from(new Set(blockers)), warnings: Array.from(new Set(warnings)) };
}

export function buildInvest2030GptBriefing(parsed: Invest2030NewsletterParsedRequest) {
  const cta = safeInvest2030CtaUrl(parsed.primaryButtonUrl);
  return `Tarefa: preparar conteúdo para uma newsletter Invest2030.

Usa português europeu, tom claro, comercial e rigoroso. Não inventes informação.
Preserva exatamente datas, percentagens, localidades, CAEs, prazos e condições.
Inclui toda a informação obrigatória. Distingue condições elegíveis de exclusões.
Objetivo comercial: ${parsed.mainObjective || "gerar contactos qualificados para a Invest2030"}.

Pedido recebido:
- Nome da campanha: ${parsed.campaignName}
- Tipo de ação: ${parsed.actionTypes}
- Quem está a pedir: ${parsed.requestedBy}
- Período: ${parsed.period}
- Objetivo principal: ${parsed.mainObjective}
- Público-alvo / segmentação: ${parsed.targetAudience}
- Texto do botão principal: ${parsed.primaryButtonText}
- Link final dos botões: ${cta.url}${cta.usedDefault ? " (link de contacto aplicado automaticamente)" : ""}
- Tema / mensagem principal: ${parsed.mainMessage}
- Informação obrigatória a mencionar: ${parsed.mandatoryInformation}
- Estado da informação: ${parsed.informationStatus}
- Observações: ${parsed.observations}

Regras:
- Não uses HTML.
- Não uses markdown.
- Devolve apenas JSON válido, sem texto antes ou depois.
- O array "stats" tem obrigatoriamente quatro elementos.
- cta_url deve conter apenas o URL bruto, sem markdown, parênteses ou texto adicional.
- Se uma informação não estiver no pedido, deixa o campo neutro e factual.

Schema obrigatório:
{
  "subject": "",
  "preheader": "",
  "eyebrow": "",
  "hero_title": "",
  "hero_subtitle": "",
  "stats": [
    { "label": "", "value": "" },
    { "label": "", "value": "" },
    { "label": "", "value": "" },
    { "label": "", "value": "" }
  ],
  "intro_paragraphs": [],
  "benefits_title": "",
  "benefits": [],
  "audience_section_title": "",
  "audience_title": "",
  "audience_body": "",
  "exclusions": "",
  "closing_paragraphs": [],
  "primary_cta_label": "",
  "secondary_cta_label": "",
  "cta_url": ""
}`;
}

export function invest2030NewsletterFilename(campaignName: string) {
  const slug = normalizeHeading(campaignName || "newsletter")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `invest2030-${slug || "newsletter"}.html`;
}
