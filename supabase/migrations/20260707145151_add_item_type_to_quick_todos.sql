alter table public.quick_todos
add column if not exists item_type text not null default 'todo';

update public.quick_todos
set item_type = 'todo'
where item_type is null
   or item_type not in ('todo', 'reminder');

alter table public.quick_todos
alter column item_type set default 'todo',
alter column item_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_todos_item_type_check'
      and conrelid = 'public.quick_todos'::regclass
  ) then
    alter table public.quick_todos
    add constraint quick_todos_item_type_check
    check (item_type in ('todo', 'reminder'));
  end if;
end $$;

create index if not exists quick_todos_profile_view_type_done_idx
on public.quick_todos(profile_key, view, item_type, done);
