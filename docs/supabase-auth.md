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
https://blend-byte-os.vercel.app/auth/confirm?next=/access/set-password
```

Flow:

```text
email link -> /auth/confirm -> /access/set-password -> dashboard
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
