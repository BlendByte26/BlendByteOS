alter table public.tasks
add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.team_members
add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.company_contacts
add column if not exists links jsonb not null default '[]'::jsonb;
