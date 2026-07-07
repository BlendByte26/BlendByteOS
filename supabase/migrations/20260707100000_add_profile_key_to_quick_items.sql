alter table public.quick_todos
add column if not exists profile_key text not null default 'guilherme';

alter table public.quick_notes
add column if not exists profile_key text not null default 'guilherme';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_todos_profile_key_check'
      and conrelid = 'public.quick_todos'::regclass
  ) then
    alter table public.quick_todos
    add constraint quick_todos_profile_key_check
    check (profile_key in ('carlota', 'sofia', 'guilherme'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_notes_profile_key_check'
      and conrelid = 'public.quick_notes'::regclass
  ) then
    alter table public.quick_notes
    add constraint quick_notes_profile_key_check
    check (profile_key in ('carlota', 'sofia', 'guilherme'));
  end if;
end $$;

create index if not exists quick_todos_profile_view_done_idx
on public.quick_todos(profile_key, view, done);

create index if not exists quick_notes_profile_view_created_at_idx
on public.quick_notes(profile_key, view, created_at);
