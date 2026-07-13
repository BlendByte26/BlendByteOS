# Supabase Auth setup

BlendByteOS now uses Supabase Auth for internal access. `APP_ACCESS_PASSWORD` can remain in the environment temporarily, but the primary entry point is email/password login through `/access`.

## Manual setup

1. In Supabase Dashboard, open Authentication and create four email/password users.
2. Copy each user's UUID from Authentication > Users.
3. Run the migration `20260713143000_add_supabase_auth_profiles.sql`.
4. Insert the operational profiles, replacing only the UUID placeholders:

```sql
insert into public.user_profiles (auth_user_id, profile_key, display_name, role, active)
values
  ('00000000-0000-0000-0000-000000000001', 'guilherme', 'Guilherme', 'admin', true),
  ('00000000-0000-0000-0000-000000000002', 'sofia', 'Sofia', 'marketing', true),
  ('00000000-0000-0000-0000-000000000003', 'carlota', 'Carlota', 'design', true),
  ('00000000-0000-0000-0000-000000000004', 'carolina', 'Carolina', 'design', true);
```

5. Test each account:
   - Guilherme and Sofia redirect to `/?view=marketing`.
   - Carlota and Carolina redirect to `/?view=design`.
   - Logout returns to `/access`.
6. Confirm RLS policies are enabled on internal tables and that public Invest2030 pages still load with the existing access token.

Do not commit real emails, passwords, or Auth UUID mappings beyond the profile rows needed in the Supabase project.
