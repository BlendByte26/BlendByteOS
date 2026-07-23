alter table public.content_review_rounds
add column archived_at timestamptz,
add column archived_by_profile_key text
  check (archived_by_profile_key is null or archived_by_profile_key in ('guilherme', 'sofia')),
add column archived_by_name text;

alter table public.content_review_rounds
add constraint content_review_rounds_archive_metadata_check
check (
  (archived_at is null and archived_by_profile_key is null and archived_by_name is null)
  or
  (
    archived_at is not null
    and archived_by_profile_key is not null
    and char_length(btrim(archived_by_name)) > 0
  )
);

create index content_review_rounds_archived_idx
on public.content_review_rounds(archived_at, published_at desc);
