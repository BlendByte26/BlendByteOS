insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-logos',
  'client-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active users can read client logos" on storage.objects;
create policy "Active users can read client logos"
on storage.objects for select
to authenticated
using (bucket_id = 'client-logos' and public.is_active_internal_user());

drop policy if exists "Admins can insert client logos" on storage.objects;
create policy "Admins can insert client logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'client-logos' and public.current_user_profile_role() = 'admin');

drop policy if exists "Admins can delete client logos" on storage.objects;
create policy "Admins can delete client logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'client-logos' and public.current_user_profile_role() = 'admin');
