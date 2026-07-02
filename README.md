# BlendByteOS

Internal operations app for a small digital marketing agency. This first version has no login or authentication by design: anyone with the internal link can view and edit.

## Modules

- Painel
- Clientes
- Conteúdos
- Tarefas
- Arquivo

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a Supabase project and run:

```sql
-- supabase/schema.sql
```

3. Add environment variables locally and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use only the public anon key in this app. Do not add service-role keys or sensitive credentials.

4. Run locally:

```bash
pnpm dev
```

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

## Auth Later

The code keeps people as text fields (`owner_name`, `assignee_name`) and centralizes Supabase access in `src/lib/supabase.ts`, so Supabase Auth can be added later without rebuilding the main data model.
