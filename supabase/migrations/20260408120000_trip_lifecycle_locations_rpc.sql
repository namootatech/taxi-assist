-- Prompt 5: trip lifecycle fields, live locations, guarded driver transitions (PRD §5.4, business-logic §3.2).

-- ---------------------------------------------------------------------------
-- Extend trips for ride UI + lifecycle
-- ---------------------------------------------------------------------------
alter table public.trips add column if not exists rider_id uuid;
alter table public.trips add column if not exists pickup_lat double precision;
alter table public.trips add column if not exists pickup_lng double precision;
alter table public.trips add column if not exists dropoff_lat double precision;
alter table public.trips add column if not exists dropoff_lng double precision;
alter table public.trips add column if not exists pickup_address text;
alter table public.trips add column if not exists dropoff_address text;
alter table public.trips add column if not exists rider_display_name text;
alter table public.trips add column if not exists rider_verified boolean default false;
alter table public.trips add column if not exists payment_method text;
alter table public.trips add column if not exists estimated_fare numeric(12, 2);
alter table public.trips add column if not exists estimated_duration_sec integer;
alter table public.trips add column if not exists destination_updated_at timestamptz;
alter table public.trips add column if not exists cancel_reason text;
alter table public.trips add column if not exists final_distance_m double precision;
alter table public.trips add column if not exists driver_rating smallint;
alter table public.trips add column if not exists driver_comment text;

create index if not exists trips_driver_status_idx on public.trips (driver_id, status);

comment on column public.trips.destination_updated_at is 'Set when rider changes destination mid-trip; driver app shows banner.';

-- ---------------------------------------------------------------------------
-- trip_locations — driver pings during IN_PROGRESS (PRD live tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.trip_locations (
  id bigserial primary key,
  trip_id uuid not null references public.trips (trip_id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_mps double precision,
  recorded_at timestamptz not null default now()
);

create index if not exists trip_locations_trip_recorded_idx
  on public.trip_locations (trip_id, recorded_at desc);

alter table public.trip_locations enable row level security;

drop policy if exists "trip_locations_select_own_trip" on public.trip_locations;
create policy "trip_locations_select_own_trip"
  on public.trip_locations
  for select
  to authenticated
  using (driver_id = auth.uid ());

drop policy if exists "trip_locations_insert_own" on public.trip_locations;
create policy "trip_locations_insert_own"
  on public.trip_locations
  for insert
  to authenticated
  with check (
    driver_id = auth.uid ()
    and exists (
      select 1
      from public.trips t
      where t.trip_id = trip_locations.trip_id
        and t.driver_id = auth.uid ()
        and t.status = 'IN_PROGRESS'
    )
  );

-- Driver may update trip row for lifecycle via RPC only (no blanket UPDATE policy).

-- ---------------------------------------------------------------------------
-- Guarded transition RPC (SECURITY DEFINER — centralises state machine)
-- ---------------------------------------------------------------------------
create or replace function public.driver_transition_trip (
  p_trip_id uuid,
  p_action text,
  p_final_fare numeric default null,
  p_final_distance_m double precision default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_online text;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;

  if v_trip.driver_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;

  select online_status into v_online from public.profiles where id = auth.uid ();
  if v_online is distinct from 'ONLINE' and p_action in ('accept', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'You must be online to respond to requests');
  end if;

  if p_action = 'accept' then
    if v_trip.status is distinct from 'REQUESTED' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for accept');
    end if;
    update public.trips
    set
      status = 'EN_ROUTE_PICKUP',
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'EN_ROUTE_PICKUP');

  elsif p_action = 'decline' then
    if v_trip.status is distinct from 'REQUESTED' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for decline');
    end if;
    update public.trips
    set
      status = 'CANCELLED',
      cancel_reason = coalesce(cancel_reason, 'DECLINED_BY_DRIVER'),
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');

  elsif p_action = 'arrived_pickup' then
    if v_trip.status is distinct from 'EN_ROUTE_PICKUP' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for arrived at pickup');
    end if;
    update public.trips
    set
      status = 'ARRIVED_PICKUP',
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'ARRIVED_PICKUP');

  elsif p_action = 'start_trip' then
    if v_trip.status is distinct from 'ARRIVED_PICKUP' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for start trip');
    end if;
    update public.trips
    set
      status = 'IN_PROGRESS',
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'IN_PROGRESS');

  elsif p_action = 'end_trip' then
    if v_trip.status is distinct from 'IN_PROGRESS' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for end trip');
    end if;
    update public.trips
    set
      status = 'COMPLETED',
      final_fare = coalesce(p_final_fare, final_fare),
      final_distance_m = coalesce(p_final_distance_m, final_distance_m),
      completed_at = now (),
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'COMPLETED');

  elsif p_action = 'cancel_en_route' then
    if v_trip.status not in ('EN_ROUTE_PICKUP', 'ARRIVED_PICKUP') then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for cancel');
    end if;
    update public.trips
    set
      status = 'CANCELLED',
      cancel_reason = coalesce(cancel_reason, 'CANCELLED_BY_DRIVER'),
      updated_at = now ()
    where trip_id = p_trip_id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');

  else
    return jsonb_build_object('ok', false, 'error', 'Unknown action');
  end if;
end;
$$;

comment on function public.driver_transition_trip is
  'Driver-only guarded trip status transitions (Prompt 5). Actions: accept, decline, arrived_pickup, start_trip, end_trip, cancel_en_route.';

grant execute on function public.driver_transition_trip (uuid, text, numeric, double precision) to authenticated;

-- Post-trip driver rating (soft PRD §5.4)
create or replace function public.driver_rate_completed_trip (
  p_trip_id uuid,
  p_rating smallint,
  p_comment text default null
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
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'Rating must be 1–5');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;
  if v_trip.driver_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;
  if v_trip.status is distinct from 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'Trip is not completed');
  end if;

  update public.trips
  set
    driver_rating = p_rating,
    driver_comment = nullif(trim(p_comment), ''),
    updated_at = now ()
  where trip_id = p_trip_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.driver_rate_completed_trip (uuid, smallint, text) to authenticated;

-- Realtime: driver app listens for assigned / status changes
alter publication supabase_realtime add table public.trips;
