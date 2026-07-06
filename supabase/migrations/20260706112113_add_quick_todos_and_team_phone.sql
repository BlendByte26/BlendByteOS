alter table public.team_members add column if not exists phone text;

create table if not exists public.quick_todos (
  id uuid primary key default gen_random_uuid(),
  view text not null check (view in ('marketing', 'design')),
  text text not null check (char_length(btrim(text)) > 0),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quick_todos_view_done_idx on public.quick_todos(view, done);
create index if not exists quick_todos_created_at_idx on public.quick_todos(created_at);

drop trigger if exists set_quick_todos_updated_at on public.quick_todos;
create trigger set_quick_todos_updated_at
before update on public.quick_todos
for each row execute function public.set_updated_at();

alter table public.quick_todos enable row level security;

grant select, insert, update, delete on public.quick_todos to anon, authenticated;

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
