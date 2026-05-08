-- Clerk-driven auth with Supabase RLS
-- Adds a durable identity mapping table and an on-demand migration RPC that
-- re-keys domain rows from a legacy Supabase auth user to the current one.
--
-- Context:
-- - Clerk is configured as a Third-Party (OIDC) provider in Supabase Auth
-- - Apps will sign in with Clerk and then establish a Supabase session for RLS
-- - Existing password-based Supabase users may need their domain rows migrated
--   to the new OIDC-linked auth user id (auth.uid()) after first login.

create table if not exists public.user_identities (
  id uuid primary key default gen_random_uuid (),
  clerk_user_id text not null,
  supabase_user_id uuid not null references auth.users (id) on delete cascade,
  legacy_supabase_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint user_identities_clerk_user_id_unique unique (clerk_user_id),
  constraint user_identities_supabase_user_id_unique unique (supabase_user_id),
  constraint user_identities_legacy_supabase_user_id_unique unique (legacy_supabase_user_id)
);

create index if not exists user_identities_supabase_user_id_idx
  on public.user_identities (supabase_user_id);

create index if not exists user_identities_legacy_supabase_user_id_idx
  on public.user_identities (legacy_supabase_user_id)
  where legacy_supabase_user_id is not null;

alter table public.user_identities enable row level security;

-- Only admins can read this table in-app. (We keep this strict; most app logic
-- should not need direct access. For self-service migration, use the RPC below.)
drop policy if exists "user_identities_select_admin" on public.user_identities;
create policy "user_identities_select_admin"
  on public.user_identities
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "user_identities_insert_admin" on public.user_identities;
create policy "user_identities_insert_admin"
  on public.user_identities
  for insert
  to authenticated
  with check (public.is_admin ());

drop policy if exists "user_identities_update_admin" on public.user_identities;
create policy "user_identities_update_admin"
  on public.user_identities
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- Helper: read the current Clerk user id from Supabase's identity records.
-- When Supabase Auth links an OIDC provider, it stores an identity row under
-- auth.identities with provider_id = the OIDC subject (Clerk user id).
create or replace function trip_private.current_clerk_user_id ()
returns text
language sql
stable
security definer
set search_path = auth, public, trip_private
as $$
  select i.provider_id
  from auth.identities i
  where i.user_id = auth.uid ()
    and i.provider = 'clerk'
  limit 1;
$$;

revoke all on function trip_private.current_clerk_user_id () from public;
grant execute on function trip_private.current_clerk_user_id () to authenticated;

-- Self-service migration RPC.
--
-- On first OIDC login, the user calls this to migrate rows keyed by the legacy
-- password-based auth.users.id to the current auth.uid().
--
-- We locate the legacy user by matching email. This is safe only if your
-- Supabase project enforces unique emails across auth.users (default behavior).
-- If no legacy row exists, this function is a no-op.
create or replace function public.migrate_legacy_user_to_current ()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, trip_private
as $$
declare
  v_current_user_id uuid := auth.uid ();
  v_current_email text;
  v_legacy_user_id uuid;
  v_clerk_user_id text;
  v_now timestamptz := now ();
  v_migrated boolean := false;
