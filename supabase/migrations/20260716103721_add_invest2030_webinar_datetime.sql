alter table public.invest2030_requests
  add column if not exists webinar_date date,
  add column if not exists webinar_time time;

create index if not exists invest2030_requests_webinar_date_idx
on public.invest2030_requests(webinar_date);
