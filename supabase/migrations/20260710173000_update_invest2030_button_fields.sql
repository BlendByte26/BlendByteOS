alter table public.invest2030_requests
alter column main_link drop not null;

update public.invest2030_requests
set action_type = replace(action_type, 'Diretrizes de conteúdo', 'Redes Sociais')
where action_type like '%Diretrizes de conteúdo%';
