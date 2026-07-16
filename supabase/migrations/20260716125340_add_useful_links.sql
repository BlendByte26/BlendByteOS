create table if not exists public.useful_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists useful_links_sort_name_idx
on public.useful_links(sort_order, name);

drop trigger if exists set_useful_links_updated_at on public.useful_links;
create trigger set_useful_links_updated_at
before update on public.useful_links
for each row execute function public.set_updated_at();

alter table public.useful_links enable row level security;

revoke all on public.useful_links from anon;
grant select, insert, update, delete on public.useful_links to authenticated;

drop policy if exists "Active users can read useful links" on public.useful_links;
create policy "Active users can read useful links"
on public.useful_links for select
to authenticated
using (public.is_active_internal_user());

drop policy if exists "Admins can insert useful links" on public.useful_links;
create policy "Admins can insert useful links"
on public.useful_links for insert
to authenticated
with check (public.current_user_profile_role() = 'admin');

drop policy if exists "Admins can update useful links" on public.useful_links;
create policy "Admins can update useful links"
on public.useful_links for update
to authenticated
using (public.current_user_profile_role() = 'admin')
with check (public.current_user_profile_role() = 'admin');

drop policy if exists "Admins can delete useful links" on public.useful_links;
create policy "Admins can delete useful links"
on public.useful_links for delete
to authenticated
using (public.current_user_profile_role() = 'admin');
