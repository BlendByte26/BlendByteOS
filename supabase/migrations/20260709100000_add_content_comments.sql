create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  author_profile_key text not null,
  author_name text not null,
  body text not null,
  mentioned_profile_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_comments_content_created_at_idx
on public.content_comments(content_id, created_at);

create index if not exists content_comments_mentions_idx
on public.content_comments using gin(mentioned_profile_keys);

drop trigger if exists set_content_comments_updated_at on public.content_comments;
create trigger set_content_comments_updated_at
before update on public.content_comments
for each row execute function public.set_updated_at();

alter table public.content_comments enable row level security;

grant select, insert, update, delete on public.content_comments to anon, authenticated;

drop policy if exists "Open internal read content comments" on public.content_comments;
create policy "Open internal read content comments"
on public.content_comments for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert content comments" on public.content_comments;
create policy "Open internal insert content comments"
on public.content_comments for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update content comments" on public.content_comments;
create policy "Open internal update content comments"
on public.content_comments for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete content comments" on public.content_comments;
create policy "Open internal delete content comments"
on public.content_comments for delete
to anon, authenticated
using (true);
