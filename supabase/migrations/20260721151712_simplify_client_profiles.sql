alter table public.clients
  add column if not exists brand_guidelines_url text;

update public.clients
set
  drive_url = coalesce(
    nullif(btrim(drive_url), ''),
    nullif(btrim(google_drive_url), ''),
    nullif(btrim(onedrive_url), '')
  ),
  figma_url = coalesce(
    nullif(btrim(figma_url), ''),
    nullif(btrim(figma_project_url), '')
  );

alter table public.clients alter column status drop default;

create type public.client_status_simplified as enum ('active', 'inactive');

alter table public.clients
  alter column status type public.client_status_simplified
  using (
    case
      when status::text = 'active' then 'active'
      else 'inactive'
    end
  )::public.client_status_simplified;

drop type public.client_status;
alter type public.client_status_simplified rename to client_status;

alter table public.clients
  alter column status set default 'active';

comment on column public.clients.drive_url is
  'Pasta principal com os materiais de trabalho do cliente.';

comment on column public.clients.figma_url is
  'Projeto ou ficheiro Figma principal do cliente.';

comment on column public.clients.meta_url is
  'Ferramenta Meta usada para coordenar, agendar ou publicar nas redes do cliente.';

comment on column public.clients.brand_guidelines_url is
  'Manual de normas ou guia de identidade da marca do cliente.';
