alter table public.clients
add column if not exists color_key text;

create index if not exists clients_color_key_idx on public.clients(color_key);

update public.clients
set color_key = case
  when client_code = '00_BB' or name ilike 'BlendByte%' then 'slate'
  when client_code = '01_GI' or name ilike 'Grupo Investe%' then 'blue'
  when client_code = '02_I2030' or name ilike 'Invest2030%' then 'green'
  when client_code = '03_ESP' or name ilike 'Esportzy%' then 'violet'
  when client_code = '04_LPS' or name ilike 'Leões de Porto Salvo%' then 'emerald'
  when client_code = '05_JFPS' or name ilike 'Junta de Freguesia de Porto Salvo%' then 'orange'
  when client_code = '06_SVG' or name ilike 'Safe Vanguard%' then 'red'
  when client_code = '07_RK' or name ilike 'ROOTKey%' then 'cyan'
  when client_code = '08_CAT' or name ilike 'CAT Power Tools%' then 'yellow'
  else color_key
end
where color_key is null
  and (
    client_code in ('00_BB', '01_GI', '02_I2030', '03_ESP', '04_LPS', '05_JFPS', '06_SVG', '07_RK', '08_CAT')
    or name ilike any (array[
      'BlendByte%',
      'Grupo Investe%',
      'Invest2030%',
      'Esportzy%',
      'Leões de Porto Salvo%',
      'Junta de Freguesia de Porto Salvo%',
      'Safe Vanguard%',
      'ROOTKey%',
      'CAT Power Tools%'
    ])
  );
