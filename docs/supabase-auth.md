# Supabase Auth setup

BlendByteOS uses Supabase Auth for internal access. `APP_ACCESS_PASSWORD` can remain in the environment temporarily, but the primary entry point is email/password login through `/access`.

## Automated onboarding

Use the local admin script to create/reuse Auth users, upsert `public.user_profiles`, and send invite or password recovery emails:

```bash
npm run tsx -- scripts/setup-auth-users.ts
```

The script reads the four emails from `public.team_members` and never stores passwords or tokens. It requires:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in local ignored env files such as `.env.local`. Do not add it to browser code, commits, or Vercel runtime unless a future server-only runtime feature explicitly needs it.

Supabase email sending can be rate limited on the default mailer. If email sending is blocked or the project email template is still being configured, generate private one-time links instead:

```bash
npm run tsx -- scripts/generate-auth-access-links.ts
```

This writes a local ignored file under `tmp/`. Send each person only their own link. The links route through `/auth/confirm`, then `/access/set-password`, and let the user define a password without relying on Supabase's email delivery.

## Profiles

The script maintains exactly these active operational profiles:

```text
guilherme | Guilherme | admin
sofia     | Sofia     | marketing
carlota   | Carlota   | design
carolina  | Carolina  | design
```

## Password flow

Invite and recovery emails should redirect to:

```text
https://blend-byte-os.vercel.app/access/set-password
```

Flow:

```text
Supabase email link -> /access/set-password -> dashboard
private generated link -> /auth/confirm -> /access/set-password -> dashboard
```

The access page also handles Supabase's default hash-based email links. If a user lands on `/access` with an Auth session in the URL, the app stores the session and forwards them to `/access/set-password`.

For the cleanest hosted email flow, set the Supabase Auth site URL to:

```text
https://blend-byte-os.vercel.app
```

Add the same production domain to the Supabase Auth redirect allow list. If customizing the Supabase invite/recovery templates, use a token hash link:

```html
<a href="https://blend-byte-os.vercel.app/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/access/set-password">Aceitar convite</a>
```

Guilherme and Sofia land on `/?view=marketing`; Carlota and Carolina land on `/?view=design`.

## Validation

After onboarding, run:

```bash
npm run tsx -- scripts/check-anon-rls.ts
npm run typecheck
npm run lint
npm run build
```

The anonymous RLS check should show no access to internal operational tables, except the temporary public Invest2030 compatibility policies documented in the auth migration.
