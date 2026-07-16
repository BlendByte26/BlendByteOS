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
} from "@/lib/content-planning-export";
import { isValidContentMonth } from "@/lib/content-month";
import { requireCurrentOperationalProfile } from "@/lib/auth";
import { getClients, getContentItems } from "@/lib/data";

export const runtime = "nodejs";

type ExportPayload = {
  clientId?: unknown;
  month?: unknown;
  itemIds?: unknown;
  preparedByName?: unknown;
  preparedByEmail?: unknown;
};

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function selectedIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
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
  const itemIds = selectedIds(payload.itemIds);
  const preparedByName = stringValue(payload.preparedByName);
  const preparedByEmail = stringValue(payload.preparedByEmail);

  if (!clientId) return jsonError("Escolha um cliente.");
  if (!isValidContentMonth(month)) return jsonError("Escolha um período válido.");
  if (!preparedByName) return jsonError("Indique o nome de quem preparou o documento.");
  if (!preparedByEmail) return jsonError("Indique o email de quem preparou o documento.");
  if (!itemIds.length) return jsonError("Selecione pelo menos um conteúdo.");

  const [clients, clientContent] = await Promise.all([
    getClients(),
    getContentItems({ client: clientId }),
  ]);
  const client = clients.find((currentClient) => currentClient.id === clientId);
  if (!client) return jsonError("Cliente inválido.", 404);

  const allowedItems = contentItemsForPlanningPeriod(clientContent, clientId, month);
  const allowedIds = new Set(allowedItems.map((item) => item.id));
  const invalidIds = itemIds.filter((itemId) => !allowedIds.has(itemId));
  if (invalidIds.length) return jsonError("A seleção contém conteúdos inválidos para este cliente e período.");

  const selectedItems = allowedItems.filter((item) => itemIds.includes(item.id));
  if (!selectedItems.length) return jsonError("Selecione pelo menos um conteúdo.");

  const data = buildContentPlanningExportData({
    client,
    month,
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
