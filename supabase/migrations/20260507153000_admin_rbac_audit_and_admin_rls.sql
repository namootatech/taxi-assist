-- Admin platform: RBAC + audit logs + admin RLS access (PRD admin console).
-- Extends existing driver_app tables; does not recreate them.

-- ---------------------------------------------------------------------------
-- admin_profiles (RBAC)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint admin_profiles_role_check check (
    role in ('superadmin', 'compliance', 'operations', 'finance', 'ad_manager', 'support')
  )
);

create index if not exists admin_profiles_role_idx on public.admin_profiles (role);

alter table public.admin_profiles enable row level security;

-- Admin can always read their own row.
drop policy if exists "admin_profiles_select_self" on public.admin_profiles;
create policy "admin_profiles_select_self"
  on public.admin_profiles
  for select
  to authenticated
  using (user_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- Admin helper functions
-- SECURITY DEFINER to avoid circular RLS dependency when checking admin status.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid ()
      and ap.disabled_at is null
  );
$$;

create or replace function public.admin_role ()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ap.role
  from public.admin_profiles ap
  where ap.user_id = auth.uid ()
    and ap.disabled_at is null
  limit 1;
$$;

revoke all on function public.is_admin () from public;
revoke all on function public.admin_role () from public;
grant execute on function public.is_admin () to authenticated;
grant execute on function public.admin_role () to authenticated;

-- ---------------------------------------------------------------------------
-- audit_logs (immutable, append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  audit_id bigserial primary key,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_action_created_idx
  on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

-- Admins can read audit logs; only admins can insert.
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    public.is_admin ()
    and actor_user_id = auth.uid ()
    and actor_role = public.admin_role ()
  );

-- No UPDATE/DELETE policies: immutable log.

-- Convenience RPC: mutate-and-log flows should prefer RPCs later; this is a base primitive.
create or replace function public.admin_audit_log (
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid () is null then
    raise exception 'Not authenticated';
  end if;
  if public.is_admin () is distinct from true then
    raise exception 'Not authorized';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    auth.uid (),
    coalesce(public.admin_role (), 'unknown'),
    p_action,
    p_entity_type,
    p_entity_id,
    nullif(trim(p_reason), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_audit_log (text, text, uuid, text, jsonb) from public;
grant execute on function public.admin_audit_log (text, text, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin RLS access to existing tables (additive; does not remove driver policies)
-- ---------------------------------------------------------------------------

-- profiles: admins can read; limited updates are added later via RPCs, but allow basic status toggles now.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- vehicles: admin read + update for approvals/suspensions.
drop policy if exists "vehicles_select_admin" on public.vehicles;
create policy "vehicles_select_admin"
  on public.vehicles
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "vehicles_update_admin" on public.vehicles;
create policy "vehicles_update_admin"
  on public.vehicles
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- documents: admin read + update for review decisions.
drop policy if exists "documents_select_admin" on public.documents;
create policy "documents_select_admin"
  on public.documents
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "documents_update_admin" on public.documents;
create policy "documents_update_admin"
  on public.documents
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- trips: admin read + update for interventions (cancel/adjust) and support.
drop policy if exists "trips_select_admin" on public.trips;
create policy "trips_select_admin"
  on public.trips
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "trips_update_admin" on public.trips;
create policy "trips_update_admin"
  on public.trips
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- trip_locations: admin read for live map.
drop policy if exists "trip_locations_select_admin" on public.trip_locations;
create policy "trip_locations_select_admin"
  on public.trip_locations
  for select
  to authenticated
  using (public.is_admin ());

-- support_tickets: admin read + update status later (for now, select only).
drop policy if exists "support_tickets_select_admin" on public.support_tickets;
create policy "support_tickets_select_admin"
  on public.support_tickets
  for select
  to authenticated
  using (public.is_admin ());

-- payouts: admin read + update lifecycle fields.
drop policy if exists "payouts_select_admin" on public.payouts;
create policy "payouts_select_admin"
  on public.payouts
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "payouts_update_admin" on public.payouts;
create policy "payouts_update_admin"
  on public.payouts
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

