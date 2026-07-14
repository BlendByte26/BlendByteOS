create table if not exists public.invest2030_newsletters (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  template_version text not null,
  parsed_request_json jsonb not null default '{}'::jsonb,
  content_json jsonb not null default '{}'::jsonb,
  generated_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'ready_to_export', 'exported', 'scheduled', 'sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  scheduled_note text,
  scheduled_by text,
  scheduled_recorded_at timestamptz,
  sent_by text,
  sent_recorded_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists invest2030_newsletters_task_id_unique_idx
on public.invest2030_newsletters(task_id);

create index if not exists invest2030_newsletters_status_idx
on public.invest2030_newsletters(status);

create index if not exists invest2030_newsletters_scheduled_at_idx
on public.invest2030_newsletters(scheduled_at);

drop trigger if exists set_invest2030_newsletters_updated_at on public.invest2030_newsletters;
create trigger set_invest2030_newsletters_updated_at
before update on public.invest2030_newsletters
for each row execute function public.set_updated_at();

alter table public.invest2030_newsletters enable row level security;

grant select, insert, update, delete on public.invest2030_newsletters to anon, authenticated;

drop policy if exists "Open internal read invest2030 newsletters" on public.invest2030_newsletters;
create policy "Open internal read invest2030 newsletters"
on public.invest2030_newsletters for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert invest2030 newsletters" on public.invest2030_newsletters;
create policy "Open internal insert invest2030 newsletters"
on public.invest2030_newsletters for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update invest2030 newsletters" on public.invest2030_newsletters;
create policy "Open internal update invest2030 newsletters"
on public.invest2030_newsletters for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete invest2030 newsletters" on public.invest2030_newsletters;
create policy "Open internal delete invest2030 newsletters"
on public.invest2030_newsletters for delete
to anon, authenticated
using (true);
