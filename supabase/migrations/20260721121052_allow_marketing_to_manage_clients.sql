drop policy if exists "Admins can insert clients" on public.clients;
drop policy if exists "Admins and marketing can insert clients" on public.clients;
create policy "Admins and marketing can insert clients"
on public.clients for insert
to authenticated
with check (public.current_user_profile_role() in ('admin', 'marketing'));

drop policy if exists "Admins can update clients" on public.clients;
drop policy if exists "Admins and marketing can update clients" on public.clients;
create policy "Admins and marketing can update clients"
on public.clients for update
to authenticated
using (public.current_user_profile_role() in ('admin', 'marketing'))
with check (public.current_user_profile_role() in ('admin', 'marketing'));

drop policy if exists "Admins can insert client logos" on storage.objects;
drop policy if exists "Admins and marketing can insert client logos" on storage.objects;
create policy "Admins and marketing can insert client logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'client-logos'
  and public.current_user_profile_role() in ('admin', 'marketing')
);

drop policy if exists "Admins can delete client logos" on storage.objects;
drop policy if exists "Admins and marketing can delete client logos" on storage.objects;
create policy "Admins and marketing can delete client logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'client-logos'
  and public.current_user_profile_role() in ('admin', 'marketing')
);
