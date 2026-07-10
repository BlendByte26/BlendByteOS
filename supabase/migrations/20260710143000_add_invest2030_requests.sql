create table if not exists public.invest2030_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  campaign_name text not null,
  action_type text not null,
  requested_by text not null,
  period_type text not null,
  period_start date not null,
  period_end date not null,
  period_label text not null,
  main_goal text not null,
  target_audience text not null,
  main_cta text not null,
  main_link text not null,
  main_message text not null,
  mandatory_info text not null,
  information_status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invest2030_requests_task_id_idx on public.invest2030_requests(task_id);
create index if not exists invest2030_requests_created_at_idx on public.invest2030_requests(created_at);
create index if not exists invest2030_requests_period_start_idx on public.invest2030_requests(period_start);
create index if not exists invest2030_requests_action_type_idx on public.invest2030_requests(action_type);
create index if not exists invest2030_requests_requested_by_idx on public.invest2030_requests(requested_by);
create index if not exists invest2030_requests_information_status_idx on public.invest2030_requests(information_status);

drop trigger if exists set_invest2030_requests_updated_at on public.invest2030_requests;
create trigger set_invest2030_requests_updated_at
before update on public.invest2030_requests
for each row execute function public.set_updated_at();

alter table public.invest2030_requests enable row level security;

grant select, insert, update, delete on public.invest2030_requests to anon, authenticated;

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
