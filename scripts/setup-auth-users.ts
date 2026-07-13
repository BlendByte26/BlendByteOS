import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type OperationalUser = {
  displayName: "Guilherme" | "Sofia" | "Carlota" | "Carolina";
  profileKey: "guilherme" | "sofia" | "carlota" | "carolina";
  role: "admin" | "marketing" | "design";
};

type TeamMemberRow = {
  name: string;
  email: string | null;
};

type AuthUser = {
  id: string;
  email?: string;
};

type AccessEmailResult = "invite" | "recovery" | "rate_limited";

const productionUrl = "https://blend-byte-os.vercel.app";
const redirectTo = `${productionUrl}/auth/confirm?next=/access/set-password`;
const operationalUsers: OperationalUser[] = [
  { displayName: "Guilherme", profileKey: "guilherme", role: "admin" },
  { displayName: "Sofia", profileKey: "sofia", role: "marketing" },
  { displayName: "Carlota", profileKey: "carlota", role: "design" },
  { displayName: "Carolina", profileKey: "carolina", role: "design" },
];

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

async function getTeamEmails() {
  const names = operationalUsers.map((user) => user.displayName);
  const { data, error } = await supabase
    .from("team_members")
    .select("name, email")
    .in("name", names);

  if (error) throw new Error(`Could not read team emails: ${error.message}`);

  const rows = (data ?? []) as TeamMemberRow[];
  const byName = new Map(rows.map((row) => [normalize(row.name), row.email?.trim() ?? ""]));
  const missing = operationalUsers.filter((user) => !byName.get(normalize(user.displayName)));

  if (missing.length) {
    throw new Error(`Missing team email for: ${missing.map((user) => user.displayName).join(", ")}`);
  }

  return new Map(
    operationalUsers.map((user) => [
      user.profileKey,
      byName.get(normalize(user.displayName)) as string,
    ]),
  );
}

async function listAllUsers() {
  const users: AuthUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw new Error(`Could not list auth users: ${error.message}`);

    users.push(...(data.users as AuthUser[]));
    if (data.users.length < 1000) break;
    page += 1;
  }

  return users;
}

function isRateLimitError(message: string) {
  return message.toLowerCase().includes("rate limit");
}

async function sendAccessEmail(email: string): Promise<AccessEmailResult> {
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!inviteError) return "invite";

  if (isRateLimitError(inviteError.message)) return "rate_limited";

  const inviteMessage = inviteError.message.toLowerCase();
  if (!inviteMessage.includes("already") && !inviteMessage.includes("registered")) {
    throw new Error(`Could not send invite to ${email}: ${inviteError.message}`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    if (isRateLimitError(error.message)) return "rate_limited";
    throw new Error(`Could not send recovery email to ${email}: ${error.message}`);
  }
  return "recovery";
}

async function main() {
  const emailsByProfile = await getTeamEmails();
  const existingUsers = await listAllUsers();
  const existingByEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email!.toLowerCase(), user]),
  );

  const safeResults: Array<{
    displayName: string;
    email: string;
    action: "created" | "reused";
    emailType: AccessEmailResult;
    profileKey: string;
    role: string;
  }> = [];

  for (const operationalUser of operationalUsers) {
    const email = emailsByProfile.get(operationalUser.profileKey);
    if (!email) throw new Error(`Missing email for ${operationalUser.displayName}`);

    const existingUser = existingByEmail.get(email.toLowerCase());
    let authUser = existingUser;
    let action: "created" | "reused" = "reused";
    let emailType: AccessEmailResult = "invite";

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error && !isRateLimitError(error.message)) {
        throw new Error(`Could not create/invite ${operationalUser.displayName}: ${error.message}`);
      }

      if (error && isRateLimitError(error.message)) {
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            display_name: operationalUser.displayName,
            profile_key: operationalUser.profileKey,
          },
        });

        if (createError) {
          throw new Error(`Could not create ${operationalUser.displayName}: ${createError.message}`);
        }

        if (!createData.user?.id) {
          throw new Error(`Create user did not return an auth user for ${operationalUser.displayName}`);
        }

        authUser = { id: createData.user.id, email };
        emailType = "rate_limited";
      } else {
        if (!data.user?.id) throw new Error(`Invite did not return an auth user for ${operationalUser.displayName}`);
        authUser = { id: data.user.id, email };
        emailType = "invite";
      }

      existingByEmail.set(email.toLowerCase(), authUser);
      action = "created";
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          auth_user_id: authUser.id,
          profile_key: operationalUser.profileKey,
          display_name: operationalUser.displayName,
          role: operationalUser.role,
          active: true,
        },
        { onConflict: "profile_key" },
      );

    if (profileError) {
      throw new Error(`Could not upsert profile ${operationalUser.profileKey}: ${profileError.message}`);
    }

    if (action === "reused") {
      emailType = await sendAccessEmail(email);
    }

    safeResults.push({
      displayName: operationalUser.displayName,
      email,
      action,
      emailType,
      profileKey: operationalUser.profileKey,
      role: operationalUser.role,
    });
  }

  console.table(safeResults);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown setup error");
  process.exit(1);
});
