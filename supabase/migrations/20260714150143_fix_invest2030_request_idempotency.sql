drop index if exists public.tasks_seed_unique_idx;

alter table public.invest2030_requests
add column if not exists submission_key uuid;

create unique index if not exists invest2030_requests_submission_key_unique_idx
on public.invest2030_requests(submission_key)
where submission_key is not null;
