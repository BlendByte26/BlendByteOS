alter table public.clients
add column if not exists setup_checklist jsonb,
add column if not exists reporting_url text,
add column if not exists initial_briefing_url text,
add column if not exists conditions_url text,
add column if not exists linkedin_campaign_manager_url text;
