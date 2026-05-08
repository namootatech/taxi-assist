-- Allow self-registration into admin_profiles (MVP).
-- This enables the /register flow to insert the current auth user.
-- NOTE: This is permissive; in production you likely want superadmin-controlled provisioning.

drop policy if exists "admin_profiles_insert_self" on public.admin_profiles;
create policy "admin_profiles_insert_self"
  on public.admin_profiles
  for insert
  to authenticated
  with check (
    user_id = auth.uid ()
    and disabled_at is null
    and role = 'support'
  );

