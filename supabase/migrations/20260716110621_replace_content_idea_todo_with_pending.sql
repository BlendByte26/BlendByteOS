do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'content_status'
      and e.enumlabel in ('idea', 'todo')
  ) then
    drop type if exists content_status_new;

    create type content_status_new as enum (
      'pending',
      'in_progress',
      'ready_to_publish',
      'published',
      'archived'
    );

    alter table public.content_items
      alter column status drop default;

    alter table public.content_items
      alter column status type content_status_new
      using (
        case status::text
          when 'idea' then 'pending'
          when 'todo' then 'pending'
          else status::text
        end
      )::content_status_new;

    alter table public.content_items
      alter column status set default 'pending'::content_status_new;

    drop type content_status;
    alter type content_status_new rename to content_status;
  else
    alter table public.content_items
      alter column status set default 'pending'::content_status;
  end if;
end $$;