begin
  if v_current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select u.email into v_current_email
  from auth.users u
  where u.id = v_current_user_id
  limit 1;

  if v_current_email is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_email');
  end if;

  -- Find a prior auth user with the same email (legacy password-based).
  select u.id into v_legacy_user_id
  from auth.users u
  where lower(u.email) = lower(v_current_email)
    and u.id <> v_current_user_id
  order by u.created_at asc
  limit 1;

  if v_legacy_user_id is null then
    -- Still ensure we store the Clerk mapping for observability.
    v_clerk_user_id := trip_private.current_clerk_user_id ();
    if v_clerk_user_id is null then
      return jsonb_build_object('ok', true, 'migrated', false, 'reason', 'no_legacy_user_and_no_clerk_identity');
    end if;

    insert into public.user_identities (clerk_user_id, supabase_user_id, legacy_supabase_user_id, created_at, updated_at)
    values (v_clerk_user_id, v_current_user_id, null, v_now, v_now)
    on conflict (supabase_user_id) do update
      set clerk_user_id = excluded.clerk_user_id,
          updated_at = v_now;

    return jsonb_build_object('ok', true, 'migrated', false, 'reason', 'no_legacy_user');
  end if;

  v_clerk_user_id := trip_private.current_clerk_user_id ();
  if v_clerk_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_clerk_identity');
  end if;

  -- Persist mapping (idempotent).
  insert into public.user_identities (clerk_user_id, supabase_user_id, legacy_supabase_user_id, created_at, updated_at)
  values (v_clerk_user_id, v_current_user_id, v_legacy_user_id, v_now, v_now)
  on conflict (supabase_user_id) do update
    set clerk_user_id = excluded.clerk_user_id,
        legacy_supabase_user_id = excluded.legacy_supabase_user_id,
        updated_at = v_now;

  -- -----------------------------------------------------------------------
  -- Re-key domain tables from legacy auth id -> current auth id
  -- -----------------------------------------------------------------------

  -- Driver domain
  update public.vehicles set linked_driver_id = v_current_user_id where linked_driver_id = v_legacy_user_id;
  update public.trips set driver_id = v_current_user_id where driver_id = v_legacy_user_id;
  update public.support_tickets set driver_id = v_current_user_id where driver_id = v_legacy_user_id;
  update public.payouts set driver_id = v_current_user_id where driver_id = v_legacy_user_id;
  update public.documents set uploaded_by = v_current_user_id where uploaded_by = v_legacy_user_id;

  -- Profile table has the auth.users FK as PK; copy then delete legacy row.
  if exists (select 1 from public.profiles p where p.id = v_legacy_user_id) then
    insert into public.profiles (
      id,
      email,
      driver_id,
      full_name,
      id_number,
      dob,
      age,
      sex,
      residential_address,
      license_number,
      license_code,
      pdp_number,
      pdp_expiry,
      cellphone,
      bank_details,
      selfie_url,
      status,
      online_status,
      current_vehicle_id,
      training_completed,
      registration_submitted,
      created_at,
      updated_at,
      approved_at,
      last_online_at
    )
    select
      v_current_user_id,
      p.email,
      p.driver_id,
      p.full_name,
      p.id_number,
      p.dob,
      p.age,
      p.sex,
      p.residential_address,
      p.license_number,
      p.license_code,
      p.pdp_number,
      p.pdp_expiry,
      p.cellphone,
      p.bank_details,
      p.selfie_url,
      p.status,
      p.online_status,
      p.current_vehicle_id,
      p.training_completed,
      p.registration_submitted,
      p.created_at,
      v_now,
      p.approved_at,
      p.last_online_at
    from public.profiles p
    where p.id = v_legacy_user_id
    on conflict (id) do update
      set email = excluded.email,
          driver_id = excluded.driver_id,
          full_name = excluded.full_name,
          id_number = excluded.id_number,
          dob = excluded.dob,
          age = excluded.age,
          sex = excluded.sex,
          residential_address = excluded.residential_address,
          license_number = excluded.license_number,
          license_code = excluded.license_code,
          pdp_number = excluded.pdp_number,
          pdp_expiry = excluded.pdp_expiry,
          cellphone = excluded.cellphone,
          bank_details = excluded.bank_details,
          selfie_url = excluded.selfie_url,
          status = excluded.status,
          online_status = excluded.online_status,
          current_vehicle_id = excluded.current_vehicle_id,
          training_completed = excluded.training_completed,
          registration_submitted = excluded.registration_submitted,
          approved_at = excluded.approved_at,
          last_online_at = excluded.last_online_at,
          updated_at = v_now;

    delete from public.profiles where id = v_legacy_user_id;
    v_migrated := true;
  end if;

  -- Admin domain
  if exists (select 1 from public.admin_profiles ap where ap.user_id = v_legacy_user_id) then
    insert into public.admin_profiles (user_id, role, disabled_at, created_at, updated_at)
    select v_current_user_id, ap.role, ap.disabled_at, ap.created_at, v_now
    from public.admin_profiles ap
    where ap.user_id = v_legacy_user_id
    on conflict (user_id) do update
      set role = excluded.role,
          disabled_at = excluded.disabled_at,
          updated_at = v_now;

    delete from public.admin_profiles where user_id = v_legacy_user_id;
    v_migrated := true;
  end if;

  -- Trip Media partner domain
  update public.partner_members set user_id = v_current_user_id where user_id = v_legacy_user_id;

  return jsonb_build_object(
    'ok', true,
    'migrated', v_migrated,
    'legacyUserId', v_legacy_user_id,
    'currentUserId', v_current_user_id,
    'clerkUserId', v_clerk_user_id
  );
end;
$$;

revoke all on function public.migrate_legacy_user_to_current () from public;
grant execute on function public.migrate_legacy_user_to_current () to authenticated;

