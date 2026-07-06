create table if not exists public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  view text not null check (view in ('marketing', 'design')),
  text text not null check (char_length(btrim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) > 0),
  email text not null check (char_length(btrim(email)) > 0),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quick_notes_view_created_at_idx on public.quick_notes(view, created_at);
create index if not exists company_contacts_label_idx on public.company_contacts(label);

drop trigger if exists set_quick_notes_updated_at on public.quick_notes;
create trigger set_quick_notes_updated_at
before update on public.quick_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_company_contacts_updated_at on public.company_contacts;
create trigger set_company_contacts_updated_at
before update on public.company_contacts
for each row execute function public.set_updated_at();

alter table public.quick_notes enable row level security;
alter table public.company_contacts enable row level security;

grant select, insert, update, delete on public.quick_notes to anon, authenticated;
grant select, insert, update, delete on public.company_contacts to anon, authenticated;

drop policy if exists "Open internal read quick notes" on public.quick_notes;
create policy "Open internal read quick notes"
on public.quick_notes for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert quick notes" on public.quick_notes;
create policy "Open internal insert quick notes"
on public.quick_notes for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update quick notes" on public.quick_notes;
create policy "Open internal update quick notes"
on public.quick_notes for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete quick notes" on public.quick_notes;
create policy "Open internal delete quick notes"
on public.quick_notes for delete
to anon, authenticated
using (true);

drop policy if exists "Open internal read company contacts" on public.company_contacts;
create policy "Open internal read company contacts"
on public.company_contacts for select
to anon, authenticated
using (true);

drop policy if exists "Open internal insert company contacts" on public.company_contacts;
create policy "Open internal insert company contacts"
on public.company_contacts for insert
to anon, authenticated
with check (true);

drop policy if exists "Open internal update company contacts" on public.company_contacts;
create policy "Open internal update company contacts"
on public.company_contacts for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Open internal delete company contacts" on public.company_contacts;
create policy "Open internal delete company contacts"
on public.company_contacts for delete
to anon, authenticated
using (true);
