create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_profile_key text not null,
  author_name text not null,
  body text not null check (char_length(btrim(body)) > 0),
  mentioned_profile_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_comments_task_created_at_idx
on public.task_comments(task_id, created_at);

create index if not exists task_comments_mentions_idx
on public.task_comments using gin(mentioned_profile_keys);

drop trigger if exists set_task_comments_updated_at on public.task_comments;
create trigger set_task_comments_updated_at
before update on public.task_comments
for each row execute function public.set_updated_at();

alter table public.task_comments enable row level security;

revoke all on public.task_comments from anon;
grant select, insert, update, delete on public.task_comments to authenticated;

drop policy if exists "Active users can read task comments" on public.task_comments;
create policy "Active users can read task comments"
on public.task_comments for select
to authenticated
using (public.is_active_internal_user());

drop policy if exists "Active users can insert task comments" on public.task_comments;
create policy "Active users can insert task comments"
on public.task_comments for insert
to authenticated
with check (
  public.is_active_internal_user()
  and author_profile_key = public.current_user_profile_key()
);

drop policy if exists "Authors can update task comments" on public.task_comments;
create policy "Authors can update task comments"
on public.task_comments for update
to authenticated
using (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
)
with check (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
);

drop policy if exists "Authors and admins can delete task comments" on public.task_comments;
create policy "Authors and admins can delete task comments"
on public.task_comments for delete
to authenticated
using (
  public.current_user_profile_role() = 'admin'
  or author_profile_key = public.current_user_profile_key()
);

drop policy if exists "Admins can insert useful links" on public.useful_links;
drop policy if exists "Active users can insert useful links" on public.useful_links;
create policy "Active users can insert useful links"
on public.useful_links for insert
to authenticated
with check (public.is_active_internal_user());
