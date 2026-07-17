create table if not exists public.vacation_balances (
  id uuid primary key default gen_random_uuid(), team_member_id uuid not null references public.team_members(id) on delete restrict,
  year integer not null check (year between 2000 and 2200), entitled_days numeric(6,2) not null default 22 check (entitled_days >= 0),
  carried_over_days numeric(6,2) not null default 0, adjustment_days numeric(6,2) not null default 0, admin_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (team_member_id, year)
);
create table if not exists public.vacation_requests (
  id uuid primary key default gen_random_uuid(), team_member_id uuid not null references public.team_members(id) on delete restrict,
  start_date date not null, end_date date not null, working_days numeric(6,2) not null check (working_days > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  employee_note text, admin_note text, requested_by_profile text not null, decided_by_profile text, decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date >= start_date), check (extract(year from start_date) = extract(year from end_date))
);
create table if not exists public.custom_holidays (
  id uuid primary key default gen_random_uuid(), holiday_date date not null, name text not null check (char_length(btrim(name)) > 0),
  holiday_type text not null check (holiday_type in ('municipal','company','custom')), active boolean not null default true,
  created_by_profile text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists vacation_balances_member_year_idx on public.vacation_balances(team_member_id, year);
create index if not exists vacation_requests_member_idx on public.vacation_requests(team_member_id);
create index if not exists vacation_requests_status_idx on public.vacation_requests(status);
create index if not exists vacation_requests_dates_idx on public.vacation_requests(start_date, end_date);
create index if not exists custom_holidays_date_idx on public.custom_holidays(holiday_date);
drop trigger if exists set_vacation_balances_updated_at on public.vacation_balances;
create trigger set_vacation_balances_updated_at before update on public.vacation_balances for each row execute function public.set_updated_at();
drop trigger if exists set_vacation_requests_updated_at on public.vacation_requests;
create trigger set_vacation_requests_updated_at before update on public.vacation_requests for each row execute function public.set_updated_at();
drop trigger if exists set_custom_holidays_updated_at on public.custom_holidays;
create trigger set_custom_holidays_updated_at before update on public.custom_holidays for each row execute function public.set_updated_at();
alter table public.vacation_balances enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.custom_holidays enable row level security;
revoke all on public.vacation_balances, public.vacation_requests, public.custom_holidays from anon;
grant select, insert, update, delete on public.vacation_balances, public.vacation_requests, public.custom_holidays to authenticated;
create policy "Internal read vacation balances" on public.vacation_balances for select to authenticated using (
  public.current_user_profile_key() = 'guilherme' or exists (select 1 from public.team_members tm where tm.id = team_member_id and lower(tm.name) = public.current_user_profile_key())
);
create policy "Internal write vacation balances" on public.vacation_balances for all to authenticated using (public.current_user_profile_key() = 'guilherme') with check (public.current_user_profile_key() = 'guilherme');
create policy "Internal read vacation requests" on public.vacation_requests for select to authenticated using (
  public.current_user_profile_key() = 'guilherme' or status = 'approved' or requested_by_profile = public.current_user_profile_key()
);
create policy "Internal insert vacation requests" on public.vacation_requests for insert to authenticated with check (
  public.current_user_profile_key() = 'guilherme' or (requested_by_profile = public.current_user_profile_key() and status = 'pending' and exists (select 1 from public.team_members tm where tm.id = team_member_id and lower(tm.name) = public.current_user_profile_key()))
);
create policy "Admin update vacation requests" on public.vacation_requests for update to authenticated using (public.current_user_profile_key() = 'guilherme') with check (public.current_user_profile_key() = 'guilherme');
create policy "Employee cancel pending vacation request" on public.vacation_requests for update to authenticated using (requested_by_profile = public.current_user_profile_key() and status = 'pending') with check (requested_by_profile = public.current_user_profile_key() and status = 'cancelled');
create policy "Internal read custom holidays" on public.custom_holidays for select to authenticated using (public.is_active_internal_user());
create policy "Internal write custom holidays" on public.custom_holidays for all to authenticated using (public.current_user_profile_key() = 'guilherme') with check (public.current_user_profile_key() = 'guilherme');
