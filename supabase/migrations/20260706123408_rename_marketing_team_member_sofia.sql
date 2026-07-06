update public.team_members
set name = 'Sofia', role = 'Marketing / Client Ops'
where name = 'Estagiário Marketing/Client Ops'
  and not exists (
    select 1 from public.team_members existing
    where existing.name = 'Sofia'
  );

delete from public.team_members
where name = 'Estagiário Marketing/Client Ops';

insert into public.team_members (name, email, role, active, display_order)
values ('Sofia', null, 'Marketing / Client Ops', true, 4)
on conflict (name) do update
set
  role = excluded.role,
  active = excluded.active,
  display_order = excluded.display_order;
