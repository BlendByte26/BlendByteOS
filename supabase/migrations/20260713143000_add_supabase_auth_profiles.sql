create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  profile_key text unique not null,
  display_name text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_profile_key_check
    check (profile_key in ('guilherme', 'sofia', 'carlota', 'carolina')),
  constraint user_profiles_role_check
    check (role in ('admin', 'marketing', 'design'))
);

create index if not exists user_profiles_auth_user_active_idx
on public.user_profiles(auth_user_id, active);

create index if not exists user_profiles_role_idx
on public.user_profiles(role);

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.content_items enable row level security;
alter table public.content_comments enable row level security;
alter table public.tasks enable row level security;
alter table public.team_members enable row level security;
alter table public.company_contacts enable row level security;
alter table public.quick_todos enable row level security;
alter table public.quick_notes enable row level security;

create or replace function public.current_user_profile_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.auth_user_id = (select auth.uid())
    and up.active = true
  limit 1
$$;

create or replace function public.current_user_profile_key()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select up.profile_key
  from public.user_profiles up
  where up.auth_user_id = (select auth.uid())
    and up.active = true
  limit 1
$$;

create or replace function public.is_active_internal_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = (select auth.uid())
      and up.active = true
  )
$$;

grant usage on schema public to anon, authenticated;

revoke all on public.user_profiles from anon;
grant select on public.user_profiles to authenticated;

revoke all on public.clients from anon;
revoke all on public.content_items from anon;
revoke all on public.content_comments from anon;
revoke all on public.tasks from anon;
revoke all on public.team_members from anon;
revoke all on public.company_contacts from anon;
revoke all on public.quick_todos from anon;
revoke all on public.quick_notes from anon;

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.content_items to authenticated;
grant select, insert, update, delete on public.content_comments to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.company_contacts to authenticated;
grant select, insert, update, delete on public.quick_todos to authenticated;
grant select, insert, update, delete on public.quick_notes to authenticated;

grant execute on function public.current_user_profile_role() to anon, authenticated;
grant execute on function public.current_user_profile_key() to anon, authenticated;
grant execute on function public.is_active_internal_user() to anon, authenticated;

-- Temporary Invest2030 public compatibility:
-- The public request pages still create/read a linked task server-side. These narrow anon
-- grants and policies replace the former open anon access and should be removed once
-- Invest2030 is moved behind a dedicated server-side service flow.
grant select on public.clients to anon;
grant select, insert on public.tasks to anon;
grant select on public.team_members to anon;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'user_profiles',
        'clients',
        'content_items',
        'content_comments',
        'tasks',
        'team_members',
        'company_contacts',
        'quick_todos',
        'quick_notes'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy "Users can read their own profile"
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy "Active users can read clients"
on public.clients for select
to authenticated
using (public.is_active_internal_user());

create policy "Admins can insert clients"
on public.clients for insert
to authenticated
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can update clients"
on public.clients for update
to authenticated
using (public.current_user_profile_role() = 'admin')
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can delete clients"
on public.clients for delete
to authenticated
using (public.current_user_profile_role() = 'admin');

create policy "Public Invest2030 can read its client"
on public.clients for select
to anon
using (
  name = 'Invest2030'
  or client_code = '02_I2030'
  or short_name = 'I2030'
);

create policy "Active users can read content"
on public.content_items for select
to authenticated
using (public.is_active_internal_user());

create policy "Active users can insert content"
on public.content_items for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing', 'design'));

create policy "Active users can update content"
on public.content_items for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing', 'design'))
with check (public.current_user_profile_role() in ('admin', 'marketing', 'design'));

create policy "Admins and marketing can delete content"
on public.content_items for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Active users can read content comments"
on public.content_comments for select
to authenticated
using (public.is_active_internal_user());

create policy "Active users can insert content comments"
on public.content_comments for insert
to authenticated
with check (
  public.is_active_internal_user()
  and author_profile_key = public.current_user_profile_key()
);

create policy "Authors can update content comments"
on public.content_comments for update
to authenticated
using (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
)
with check (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
);

create policy "Authors and admins can delete content comments"
on public.content_comments for delete
to authenticated
using (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
);

create policy "Active users can read tasks"
on public.tasks for select
to authenticated
using (public.is_active_internal_user());

create policy "Active users can insert tasks"
on public.tasks for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing', 'design'));

create policy "Active users can update tasks"
on public.tasks for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing', 'design'))
with check (public.current_user_profile_role() in ('admin', 'marketing', 'design'));

create policy "Admins and marketing can delete tasks"
on public.tasks for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Public Invest2030 can read linked tasks"
on public.tasks for select
to anon
using (title like '[Invest2030] %');

create policy "Public Invest2030 can create linked tasks"
on public.tasks for insert
to anon
with check (
  title like '[Invest2030] %'
  and type = 'operations'
  and status = 'todo'
  and (assignee_name is null or assignee_name = 'Sofia')
);

create policy "Active users can read team members"
on public.team_members for select
to authenticated
using (public.is_active_internal_user());

create policy "Admins can insert team members"
on public.team_members for insert
to authenticated
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can update team members"
on public.team_members for update
to authenticated
using (public.current_user_profile_role() = 'admin')
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can delete team members"
on public.team_members for delete
to authenticated
using (public.current_user_profile_role() = 'admin');

create policy "Public Invest2030 can read Sofia assignee"
on public.team_members for select
to anon
using (name = 'Sofia' and active = true);

create policy "Active users can read company contacts"
on public.company_contacts for select
to authenticated
using (public.is_active_internal_user());

create policy "Admins can insert company contacts"
on public.company_contacts for insert
to authenticated
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can update company contacts"
on public.company_contacts for update
to authenticated
using (public.current_user_profile_role() = 'admin')
with check (public.current_user_profile_role() = 'admin');

create policy "Admins can delete company contacts"
on public.company_contacts for delete
to authenticated
using (public.current_user_profile_role() = 'admin');

create policy "Users can read own quick todos"
on public.quick_todos for select
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can insert own quick todos"
on public.quick_todos for insert
to authenticated
with check (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can update own quick todos"
on public.quick_todos for update
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
)
with check (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can delete own quick todos"
on public.quick_todos for delete
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can read own quick notes"
on public.quick_notes for select
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can insert own quick notes"
on public.quick_notes for insert
to authenticated
with check (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can update own quick notes"
on public.quick_notes for update
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
)
with check (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);

create policy "Users can delete own quick notes"
on public.quick_notes for delete
to authenticated
using (
  public.is_active_internal_user()
  and profile_key = public.current_user_profile_key()
);
