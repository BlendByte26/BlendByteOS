drop index if exists public.content_items_seed_unique_idx;

create or replace function public.enforce_content_publish_identity_unique()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Existing duplicate identities can still be edited without changing their identity.
  if tg_op = 'UPDATE'
    and (new.client_id, new.publish_date, new.title, new.platform)
      is not distinct from
      (old.client_id, old.publish_date, old.title, old.platform)
  then
    return new;
  end if;

  if new.publish_date is not null and exists (
    select 1
    from public.content_items existing
    where existing.id <> new.id
      and existing.client_id = new.client_id
      and existing.publish_date = new.publish_date
      and existing.title = new.title
      and existing.platform = new.platform
  ) then
    raise exception using
      errcode = '23505',
      message = 'content_items_publish_identity_unique: duplicate client, day, title and platform';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_content_publish_identity_unique() from public, anon, authenticated;

drop trigger if exists enforce_content_publish_identity_unique on public.content_items;
create trigger enforce_content_publish_identity_unique
before insert or update of client_id, publish_date, title, platform on public.content_items
for each row execute function public.enforce_content_publish_identity_unique();
