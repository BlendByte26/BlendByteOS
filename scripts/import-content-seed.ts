import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type CsvRow = Record<string, string>;

type ClientRow = {
  id: string;
  name: string;
  client_code: string | null;
};

type TeamMemberRow = {
  name: string;
};

type ExistingContentRow = {
  client_id: string;
  month: string;
  title: string;
  platform: string;
  publish_date: string | null;
};

const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Uso: pnpm tsx scripts/import-content-seed.ts data/imports/ficheiro.csv");
  process.exit(1);
}

loadEnv(".env.local");
loadEnv(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase não está configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function loadEnv(path: string) {
  let content = "";
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  if (!headers?.length) return [];

  return body
    .filter((values) => values.some((value) => value.trim().length > 0))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header.trim(), (values[index] ?? "").trim()]),
      ) as CsvRow,
    );
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanText(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function normalizeDate(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;

  const pt = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (pt) {
    const [, day, month, year] = pt;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function monthFrom(row: CsvRow, publishDate: string | null) {
  if (publishDate) return publishDate.slice(0, 7);

  const rawMonth = cleanText(row.month);
  if (rawMonth?.match(/^\d{4}-\d{2}$/)) return rawMonth;

  return null;
}

function mapStatus(row: CsvRow) {
  const status = normalize(row.status_suggested || row.status_original);

  if (!status) return "pending";
  if (status.includes("arquiv")) return "archived";
  if (
    status.includes("publicado") ||
    status.includes("agendado") ||
    status === "published" ||
    status === "scheduled" ||
    status.includes("concluido") ||
    status.includes("concluído")
  ) {
    return "published";
  }
  if (status.includes("pronto") || status.includes("agendado") || status.includes("scheduled")) {
    return "ready_to_publish";
  }
  if (status.includes("aprovacao") || status.includes("aprovação") || status.includes("aprovado")) {
    return "ready_to_publish";
  }
  if (status.includes("design")) {
    return "in_progress";
  }
  if (
    status.includes("producao") ||
    status.includes("produção") ||
    status.includes("copy") ||
    status.includes("fazer") ||
    status.includes("brief") ||
    status.includes("todo") ||
    status.includes("bloqueado")
  ) {
    return "pending";
  }
  if (status.includes("ideia") || status.includes("idea")) return "pending";

  return "pending";
}

function isUrl(value: string | null) {
  return Boolean(value?.match(/^https?:\/\//i));
}

function compactNotes(row: CsvRow, nonUrlInspiration: string | null) {
  const parts = [
    row.status_original ? `Estado original: ${row.status_original}` : null,
    row.status_suggested ? `Estado sugerido: ${row.status_suggested}` : null,
    row.source_sheet || row.source_row
      ? `Origem: ${[row.source_sheet, row.source_row ? `linha ${row.source_row}` : null].filter(Boolean).join(" · ")}`
      : null,
    row.source_date_label ? `Data original: ${row.source_date_label}` : null,
    nonUrlInspiration ? `Inspiração: ${nonUrlInspiration}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n") : null;
}

function duplicateKey(row: Pick<ExistingContentRow, "client_id" | "title" | "platform" | "publish_date">) {
  return [
    row.client_id,
    normalize(row.title),
    normalize(row.platform),
    row.publish_date ?? "",
  ].join("|");
}

function schemaUniqueKey(row: Pick<ExistingContentRow, "client_id" | "month" | "title">) {
  return [row.client_id, row.month, normalize(row.title)].join("|");
}

async function main() {
  const csv = await readFile(csvPath, "utf8");
  const rows = parseCsv(csv);

  const [{ data: clients, error: clientsError }, { data: teamMembers, error: teamError }] =
    await Promise.all([
      supabase.from("clients").select("id, name, client_code"),
      supabase.from("team_members").select("name").eq("active", true),
    ]);

  if (clientsError) throw new Error(`Erro ao ler clients: ${clientsError.message}`);
  if (teamError) throw new Error(`Erro ao ler team_members: ${teamError.message}`);

  const clientsByCode = new Map(
    (clients as ClientRow[]).map((client) => [normalize(client.client_code), client]),
  );
  const clientsByName = new Map(
    (clients as ClientRow[]).map((client) => [normalize(client.name), client]),
  );
  const teamByName = new Map(
    (teamMembers as TeamMemberRow[]).map((member) => [normalize(member.name), member.name]),
  );

  const { data: existing, error: existingError } = await supabase
    .from("content_items")
    .select("client_id, month, title, platform, publish_date");

  if (existingError) throw new Error(`Erro ao ler content_items existentes: ${existingError.message}`);

  const seen = new Set((existing as ExistingContentRow[]).map(duplicateKey));
  const seenSchemaKeys = new Set((existing as ExistingContentRow[]).map(schemaUniqueKey));
  const payloads = [];
  const missingClients = new Map<string, number>();
  const unmatchedOwners = new Set<string>();
  let ignoredDuplicates = 0;
  let ignoredInvalid = 0;

  for (const row of rows) {
    const client =
      clientsByCode.get(normalize(row.client_code)) ?? clientsByName.get(normalize(row.client_name));
    if (!client) {
      const label = row.client_code || row.client_name || "sem cliente";
      missingClients.set(label, (missingClients.get(label) ?? 0) + 1);
      ignoredInvalid += 1;
      continue;
    }

    const title = cleanText(row.title);
    const platform = cleanText(row.platform);
    const publishDate = normalizeDate(row.publication_date);
    const month = monthFrom(row, publishDate);

    if (!title || !platform || !month) {
      ignoredInvalid += 1;
      continue;
    }

    const key = duplicateKey({
      client_id: client.id,
      title,
      platform,
      publish_date: publishDate,
    });

    if (seen.has(key)) {
      ignoredDuplicates += 1;
      continue;
    }

    const uniqueKey = schemaUniqueKey({ client_id: client.id, month, title });
    if (seenSchemaKeys.has(uniqueKey)) {
      ignoredDuplicates += 1;
      continue;
    }

    seen.add(key);
    seenSchemaKeys.add(uniqueKey);

    const ownerRaw = cleanText(row.owner_suggested);
    const owner = ownerRaw ? teamByName.get(normalize(ownerRaw)) ?? ownerRaw : null;
    if (ownerRaw && !teamByName.has(normalize(ownerRaw))) unmatchedOwners.add(ownerRaw);

    const inspiration = cleanText(row.inspiration);
    const inspirationUrl = isUrl(inspiration) ? inspiration : null;

    payloads.push({
      client_id: client.id,
      month,
      publish_date: publishDate,
      platform,
      format: cleanText(row.format),
      title,
      creative_brief: cleanText(row.brief),
      copy_text: cleanText(row.copy),
      status: mapStatus(row),
      assignee_name: owner,
      inspiration_url: inspirationUrl,
      client_feedback: cleanText(row.feedback),
      needs_design: true,
      needs_copy: !cleanText(row.copy),
      needs_client_approval: false,
      is_blocked: false,
      blocker_reason: null,
      notes: compactNotes(row, inspirationUrl ? null : inspiration),
    });
  }

  let created = 0;
  if (payloads.length) {
    const { data, error } = await supabase.from("content_items").insert(payloads).select("id");
    if (error) throw new Error(`Erro ao inserir content_items: ${error.message}`);
    created = data?.length ?? payloads.length;
  }

  console.log(JSON.stringify(
    {
      csvRows: rows.length,
      created,
      ignoredDuplicates,
      ignoredInvalid,
      missingClients: Object.fromEntries(missingClients),
      unmatchedOwners: Array.from(unmatchedOwners),
    },
    null,
    2,
  ));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
