alter table public.quick_todos
drop constraint if exists quick_todos_profile_key_check;

alter table public.quick_todos
add constraint quick_todos_profile_key_check
check (profile_key in ('carlota', 'carolina', 'sofia', 'guilherme'));

alter table public.quick_notes
drop constraint if exists quick_notes_profile_key_check;

alter table public.quick_notes
add constraint quick_notes_profile_key_check
check (profile_key in ('carlota', 'carolina', 'sofia', 'guilherme'));

insert into public.team_members (name, email, phone, role, active, display_order)
values
  ('Carolina', null, null, 'Design', true, 3)
on conflict (name) do update
set
  role = excluded.role,
  active = excluded.active,
  display_order = excluded.display_order;

update public.team_members
set role = 'Design', display_order = 2
where name = 'Carlota';

update public.team_members
set display_order = 4
where name = 'Estagiário Design';

update public.team_members
set display_order = 5
where name = 'Sofia';
