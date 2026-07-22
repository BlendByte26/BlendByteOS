-- BlendByteOS first-version schema.
-- This version intentionally has no login. RLS stays enabled, with open anon policies
-- so anyone who can load the internal app link can view and edit operational records.
-- Do not store passwords, API keys, credentials, or sensitive access data in these tables.

create extension if not exists pgcrypto;

do $$ begin
  create type client_type as enum ('internal', 'external', 'grupo_investe', 'partner');
exception when duplicate_object then null;
end $$;

alter type client_type add value if not exists 'grupo_investe';
alter type client_type add value if not exists 'partner';

do $$ begin
  create type client_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type content_status as enum (
    'pending',
    'in_progress',
    'ready_to_publish',
    'published',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_type as enum (
    'design',
    'copy',
    'publishing',
    'reporting',
    'operations',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'done', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_priority as enum ('low', 'normal', 'urgent');
exception when duplicate_object then null;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_code text,
  short_name text,
  display_order integer,
  logo_url text,
  color_key text,
  type client_type not null default 'external',
  status client_status not null default 'active',
  owner_name text,
  contact_email text,
  contact_phone text,
  contact_name text,
  service_type text,
  service_types text[] not null default '{}',
  monthly_value numeric(12,2),
  contract_value text,
  start_date date,
  contract_duration text,
  platforms text[] not null default '{}',
  website_url text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  tiktok_url text,
  youtube_url text,
  metricool_url text,
  crm_newsletter_url text,
  platform_other_url text,
  drive_url text,
  figma_url text,
  meta_url text,
  google_drive_url text,
  onedrive_url text,
  figma_project_url text,
  content_calendar_url text,
  final_deliverables_url text,
  proposal_url text,
  contract_url text,
  adjudication_url text,
  budget_url text,
  other_documents_url text,
  brand_guidelines_url text,
  brand_assets_url text,
  setup_checklist jsonb,
  reporting_url text,
  initial_briefing_url text,
  conditions_url text,
  linkedin_campaign_manager_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text,
  phone text,
  role text,
  links jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  display_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quick_todos (
  id uuid primary key default gen_random_uuid(),
  view text not null check (view in ('marketing', 'design')),
  profile_key text not null default 'guilherme' check (profile_key in ('carlota', 'carolina', 'sofia', 'guilherme')),
  text text not null check (char_length(btrim(text)) > 0),
  item_type text not null default 'todo' check (item_type in ('todo', 'reminder')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  view text not null check (view in ('marketing', 'design')),
  profile_key text not null default 'guilherme' check (profile_key in ('carlota', 'carolina', 'sofia', 'guilherme')),
  text text not null check (char_length(btrim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) > 0),
  email text not null check (char_length(btrim(email)) > 0),
  phone text,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  publish_date date,
  publish_time time,
  design_due_date date,
  copy_due_date date,
  approval_due_date date,
  publishing_due_date date,
  design_status text,
  copy_status text,
  approval_status text,
  publishing_status text,
  needs_design boolean not null default true,
  needs_copy boolean not null default true,
  needs_client_approval boolean not null default false,
  platform text not null,
  format text,
  title text not null,
  creative_brief text,
  copy_text text,
  description text,
  status content_status not null default 'pending',
  assignee_name text,
  media_url text,
  brief_url text,
  media_folder_url text,
  figma_url text,
  export_url text,
  delivery_url text,
  inspiration_url text,
  published_url text,
  internal_review_notes text,
  client_feedback text,
  is_blocked boolean not null default false,
  blocker_reason text,
  recording_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  type task_type not null default 'operations',
  status task_status not null default 'pending',
  priority task_priority not null default 'normal',
  assignee_name text,
  due_date date,
  related_url text,
  links jsonb not null default '[]'::jsonb,
  is_blocked boolean not null default false,
  blocker_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invest2030_requests (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid,
  task_id uuid references public.tasks(id) on delete set null,
  campaign_name text not null,
  action_type text not null,
  requested_by text not null,
  period_type text not null,
  period_start date not null,
  period_end date not null,
  period_label text not null,
  webinar_date date,
  webinar_time time,
  main_goal text not null,
  target_audience text not null,
  main_cta text not null,
  main_link text,
  main_message text not null,
  mandatory_info text not null,
  information_status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.clients add column if not exists google_drive_url text;
alter table public.clients add column if not exists client_code text;
alter table public.clients add column if not exists short_name text;
alter table public.clients add column if not exists display_order integer;
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists contact_email text;
alter table public.clients add column if not exists contact_phone text;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists drive_url text;
alter table public.clients add column if not exists figma_url text;
alter table public.clients add column if not exists meta_url text;
alter table public.clients add column if not exists service_type text;
alter table public.clients add column if not exists service_types text[] not null default '{}';
alter table public.clients add column if not exists monthly_value numeric(12,2);
alter table public.clients add column if not exists contract_value text;
alter table public.clients add column if not exists start_date date;
alter table public.clients add column if not exists contract_duration text;
alter table public.clients add column if not exists platforms text[] not null default '{}';
alter table public.clients add column if not exists website_url text;
alter table public.clients add column if not exists instagram_url text;
alter table public.clients add column if not exists facebook_url text;
alter table public.clients add column if not exists linkedin_url text;
alter table public.clients add column if not exists tiktok_url text;
alter table public.clients add column if not exists youtube_url text;
alter table public.clients add column if not exists metricool_url text;
alter table public.clients add column if not exists crm_newsletter_url text;
alter table public.clients add column if not exists platform_other_url text;
alter table public.clients add column if not exists onedrive_url text;
alter table public.clients add column if not exists figma_project_url text;
alter table public.clients add column if not exists content_calendar_url text;
alter table public.clients add column if not exists final_deliverables_url text;
alter table public.clients add column if not exists proposal_url text;
alter table public.clients add column if not exists contract_url text;
alter table public.clients add column if not exists adjudication_url text;
alter table public.clients add column if not exists budget_url text;
alter table public.clients add column if not exists other_documents_url text;
alter table public.clients add column if not exists brand_guidelines_url text;
alter table public.clients add column if not exists brand_assets_url text;
alter table public.clients add column if not exists setup_checklist jsonb;
alter table public.clients add column if not exists reporting_url text;
alter table public.clients add column if not exists initial_briefing_url text;
alter table public.clients add column if not exists conditions_url text;
alter table public.clients add column if not exists linkedin_campaign_manager_url text;
alter table public.clients add column if not exists notes text;

alter table public.content_items add column if not exists brief_url text;
alter table public.content_items add column if not exists publish_time time;
alter table public.content_items add column if not exists design_due_date date;
alter table public.content_items add column if not exists copy_due_date date;
alter table public.content_items add column if not exists approval_due_date date;
alter table public.content_items add column if not exists publishing_due_date date;
alter table public.content_items add column if not exists design_status text;
alter table public.content_items add column if not exists copy_status text;
alter table public.content_items add column if not exists approval_status text;
alter table public.content_items add column if not exists publishing_status text;
alter table public.content_items add column if not exists needs_design boolean not null default true;
alter table public.content_items add column if not exists needs_copy boolean not null default true;
alter table public.content_items add column if not exists needs_client_approval boolean not null default false;
alter table public.content_items add column if not exists creative_brief text;
alter table public.content_items add column if not exists copy_text text;
alter table public.content_items add column if not exists description text;
alter table public.content_items add column if not exists assignee_name text;
alter table public.content_items add column if not exists media_url text;
alter table public.content_items add column if not exists media_folder_url text;
alter table public.content_items add column if not exists figma_url text;
alter table public.content_items add column if not exists export_url text;
alter table public.content_items add column if not exists delivery_url text;
alter table public.content_items add column if not exists inspiration_url text;
alter table public.content_items add column if not exists published_url text;
alter table public.content_items add column if not exists internal_review_notes text;
alter table public.content_items add column if not exists client_feedback text;
alter table public.content_items add column if not exists is_blocked boolean not null default false;
alter table public.content_items add column if not exists blocker_reason text;
alter table public.content_items add column if not exists recording_date date;
alter table public.content_items add column if not exists notes text;
alter table public.content_items add column if not exists source_task_id uuid references public.tasks(id) on delete set null;

alter table public.tasks add column if not exists related_url text;
alter table public.tasks add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists is_blocked boolean not null default false;
alter table public.tasks add column if not exists blocker_reason text;
alter table public.tasks add column if not exists notes text;

alter table public.clients add column if not exists color_key text;
alter table public.team_members add column if not exists phone text;
alter table public.team_members add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.company_contacts add column if not exists links jsonb not null default '[]'::jsonb;

create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_display_order_idx on public.clients(display_order);
create index if not exists clients_client_code_idx on public.clients(client_code);
create index if not exists clients_color_key_idx on public.clients(color_key);
create index if not exists team_members_active_idx on public.team_members(active);
create index if not exists team_members_display_order_idx on public.team_members(display_order);
create unique index if not exists clients_name_unique_idx on public.clients(name);
create index if not exists content_items_client_id_idx on public.content_items(client_id);
create index if not exists content_items_source_task_id_idx on public.content_items(source_task_id);
create index if not exists content_items_month_idx on public.content_items(month);
create index if not exists content_items_publish_date_idx on public.content_items(publish_date);
create index if not exists content_items_status_idx on public.content_items(status);
create index if not exists content_items_platform_idx on public.content_items(platform);
create index if not exists content_items_is_blocked_idx on public.content_items(is_blocked);
drop index if exists public.content_items_seed_unique_idx;
create index if not exists tasks_client_id_idx on public.tasks(client_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assignee_name_idx on public.tasks(assignee_name);
create index if not exists tasks_is_blocked_idx on public.tasks(is_blocked);
create unique index if not exists invest2030_requests_submission_key_unique_idx on public.invest2030_requests(submission_key) where submission_key is not null;
create index if not exists invest2030_requests_task_id_idx on public.invest2030_requests(task_id);
create index if not exists invest2030_requests_created_at_idx on public.invest2030_requests(created_at);
create index if not exists invest2030_requests_period_start_idx on public.invest2030_requests(period_start);
create index if not exists invest2030_requests_action_type_idx on public.invest2030_requests(action_type);
create index if not exists invest2030_requests_requested_by_idx on public.invest2030_requests(requested_by);
create index if not exists invest2030_requests_information_status_idx on public.invest2030_requests(information_status);
create unique index if not exists invest2030_newsletters_task_id_unique_idx on public.invest2030_newsletters(task_id);
create index if not exists invest2030_newsletters_status_idx on public.invest2030_newsletters(status);
create index if not exists invest2030_newsletters_scheduled_at_idx on public.invest2030_newsletters(scheduled_at);
create index if not exists quick_todos_view_done_idx on public.quick_todos(view, done);
create index if not exists quick_todos_profile_view_done_idx on public.quick_todos(profile_key, view, done);
create index if not exists quick_todos_profile_view_type_done_idx on public.quick_todos(profile_key, view, item_type, done);
create index if not exists quick_todos_created_at_idx on public.quick_todos(created_at);
create index if not exists quick_notes_view_created_at_idx on public.quick_notes(view, created_at);
create index if not exists quick_notes_profile_view_created_at_idx on public.quick_notes(profile_key, view, created_at);
create index if not exists company_contacts_label_idx on public.company_contacts(label);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create or replace function public.enforce_content_publish_identity_unique()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (new.client_id, new.publish_date, new.title, new.platform)
      is not distinct from
      (old.client_id, old.publish_date, old.title, old.platform)
  then
    return new;
  end if;

  if new.publish_date is not null and exists (
    select 1
    from public.content_items existing
    where existing.id <> new.id
      and existing.client_id = new.client_id
      and existing.publish_date = new.publish_date
      and existing.title = new.title
      and existing.platform = new.platform
  ) then
    raise exception using
      errcode = '23505',
      message = 'content_items_publish_identity_unique: duplicate client, day, title and platform';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_content_publish_identity_unique() from public, anon, authenticated;

drop trigger if exists enforce_content_publish_identity_unique on public.content_items;
create trigger enforce_content_publish_identity_unique
before insert or update of client_id, publish_date, title, platform on public.content_items
for each row execute function public.enforce_content_publish_identity_unique();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_invest2030_requests_updated_at on public.invest2030_requests;
create trigger set_invest2030_requests_updated_at
before update on public.invest2030_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_invest2030_newsletters_updated_at on public.invest2030_newsletters;
create trigger set_invest2030_newsletters_updated_at
before update on public.invest2030_newsletters
for each row execute function public.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists set_quick_todos_updated_at on public.quick_todos;
create trigger set_quick_todos_updated_at
before update on public.quick_todos
for each row execute function public.set_updated_at();

drop trigger if exists set_quick_notes_updated_at on public.quick_notes;
create trigger set_quick_notes_updated_at
before update on public.quick_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_company_contacts_updated_at on public.company_contacts;
create trigger set_company_contacts_updated_at
before update on public.company_contacts
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.content_items enable row level security;
alter table public.tasks enable row level security;
alter table public.invest2030_requests enable row level security;
alter table public.invest2030_newsletters enable row level security;
alter table public.team_members enable row level security;
alter table public.quick_todos enable row level security;
alter table public.quick_notes enable row level security;
alter table public.company_contacts enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.clients to anon, authenticated;
grant select, insert, update, delete on public.content_items to anon, authenticated;
grant select, insert, update, delete on public.tasks to anon, authenticated;
grant select, insert, update, delete on public.invest2030_requests to anon, authenticated;
grant select, insert, update, delete on public.invest2030_newsletters to anon, authenticated;
grant select, insert, update, delete on public.team_members to anon, authenticated;
grant select, insert, update, delete on public.quick_todos to anon, authenticated;
grant select, insert, update, delete on public.quick_notes to anon, authenticated;
grant select, insert, update, delete on public.company_contacts to anon, authenticated;
grant execute on function public.set_updated_at() to anon, authenticated;

drop policy if exists "Open internal read clients" on public.clients;
create policy "Open internal read clients"
on public.clients for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert clients" on public.clients;
create policy "Open internal insert clients"
on public.clients for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update clients" on public.clients;
create policy "Open internal update clients"
on public.clients for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete clients" on public.clients;
create policy "Open internal delete clients"
on public.clients for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read content" on public.content_items;
create policy "Open internal read content"
on public.content_items for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert content" on public.content_items;
create policy "Open internal insert content"
on public.content_items for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update content" on public.content_items;
create policy "Open internal update content"
on public.content_items for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete content" on public.content_items;
create policy "Open internal delete content"
on public.content_items for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read tasks" on public.tasks;
create policy "Open internal read tasks"
on public.tasks for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert tasks" on public.tasks;
create policy "Open internal insert tasks"
on public.tasks for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update tasks" on public.tasks;
create policy "Open internal update tasks"
on public.tasks for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete tasks" on public.tasks;
create policy "Open internal delete tasks"
on public.tasks for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read invest2030 requests" on public.invest2030_requests;
create policy "Open internal read invest2030 requests"
on public.invest2030_requests for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert invest2030 requests" on public.invest2030_requests;
create policy "Open internal insert invest2030 requests"
on public.invest2030_requests for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update invest2030 requests" on public.invest2030_requests;
create policy "Open internal update invest2030 requests"
on public.invest2030_requests for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete invest2030 requests" on public.invest2030_requests;
create policy "Open internal delete invest2030 requests"
on public.invest2030_requests for delete
to anon, authenticated
using (true);

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

drop policy if exists "Open internal read team members" on public.team_members;
create policy "Open internal read team members"
on public.team_members for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert team members" on public.team_members;
create policy "Open internal insert team members"
on public.team_members for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update team members" on public.team_members;
create policy "Open internal update team members"
on public.team_members for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete team members" on public.team_members;
create policy "Open internal delete team members"
on public.team_members for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read quick todos" on public.quick_todos;
create policy "Open internal read quick todos"
on public.quick_todos for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert quick todos" on public.quick_todos;
create policy "Open internal insert quick todos"
on public.quick_todos for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update quick todos" on public.quick_todos;
create policy "Open internal update quick todos"
on public.quick_todos for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete quick todos" on public.quick_todos;
create policy "Open internal delete quick todos"
on public.quick_todos for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read quick notes" on public.quick_notes;
create policy "Open internal read quick notes"
on public.quick_notes for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert quick notes" on public.quick_notes;
create policy "Open internal insert quick notes"
on public.quick_notes for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update quick notes" on public.quick_notes;
create policy "Open internal update quick notes"
on public.quick_notes for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete quick notes" on public.quick_notes;
create policy "Open internal delete quick notes"
on public.quick_notes for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read company contacts" on public.company_contacts;
create policy "Open internal read company contacts"
on public.company_contacts for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert company contacts" on public.company_contacts;
create policy "Open internal insert company contacts"
on public.company_contacts for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update company contacts" on public.company_contacts;
create policy "Open internal update company contacts"
on public.company_contacts for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete company contacts" on public.company_contacts;
create policy "Open internal delete company contacts"
on public.company_contacts for delete
to anon, authenticated
using (true);

insert into public.team_members (name, email, role, active, display_order)
values
  ('Guilherme', null, 'Direção / Operações', true, 1),
  ('Carlota', null, 'Design', true, 2),
  ('Carolina', null, 'Design', true, 3),
  ('Estagiário Design', null, 'Design', true, 4),
  ('Sofia', null, 'Marketing / Client Ops', true, 5)
on conflict (name) do update
set
  role = excluded.role,
  active = excluded.active,
  display_order = excluded.display_order;

update public.team_members
set name = 'Sofia', role = 'Marketing / Client Ops'
where name = 'Estagiário Marketing/Client Ops'
  and not exists (
    select 1 from public.team_members existing
    where existing.name = 'Sofia'
  );

delete from public.team_members
where name = 'Estagiário Marketing/Client Ops';

update public.clients
set
  service_types = case
    when cardinality(service_types) = 0 and service_type is not null then array[service_type]
    else service_types
  end,
  contract_value = coalesce(contract_value, case when monthly_value is not null then monthly_value::text || ' €' else null end);

update public.clients
set name = 'BlendByte'
where client_code = '00_BB' or lower(name) = 'blendbyte';

update public.content_items ci
set title = regexp_replace(ci.title, '^Blendbyte\\s*:', 'BlendByte:', 'i')
from public.clients c
where ci.client_id = c.id and c.client_code = '00_BB';

update public.tasks t
set title = regexp_replace(t.title, '^Blendbyte\\s*:', 'BlendByte:', 'i')
from public.clients c
where t.client_id = c.id and c.client_code = '00_BB';

insert into public.clients
  (name, client_code, short_name, display_order, logo_url, color_key, type, status, owner_name, service_type, monthly_value, start_date, contract_duration, platforms, drive_url, figma_url, meta_url, google_drive_url, onedrive_url, figma_project_url, final_deliverables_url, proposal_url, contract_url, brand_assets_url, notes)
values
  ('BlendByte', '00_BB', 'BB', 0, null, 'slate', 'internal', 'active', 'Guilherme', 'Gestão de Redes Sociais', 1200, date '2026-07-01', '6 meses', array['Instagram', 'LinkedIn'], null, null, null, 'https://drive.google.com/drive/folders/blendbyte', null, 'https://figma.com/file/blendbyte', null, null, null, 'https://drive.google.com/drive/folders/blendbyte-brand', 'Operação interna e marketing próprio.'),
  ('Grupo Investe', '01_GI', 'GI', 1, null, 'blue', 'grupo_investe', 'active', 'Marta', 'Performance / Ads', 1500, date '2026-07-02', '6 meses', array['Instagram', 'LinkedIn', 'Meta'], null, null, null, 'https://drive.google.com/drive/folders/grupo-investe', null, null, null, null, null, null, null),
  ('Invest2030', '02_I2030', 'I2030', 2, null, 'green', 'external', 'active', 'Inês', 'Website', null, date '2026-07-03', 'Projeto', array['LinkedIn', 'Instagram'], null, null, null, 'https://drive.google.com/drive/folders/invest2030', null, null, null, null, null, null, null),
  ('Esportzy', '03_ESP', 'ESP', 3, null, 'violet', 'external', 'active', 'Rita', 'Gestão de Redes Sociais', 900, date '2026-07-07', '6 meses', array['Instagram', 'TikTok'], null, null, null, null, null, null, null, null, null, null, null),
  ('Leões de Porto Salvo', '04_LPS', 'LPS', 4, null, 'emerald', 'external', 'active', 'João', 'Evento / Cobertura', null, date '2026-07-08', 'Projeto', array['Instagram', 'Facebook'], null, null, null, null, null, null, null, null, null, null, null),
  ('Junta de Freguesia de Porto Salvo', '05_JFPS', 'JFPS', 5, null, 'orange', 'external', 'active', 'Marta', 'Comunicação Interna Grupo', null, date '2026-07-09', 'Projeto', array['Facebook', 'Instagram'], null, null, null, null, null, null, null, null, null, null, null),
  ('Safe Vanguard', '06_SVG', 'SVG', 6, null, 'red', 'external', 'inactive', 'João', 'Branding', null, date '2026-07-05', 'Projeto', array['LinkedIn'], null, null, null, null, null, null, null, null, null, null, 'Cliente inativo para exemplo.'),
  ('ROOTKey', '07_RK', 'RK', 7, null, 'cyan', 'external', 'active', 'Sofia', 'Landing Page', null, date '2026-07-06', 'Projeto', array['LinkedIn', 'Instagram'], null, null, null, null, null, 'https://figma.com/file/rootkey', null, null, null, null, null),
  ('CAT Power Tools', '08_CAT', 'CAT', 8, null, 'yellow', 'external', 'active', 'Rita', 'Gestão de Redes Sociais', 1200, date '2026-07-04', '6 meses', array['Instagram', 'Meta'], null, null, null, null, null, null, null, null, null, null, null)
on conflict do nothing;

with seed_clients(name, client_code, short_name, display_order, color_key) as (
  values
    ('BlendByte', '00_BB', 'BB', 0, 'slate'),
    ('Grupo Investe', '01_GI', 'GI', 1, 'blue'),
    ('Invest2030', '02_I2030', 'I2030', 2, 'green'),
    ('Esportzy', '03_ESP', 'ESP', 3, 'violet'),
    ('Leões de Porto Salvo', '04_LPS', 'LPS', 4, 'emerald'),
    ('Junta de Freguesia de Porto Salvo', '05_JFPS', 'JFPS', 5, 'orange'),
    ('Safe Vanguard', '06_SVG', 'SVG', 6, 'red'),
    ('ROOTKey', '07_RK', 'RK', 7, 'cyan'),
    ('CAT Power Tools', '08_CAT', 'CAT', 8, 'yellow')
)
update public.clients c
set
  client_code = coalesce(c.client_code, s.client_code),
  short_name = coalesce(c.short_name, s.short_name),
  display_order = coalesce(c.display_order, s.display_order),
  color_key = coalesce(c.color_key, s.color_key)
from seed_clients s
where c.client_code = s.client_code or c.name = s.name;

insert into public.content_items
  (client_id, month, publish_date, platform, format, title, creative_brief, status, assignee_name, brief_url, media_folder_url, is_blocked, blocker_reason, notes)
select id, '2026-07', date '2026-07-01', 'Instagram', 'Carrossel', name || ': arranque do mês',
  'Conteúdo de exemplo para planeamento mensal.', 'pending', owner_name,
  'https://docs.google.com/document/d/sample-brief', 'https://drive.google.com/drive/folders/sample-media',
  name = 'Invest2030',
  case when name = 'Invest2030' then 'Aguardando imagens finais do cliente.' else null end,
  null
from public.clients
where client_code in ('00_BB', '01_GI', '02_I2030')
on conflict (client_id, month, title) do nothing;

insert into public.content_items
  (client_id, month, publish_date, platform, format, title, creative_brief, status, assignee_name, figma_url, delivery_url, notes)
select id, '2026-07', date '2026-07-03', 'LinkedIn', 'Post', name || ': insight semanal',
  'Peça curta de autoridade e marca.', 'ready_to_publish', owner_name, 'https://figma.com/file/content-example', null, null
from public.clients
where client_code in ('08_CAT', '07_RK')
on conflict (client_id, month, title) do nothing;

insert into public.tasks
  (client_id, title, type, status, priority, assignee_name, due_date, related_url, notes)
select id, name || ': rever calendário de julho', 'operations', 'pending', 'normal', owner_name, date '2026-07-01', google_drive_url, null
from public.clients
where client_code in ('00_BB', '01_GI', '02_I2030', '08_CAT')
on conflict (client_id, title) do nothing;

insert into public.tasks
  (client_id, title, type, status, priority, assignee_name, due_date, related_url, is_blocked, blocker_reason, notes)
select id, name || ': preparar criativos', 'design', 'in_progress', 'urgent', owner_name, date '2026-07-02', figma_project_url,
  name = 'Esportzy',
  case when name = 'Esportzy' then 'Falta aprovação do responsável interno.' else null end,
  null
from public.clients
where client_code in ('06_SVG', '07_RK', '03_ESP')
on conflict (client_id, title) do nothing;
