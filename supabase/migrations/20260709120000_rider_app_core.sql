-- Rider app core: profile extensions, trip RPCs, emergency contacts, payment methods,
-- rider RLS for wallets/ad_views/trip_locations, RIDER document entity type.

-- ---------------------------------------------------------------------------
-- 1. Profile extensions
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists address_type text;
alter table public.profiles add column if not exists unit_number text;
alter table public.profiles add column if not exists complex_name text;
alter table public.profiles add column if not exists referral_code text;

do $$
begin
  alter table public.profiles
    add constraint profiles_address_type_check
    check (address_type is null or address_type in ('HOUSE', 'COMPLEX', 'APARTMENT'));
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists profiles_referral_code_unique
  on public.profiles (referral_code)
  where referral_code is not null;

-- Default profile_type RIDER for rider-app signups (client sets profile_type; trigger backfills).
create or replace function public.profiles_default_rider_type ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.profile_type is null or new.profile_type = 'DRIVER' then
    if coalesce(new.training_completed, false) = false
      and new.license_number is null
      and new.pdp_number is null
      and new.current_vehicle_id is null then
      new.profile_type := 'RIDER';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_default_rider_type on public.profiles;
create trigger profiles_default_rider_type
before insert on public.profiles
for each row
execute function public.profiles_default_rider_type ();

-- ---------------------------------------------------------------------------
-- 2. Trips: rider-owned reads + nullable driver until assignment
-- ---------------------------------------------------------------------------
alter table public.trips alter column driver_id drop not null;

create index if not exists trips_rider_status_idx
  on public.trips (rider_id, status);

drop policy if exists "trips_select_own_rider" on public.trips;
create policy "trips_select_own_rider"
  on public.trips
  for select
  to authenticated
  using (rider_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- 3. trip_locations — riders on active trip can read driver pings
-- ---------------------------------------------------------------------------
drop policy if exists "trip_locations_select_rider_trip" on public.trip_locations;
create policy "trip_locations_select_rider_trip"
  on public.trip_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.trip_id = trip_locations.trip_id
        and t.rider_id = auth.uid ()
        and t.status in (
          'REQUESTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'IN_PROGRESS'
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Wallets + ad_views — rider read own
-- ---------------------------------------------------------------------------
drop policy if exists "wallets_select_own_rider" on public.wallets;
create policy "wallets_select_own_rider"
  on public.wallets
  for select
  to authenticated
  using (profile_id = auth.uid () and wallet_type = 'RIDER');

drop policy if exists "wallet_transactions_select_own_rider" on public.wallet_transactions;
create policy "wallet_transactions_select_own_rider"
  on public.wallet_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wallets w
      where w.wallet_id = wallet_transactions.wallet_id
        and w.profile_id = auth.uid ()
        and w.wallet_type = 'RIDER'
    )
  );

