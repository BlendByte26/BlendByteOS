import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { ContentPlanningPdfDocument } from "@/components/content-planning-pdf";
import {
  buildContentPlanningExportData,
  contentItemsForPlanningPeriod,
  contentPlanningFilename,
  defaultApprovalInstructions,
  documentTitleDefaults,
  type ContentPlanningExportItemInput,
  type ContentPlanningLanguage,
} from "@/lib/content-planning-export";
import { isValidContentMonth } from "@/lib/content-month";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { getClients, getContentItems } from "@/lib/data";

export const runtime = "nodejs";

type ExportPayload = {
  clientId?: unknown;
  month?: unknown;
  language?: unknown;
  documentTitle?: unknown;
  monthlyObjective?: unknown;
  monthlyThemes?: unknown;
  website?: unknown;
  clientContactName?: unknown;
  approvalDeadline?: unknown;
  approvalInstructions?: unknown;
  emailSubject?: unknown;
  emailBody?: unknown;
  items?: unknown;
  preparedByName?: unknown;
  preparedByEmail?: unknown;
};

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function exportItemInputs(value: unknown): ContentPlanningExportItemInput[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const id = stringValue(candidate.id);
    if (!id || seen.has(id)) return [];
    seen.add(id);

    return [{
      id,
      title: stringValue(candidate.title),
      publishDate: nullableString(candidate.publishDate),
      publishTime: nullableString(candidate.publishTime),
      format: nullableString(candidate.format),
      platform: nullableString(candidate.platform),
      objective: nullableString(candidate.objective),
      copy: nullableString(candidate.copy),
      caption: nullableString(candidate.caption),
    }];
  });
}

function nullableString(value: unknown) {
  const cleanValue = stringValue(value);
  return cleanValue || null;
}

function planningLanguage(value: unknown): ContentPlanningLanguage {
  return value === "en" ? "en" : "pt";
}

function contentDispositionFilename(filename: string) {
  return `attachment; filename="${filename.replace(/"/g, "")}"`;
}

async function localImageDataUrl(src: string) {
  if (!src.startsWith("/")) return null;
  const cleanPath = path.normalize(src).replace(/^(\.\.(\/|\\|$))+/, "");
  const ext = path.extname(cleanPath).toLowerCase();
  const mimeByExt: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mime = mimeByExt[ext];
  if (!mime) return null;

  const filePath = path.join(process.cwd(), "public", cleanPath);
  const buffer = await readFile(filePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function remoteImageDataUrl(src: string) {
  if (!/^https?:\/\//i.test(src)) return null;
  const response = await fetch(src, { cache: "no-store" });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) return null;

  const arrayBuffer = await response.arrayBuffer();
  return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
}

async function resolveLogoDataUrl(logoUrl: string | null) {
  if (!logoUrl) return null;

  try {
    return (await localImageDataUrl(logoUrl)) ?? (await remoteImageDataUrl(logoUrl));
  } catch (error) {
    console.warn("Nao foi possivel carregar o logotipo do cliente para o PDF.", error);
    return null;
  }
}

export async function POST(request: Request) {
  await requireCurrentOperationalProfile();

  let payload: ExportPayload;
  try {
    payload = (await request.json()) as ExportPayload;
  } catch {
    return jsonError("Pedido inválido.");
  }

  const clientId = stringValue(payload.clientId);
  const month = stringValue(payload.month);
  const language = planningLanguage(payload.language);
  const exportItems = exportItemInputs(payload.items);
  const preparedByName = stringValue(payload.preparedByName);
  const preparedByEmail = stringValue(payload.preparedByEmail);
  const documentTitle = stringValue(payload.documentTitle) || documentTitleDefaults[language];
  const monthlyObjective = stringValue(payload.monthlyObjective);
  const monthlyThemes = nullableString(payload.monthlyThemes);
  const website = stringValue(payload.website) || "blendbyte.pt";
  const clientContactName = nullableString(payload.clientContactName);
  const approvalDeadline = nullableString(payload.approvalDeadline);
  const approvalInstructions = stringValue(payload.approvalInstructions) || defaultApprovalInstructions(language, month);
  const emailSubject = stringValue(payload.emailSubject);
  const emailBody = stringValue(payload.emailBody);

  if (!clientId) return jsonError("Escolha um cliente.");
  if (!isValidContentMonth(month)) return jsonError("Escolha um período válido.");
  if (!monthlyObjective) return jsonError("Indique o objetivo do mês.");
  if (!preparedByName) return jsonError("Indique o nome de quem preparou o documento.");
  if (!preparedByEmail) return jsonError("Indique o email de quem preparou o documento.");
  if (!exportItems.length) return jsonError("Selecione pelo menos um conteúdo.");

  const [clients, clientContent] = await Promise.all([
    getClients(),
    getContentItems({ client: clientId }),
  ]);
  const client = clients.find((currentClient) => currentClient.id === clientId);
  if (!client) return jsonError("Cliente inválido.", 404);

  const allowedItems = contentItemsForPlanningPeriod(clientContent, clientId, month);
  const allowedIds = new Set(allowedItems.map((item) => item.id));
  const itemIds = exportItems.map((item) => item.id);
  const invalidIds = itemIds.filter((itemId) => !allowedIds.has(itemId));
  if (invalidIds.length) return jsonError("A seleção contém conteúdos inválidos para este cliente e período.");

  const allowedItemsById = new Map(allowedItems.map((item) => [item.id, item]));
  const selectedItems = exportItems.filter((item) => allowedItemsById.has(item.id));
  if (!selectedItems.length) return jsonError("Selecione pelo menos um conteúdo.");

  const data = buildContentPlanningExportData({
    client,
    month,
    language,
    documentTitle,
    monthlyObjective,
    monthlyThemes,
    website,
    clientContactName,
    approvalDeadline,
    approvalInstructions,
    emailSubject,
    emailBody,
    items: selectedItems,
    preparedByName,
    preparedByEmail,
    logoDataUrl: await resolveLogoDataUrl(client.logo_url),
  });
  const filename = contentPlanningFilename(client, month);
  const document = React.createElement(ContentPlanningPdfDocument, { data }) as React.ReactElement<DocumentProps>;
  const pdfBuffer = await renderToBuffer(document);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionFilename(filename),
      "Cache-Control": "no-store",
    },
  });
}
