alter table public.clients
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_name text;

comment on column public.clients.contact_email is
  'Email geral ou principal da empresa cliente.';

comment on column public.clients.contact_phone is
  'Número de telefone geral ou principal da empresa cliente.';

comment on column public.clients.contact_name is
  'Nome opcional da pessoa que contacta habitualmente com a BlendByte.';