drop policy if exists "ad_views_select_own_rider" on public.ad_views;
create policy "ad_views_select_own_rider"
  on public.ad_views
  for select
  to authenticated
  using (rider_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- 5. emergency_contacts (max 5 per rider)
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_contacts (
  contact_id uuid primary key default gen_random_uuid (),
  rider_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  cellphone text not null,
  relationship text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists emergency_contacts_rider_idx
  on public.emergency_contacts (rider_id, created_at desc);

alter table public.emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_select_own" on public.emergency_contacts;
create policy "emergency_contacts_select_own"
  on public.emergency_contacts
  for select
  to authenticated
  using (rider_id = auth.uid ());

drop policy if exists "emergency_contacts_insert_own" on public.emergency_contacts;
create policy "emergency_contacts_insert_own"
  on public.emergency_contacts
  for insert
  to authenticated
  with check (
    rider_id = auth.uid ()
    and (
      select count(*) from public.emergency_contacts ec where ec.rider_id = auth.uid ()
    ) < 5
  );

drop policy if exists "emergency_contacts_update_own" on public.emergency_contacts;
create policy "emergency_contacts_update_own"
  on public.emergency_contacts
  for update
  to authenticated
  using (rider_id = auth.uid ())
  with check (rider_id = auth.uid ());

drop policy if exists "emergency_contacts_delete_own" on public.emergency_contacts;
create policy "emergency_contacts_delete_own"
  on public.emergency_contacts
  for delete
  to authenticated
  using (rider_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- 6. payment_methods (token references only)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  payment_method_id uuid primary key default gen_random_uuid (),
  rider_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  token_ref text not null,
  last4 text not null,
  brand text,
  is_default boolean not null default false,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint payment_methods_provider_check check (
    provider in ('PAYFAST', 'PAYSTACK', 'STRIPE', 'MANUAL')
  )
);

create index if not exists payment_methods_rider_idx
  on public.payment_methods (rider_id, created_at desc);

alter table public.payment_methods enable row level security;

drop policy if exists "payment_methods_select_own" on public.payment_methods;
create policy "payment_methods_select_own"
  on public.payment_methods
  for select
  to authenticated
  using (rider_id = auth.uid ());

drop policy if exists "payment_methods_insert_own" on public.payment_methods;
create policy "payment_methods_insert_own"
  on public.payment_methods
  for insert
  to authenticated
  with check (rider_id = auth.uid ());

drop policy if exists "payment_methods_update_own" on public.payment_methods;
create policy "payment_methods_update_own"
  on public.payment_methods
  for update
  to authenticated
  using (rider_id = auth.uid ())
  with check (rider_id = auth.uid ());

drop policy if exists "payment_methods_delete_own" on public.payment_methods;
create policy "payment_methods_delete_own"
  on public.payment_methods
  for delete
  to authenticated
  using (rider_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- 7. Documents — RIDER entity type
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint if exists documents_entity_type_check;
alter table public.documents
  add constraint documents_entity_type_check
  check (entity_type in ('DRIVER', 'VEHICLE', 'RIDER'));

drop policy if exists "documents_insert_own_uploads" on public.documents;
create policy "documents_insert_own_uploads"
  on public.documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid ()
    and (
      (entity_type = 'DRIVER' and entity_id = auth.uid ())
      or (entity_type = 'RIDER' and entity_id = auth.uid ())
      or (entity_type = 'VEHICLE' and exists (
        select 1
        from public.vehicles v
        where v.vehicle_id = entity_id
          and v.linked_driver_id = auth.uid ()
      ))
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Support tickets — rider path
-- ---------------------------------------------------------------------------
alter table public.support_tickets add column if not exists rider_id uuid references public.profiles (id) on delete cascade;
alter table public.support_tickets alter column driver_id drop not null;

drop policy if exists "support_tickets_select_own_rider" on public.support_tickets;
create policy "support_tickets_select_own_rider"
  on public.support_tickets
  for select
  to authenticated
  using (rider_id = auth.uid ());

drop policy if exists "support_tickets_insert_own_rider" on public.support_tickets;
create policy "support_tickets_insert_own_rider"
  on public.support_tickets
  for insert
  to authenticated
  with check (rider_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- 9. Trip tip column (post-trip wallet tip MVP)
-- ---------------------------------------------------------------------------
alter table public.trips add column if not exists rider_tip_amount numeric(12, 2);

-- ---------------------------------------------------------------------------
-- 10. Rider RPCs
-- ---------------------------------------------------------------------------
create or replace function public.rider_request_trip (
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_pickup_address text default null,
  p_dropoff_address text default null,
  p_payment_method text default 'CASH',
  p_estimated_fare numeric default null,
  p_estimated_duration_sec integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_driver_id uuid;
  v_trip public.trips%rowtype;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_profile from public.profiles where id = auth.uid ();
  if v_profile.id is null then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;
  if v_profile.profile_type is distinct from 'RIDER' then
    return jsonb_build_object('ok', false, 'error', 'Rider profile required');
  end if;
  if v_profile.status is distinct from 'APPROVED' then
    return jsonb_build_object('ok', false, 'error', 'Profile not approved for booking');
  end if;

  if exists (
    select 1 from public.trips t
    where t.rider_id = auth.uid ()
      and t.status in ('REQUESTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'IN_PROGRESS')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Active trip already exists');
  end if;

  select p.id into v_driver_id
  from public.profiles p
  where p.profile_type = 'DRIVER'
    and p.status = 'APPROVED'
    and p.online_status = 'ONLINE'
  order by p.last_online_at desc nulls last
  limit 1;

  insert into public.trips (
    rider_id,
    driver_id,
    status,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    pickup_address,
    dropoff_address,
    rider_display_name,
    rider_verified,
    payment_method,
    estimated_fare,
    estimated_duration_sec
  ) values (
    auth.uid (),
    v_driver_id,
    'REQUESTED',
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_lat,
    p_dropoff_lng,
    nullif(trim(p_pickup_address), ''),
    nullif(trim(p_dropoff_address), ''),
    v_profile.full_name,
    v_profile.status = 'APPROVED',
    coalesce(nullif(trim(p_payment_method), ''), 'CASH'),
    p_estimated_fare,
    p_estimated_duration_sec
  )
  returning * into v_trip;

  return jsonb_build_object(
    'ok', true,
    'trip', to_jsonb(v_trip)
  );
end;
$$;

create or replace function public.rider_cancel_trip (
  p_trip_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;
  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;
  if v_trip.status not in ('REQUESTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP') then
    return jsonb_build_object('ok', false, 'error', 'Trip cannot be cancelled in this state');
  end if;

  update public.trips
  set
    status = 'CANCELLED',
    cancel_reason = coalesce(nullif(trim(p_reason), ''), 'CANCELLED_BY_RIDER'),
    updated_at = now ()
  where trip_id = p_trip_id;

  return jsonb_build_object('ok', true, 'status', 'CANCELLED');
end;
$$;

create or replace function public.rider_rate_completed_trip (
  p_trip_id uuid,
  p_rating smallint,
  p_comment text default null,
  p_tip_amount numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_wallet public.wallets%rowtype;
  v_tip numeric(12, 2);
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'Rating must be 1–5');
  end if;
  if nullif(trim(p_comment), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Comment required');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;
  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;
  if v_trip.status is distinct from 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'Trip is not completed');
  end if;
  if v_trip.driver_id is null then
    return jsonb_build_object('ok', false, 'error', 'No driver to rate');
  end if;

  if exists (
    select 1 from public.driver_ratings dr
    where dr.trip_id = v_trip.trip_id::text and dr.rider_id = auth.uid ()
  ) then
    return jsonb_build_object('ok', false, 'error', 'Already rated');
  end if;

  insert into public.driver_ratings (trip_id, rider_id, driver_id, rating, comment)
  values (v_trip.trip_id::text, auth.uid (), v_trip.driver_id, p_rating, nullif(trim(p_comment), ''));

  v_tip := coalesce(p_tip_amount, 0);
  if v_tip > 0 then
    if v_tip > 500 then
      return jsonb_build_object('ok', false, 'error', 'Tip exceeds R500 cap');
    end if;

    select * into v_wallet
    from public.wallets
    where profile_id = auth.uid () and wallet_type = 'RIDER'
    for update;

    if v_wallet.wallet_id is null or v_wallet.balance < v_tip then
      return jsonb_build_object('ok', false, 'error', 'Insufficient wallet balance for tip');
    end if;

    update public.wallets
    set balance = balance - v_tip, updated_at = now ()
    where wallet_id = v_wallet.wallet_id;

    insert into public.wallet_transactions (
      wallet_id, direction, amount, type, reference, metadata, created_by
    ) values (
      v_wallet.wallet_id,
      'DEBIT',
      v_tip,
      'TIP',
      v_trip.trip_id::text,
      jsonb_build_object('driver_id', v_trip.driver_id),
      auth.uid ()
    );

    update public.trips set rider_tip_amount = v_tip, updated_at = now () where trip_id = p_trip_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Rider can insert own driver ratings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'driver_ratings'
      and policyname = 'driver_ratings_insert_own_rider'
  ) then
    create policy driver_ratings_insert_own_rider on public.driver_ratings
      for insert
      to authenticated
      with check (rider_id = auth.uid ());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'driver_ratings'
      and policyname = 'driver_ratings_select_own_rider'
  ) then
    create policy driver_ratings_select_own_rider on public.driver_ratings
      for select
      to authenticated
      using (rider_id = auth.uid ());
  end if;
end $$;

grant execute on function public.rider_request_trip (
  double precision, double precision, double precision, double precision,
  text, text, text, numeric, integer
) to authenticated;

grant execute on function public.rider_cancel_trip (uuid, text) to authenticated;

grant execute on function public.rider_rate_completed_trip (uuid, smallint, text, numeric) to authenticated;

comment on function public.rider_request_trip is
  'Rider books a trip (REQUESTED). Assigns nearest online driver when available.';

comment on function public.rider_cancel_trip is
  'Rider cancels before trip starts (REQUESTED / EN_ROUTE_PICKUP / ARRIVED_PICKUP).';

comment on function public.rider_rate_completed_trip is
  'Rider rates driver after COMPLETED; mandatory comment; optional wallet tip (R500 cap).';
