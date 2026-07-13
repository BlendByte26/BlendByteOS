-- SCRIPT MANUAL JÁ APLICADO EM 2026-07-07. NÃO CORRER NOVAMENTE SEM BACKUP. LIMPA DADOS OPERACIONAIS.
-- Prepare BlendByteOS for real use.
-- Destructive data cleanup: this deletes operational rows, then inserts the final base team and clients.
-- Tables are preserved. Schema, auth, policies, and existing migrations are not removed.

begin;

-- 1) Ensure operational profile columns exist before reminders are used.
alter table public.quick_todos
add column if not exists profile_key text default 'guilherme';

alter table public.quick_notes
add column if not exists profile_key text default 'guilherme';

update public.quick_todos
set profile_key = 'guilherme'
where profile_key is null;

update public.quick_notes
set profile_key = 'guilherme'
where profile_key is null;

alter table public.quick_todos
alter column profile_key set default 'guilherme',
alter column profile_key set not null;

alter table public.quick_notes
alter column profile_key set default 'guilherme',
alter column profile_key set not null;

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
    check (profile_key in ('guilherme', 'carlota', 'carolina', 'sofia'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_notes_profile_key_check'
      and conrelid = 'public.quick_notes'::regclass
  ) then
    alter table public.quick_notes
    add constraint quick_notes_profile_key_check
    check (profile_key in ('guilherme', 'carlota', 'carolina', 'sofia'));
  end if;
end $$;

create index if not exists quick_todos_profile_view_done_idx
on public.quick_todos(profile_key, view, done);

create index if not exists quick_notes_profile_view_created_at_idx
on public.quick_notes(profile_key, view, created_at);

-- 2) Clean operational/demo data.
delete from public.content_items;
delete from public.tasks;
delete from public.quick_todos;
delete from public.quick_notes;
delete from public.company_contacts;
delete from public.team_members;
delete from public.clients;

-- 3) Insert final base team.
insert into public.team_members (name, email, phone, role, active, display_order)
values
  ('Guilherme', null, null, 'Direção / Operações', true, 1),
  ('Carlota', null, null, 'Design', true, 2),
  ('Carolina', null, null, 'Design', true, 3),
  ('Sofia', null, null, 'Marketing / Client Ops', true, 4);

-- 4) Insert final base clients.
insert into public.clients (
  name,
  client_code,
  short_name,
  display_order,
  type,
  status,
  owner_name,
  service_type,
  service_types,
  monthly_value,
  contract_value,
  start_date,
  contract_duration,
  platforms,
  notes
)
values
  ('BlendByte', '00_BB', 'BB', 1, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Grupo Investe', '01_GI', 'GI', 2, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Invest2030', '02_I2030', 'I2030', 3, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Esportzy', '03_ESP', 'ESP', 4, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Leões de Porto Salvo', '04_LPS', 'LPS', 5, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Junta de Freguesia de Porto Salvo', '05_JFPS', 'JFPS', 6, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('Safe Vanguard', '06_SVG', 'SVG', 7, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('ROOTKey', '07_RK', 'RK', 8, 'internal', 'active', null, null, '{}', null, null, null, null, '{}', null),
  ('CAT Power Tools', '08_CAT', 'CAT', 9, 'external', 'active', null, null, '{}', null, null, null, null, '{}', null);

commit;
