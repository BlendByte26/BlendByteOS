create table public.content_review_rounds (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  version integer not null check (version > 0),
  status text not null default 'open'
    check (status in ('draft', 'open', 'submitted', 'approved', 'changes_requested', 'superseded', 'revoked')),
  access_token_hash text not null unique check (char_length(access_token_hash) = 64),
  client_name text not null,
  client_logo_url text,
  recipient_name text,
  recipient_email text,
  approval_deadline date,
  introduction text,
  owner_profile_key text not null check (owner_profile_key in ('guilherme', 'sofia')),
  owner_name text not null,
  submitted_by_name text,
  submitted_by_email text,
  published_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month, version)
);

create table public.content_review_blocks (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.content_review_rounds(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  position integer not null check (position >= 0),
  decision text not null default 'pending'
    check (decision in ('pending', 'approved', 'changes_requested')),
  client_comment text,
  feedback_submitted_at timestamptz,
  revision_task_id uuid references public.tasks(id) on delete set null,
  revision_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, position)
);

create table public.content_review_block_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.content_review_blocks(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  position integer not null check (position >= 0),
  publish_date date,
  publish_time time,
  platform text not null,
  format text,
  title text not null,
  copy_text text,
  description text,
  content_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, position)
);

create table public.content_review_assets (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.content_review_blocks(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, position)
);

create table public.content_review_asset_items (
  asset_id uuid not null references public.content_review_assets(id) on delete cascade,
  block_item_id uuid not null references public.content_review_block_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (asset_id, block_item_id)
);

create index content_review_rounds_client_month_idx
on public.content_review_rounds(client_id, month, version desc);

create index content_review_rounds_status_idx
on public.content_review_rounds(status, published_at desc);

create index content_review_blocks_round_idx
on public.content_review_blocks(round_id, position);

create index content_review_block_items_content_idx
on public.content_review_block_items(content_item_id);

create index content_review_assets_block_idx
on public.content_review_assets(block_id, position);

drop trigger if exists set_content_review_rounds_updated_at on public.content_review_rounds;
create trigger set_content_review_rounds_updated_at
before update on public.content_review_rounds
for each row execute function public.set_updated_at();

drop trigger if exists set_content_review_blocks_updated_at on public.content_review_blocks;
create trigger set_content_review_blocks_updated_at
before update on public.content_review_blocks
for each row execute function public.set_updated_at();

drop trigger if exists set_content_review_block_items_updated_at on public.content_review_block_items;
create trigger set_content_review_block_items_updated_at
before update on public.content_review_block_items
for each row execute function public.set_updated_at();

drop trigger if exists set_content_review_assets_updated_at on public.content_review_assets;
create trigger set_content_review_assets_updated_at
before update on public.content_review_assets
for each row execute function public.set_updated_at();

alter table public.content_review_rounds enable row level security;
alter table public.content_review_blocks enable row level security;
alter table public.content_review_block_items enable row level security;
alter table public.content_review_assets enable row level security;
alter table public.content_review_asset_items enable row level security;

revoke all on public.content_review_rounds from anon, authenticated;
revoke all on public.content_review_blocks from anon, authenticated;
revoke all on public.content_review_block_items from anon, authenticated;
revoke all on public.content_review_assets from anon, authenticated;
revoke all on public.content_review_asset_items from anon, authenticated;

grant select, insert, update, delete on public.content_review_rounds to authenticated, service_role;
grant select, insert, update, delete on public.content_review_blocks to authenticated, service_role;
grant select, insert, update, delete on public.content_review_block_items to authenticated, service_role;
grant select, insert, update, delete on public.content_review_assets to authenticated, service_role;
grant select, insert, delete on public.content_review_asset_items to authenticated, service_role;

create policy "Admin and marketing can read content review rounds"
on public.content_review_rounds for select
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can insert content review rounds"
on public.content_review_rounds for insert
to authenticated
with check (
  public.current_user_profile_role() in ('admin', 'marketing')
  and owner_profile_key = public.current_user_profile_key()
);

create policy "Admin and marketing can update content review rounds"
on public.content_review_rounds for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'))
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can delete content review rounds"
on public.content_review_rounds for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can read content review blocks"
on public.content_review_blocks for select
to authenticated
using (
  public.current_user_profile_role() in ('admin', 'marketing')
  and exists (
    select 1 from public.content_review_rounds review_round
    where review_round.id = round_id
  )
);

create policy "Admin and marketing can insert content review blocks"
on public.content_review_blocks for insert
to authenticated
with check (
  public.current_user_profile_role() in ('admin', 'marketing')
  and exists (
    select 1 from public.content_review_rounds review_round
    where review_round.id = round_id
  )
);

create policy "Admin and marketing can update content review blocks"
on public.content_review_blocks for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'))
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can delete content review blocks"
on public.content_review_blocks for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can read content review block items"
on public.content_review_block_items for select
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can insert content review block items"
on public.content_review_block_items for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can update content review block items"
on public.content_review_block_items for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'))
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can delete content review block items"
on public.content_review_block_items for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can read content review assets"
on public.content_review_assets for select
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can insert content review assets"
on public.content_review_assets for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can update content review assets"
on public.content_review_assets for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'))
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can delete content review assets"
on public.content_review_assets for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can read content review asset links"
on public.content_review_asset_items for select
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can insert content review asset links"
on public.content_review_asset_items for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing'));

create policy "Admin and marketing can delete content review asset links"
on public.content_review_asset_items for delete
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-review-assets',
  'content-review-assets',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin and marketing can read content review files" on storage.objects;
create policy "Admin and marketing can read content review files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'content-review-assets'
  and public.current_user_profile_role() in ('admin', 'marketing')
);

drop policy if exists "Admin and marketing can upload content review files" on storage.objects;
create policy "Admin and marketing can upload content review files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'content-review-assets'
  and public.current_user_profile_role() in ('admin', 'marketing')
);

drop policy if exists "Admin and marketing can update content review files" on storage.objects;
create policy "Admin and marketing can update content review files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'content-review-assets'
  and public.current_user_profile_role() in ('admin', 'marketing')
)
with check (
  bucket_id = 'content-review-assets'
  and public.current_user_profile_role() in ('admin', 'marketing')
);

drop policy if exists "Admin and marketing can delete content review files" on storage.objects;
create policy "Admin and marketing can delete content review files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'content-review-assets'
  and public.current_user_profile_role() in ('admin', 'marketing')
);
