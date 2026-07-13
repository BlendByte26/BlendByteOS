import { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

type OperationalUser = {
  displayName: "Guilherme" | "Sofia" | "Carlota" | "Carolina";
  profileKey: "guilherme" | "sofia" | "carlota" | "carolina";
};

type TeamMemberRow = {
  name: string;
  email: string | null;
};

const productionUrl = "https://blend-byte-os.vercel.app";
const operationalUsers: OperationalUser[] = [
  { displayName: "Guilherme", profileKey: "guilherme" },
  { displayName: "Sofia", profileKey: "sofia" },
  { displayName: "Carlota", profileKey: "carlota" },
  { displayName: "Carolina", profileKey: "carolina" },
];

function selectedOperationalUsers() {
  const requestedProfiles = process.argv.slice(2).map(normalize);
  if (!requestedProfiles.length) return operationalUsers;

  const selected = operationalUsers.filter((user) => {
    const profileKey = normalize(user.profileKey);
    const displayName = normalize(user.displayName);
    return requestedProfiles.includes(profileKey) || requestedProfiles.includes(displayName);
  });

  const selectedKeys = new Set(
    selected.flatMap((user) => [normalize(user.profileKey), normalize(user.displayName)]),
  );
  const unknown = requestedProfiles.filter((requested) => !selectedKeys.has(requested));

  if (unknown.length) {
    throw new Error(`Unknown profile(s): ${unknown.join(", ")}`);
  }

  return selected;
}

loadEnv(".env.local");
loadEnv(".env");

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in local env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function getTeamEmails(users: OperationalUser[]) {
  const names = users.map((user) => user.displayName);
  const { data, error } = await supabase
    .from("team_members")
    .select("name, email")
    .in("name", names);

  if (error) throw new Error(`Could not read team emails: ${error.message}`);

  const rows = (data ?? []) as TeamMemberRow[];
  const byName = new Map(rows.map((row) => [normalize(row.name), row.email?.trim() ?? ""]));
  const missing = users.filter((user) => !byName.get(normalize(user.displayName)));

  if (missing.length) {
    throw new Error(`Missing team email for: ${missing.map((user) => user.displayName).join(", ")}`);
  }

  return new Map(
    users.map((user) => [
      user.profileKey,
      byName.get(normalize(user.displayName)) as string,
    ]),
  );
}

function accessLinkFor(hashedToken: string) {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
    next: "/access/set-password",
  });

  return `${productionUrl}/auth/confirm?${params.toString()}`;
}

async function main() {
  const users = selectedOperationalUsers();
  const emailsByProfile = await getTeamEmails(users);
  const generatedAt = new Date();
  const lines = [
    "BlendByteOS access links",
    `Generated at: ${generatedAt.toISOString()}`,
    "",
    "Send each person only their own link. Each link is private, one-time use, and lets them define a new password.",
    "",
  ];

  const safeResults: Array<{
    displayName: string;
    email: string;
    status: "generated";
  }> = [];

  for (const operationalUser of users) {
    const email = emailsByProfile.get(operationalUser.profileKey);
    if (!email) throw new Error(`Missing email for ${operationalUser.displayName}`);

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${productionUrl}/access/set-password`,
      },
    });

    if (error) {
      throw new Error(`Could not generate access link for ${operationalUser.displayName}: ${error.message}`);
    }

    const hashedToken = data.properties?.hashed_token;
    if (!hashedToken) {
      throw new Error(`Supabase did not return a token for ${operationalUser.displayName}`);
    }

    lines.push(`${operationalUser.displayName} <${email}>`);
    lines.push(accessLinkFor(hashedToken));
    lines.push("");

    safeResults.push({
      displayName: operationalUser.displayName,
      email,
      status: "generated",
    });
  }

  await mkdir("tmp", { recursive: true });
  const outputPath = join("tmp", `auth-access-links-${generatedAt.toISOString().replace(/[:.]/g, "-")}.txt`);
  writeFileSync(outputPath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });

  console.table(safeResults);
  console.log(`Private links written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown link generation error");
  process.exit(1);
});
