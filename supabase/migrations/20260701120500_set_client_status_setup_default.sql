alter table public.clients
alter column status set default 'setup'::client_status;
