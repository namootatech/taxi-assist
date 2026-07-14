-- Rider trip driver card: expose assigned driver + vehicle + rating safely.
-- Also stamp trips.vehicle_id from the driver's current vehicle on book/accept.

create or replace function public.rider_get_trip_driver (p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_driver public.profiles%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_avg numeric(10, 2);
  v_count bigint;
  v_vehicle_id uuid;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id;
  if v_trip.trip_id is null then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;

  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;

  if v_trip.driver_id is null then
    return jsonb_build_object(
      'ok', true,
      'assigned', false,
      'driver', null
    );
  end if;

  select * into v_driver from public.profiles where id = v_trip.driver_id;
  if v_driver.id is null then
    return jsonb_build_object('ok', false, 'error', 'Driver not found');
  end if;

  v_vehicle_id := coalesce(v_trip.vehicle_id, v_driver.current_vehicle_id);
  if v_vehicle_id is not null then
    select * into v_vehicle from public.vehicles where vehicle_id = v_vehicle_id;
  end if;

  select
    s.avg_rating,
    s.total_ratings
  into v_avg, v_count
  from public.driver_rating_summary s
  where s.driver_id = v_trip.driver_id;

  return jsonb_build_object(
    'ok', true,
    'assigned', true,
    'driver', jsonb_build_object(
      'id', v_driver.id,
      'full_name', v_driver.full_name,
      'cellphone', v_driver.cellphone,
      'selfie_url', v_driver.selfie_url,
      'avg_rating', v_avg,
      'total_ratings', coalesce(v_count, 0),
      'vehicle', case
        when v_vehicle.vehicle_id is null then null
        else jsonb_build_object(
          'vehicle_id', v_vehicle.vehicle_id,
          'make', v_vehicle.make,
          'model', v_vehicle.model,
          'colour', v_vehicle.colour,
          'registration_number', v_vehicle.registration_number,
          'category', v_vehicle.category
        )
      end
    )
  );
end;
$$;

comment on function public.rider_get_trip_driver is
  'Rider-only: whitelisted driver name, selfie, rating, vehicle for an owned trip.';

grant execute on function public.rider_get_trip_driver (uuid) to authenticated;

-- Stamp vehicle when rider books against an online driver.
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
  v_driver public.profiles%rowtype;
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
  if v_profile.status in ('REJECTED', 'SUSPENDED', 'DEACTIVATED') then
    return jsonb_build_object('ok', false, 'error', 'Account is not active');
  end if;

  if exists (
    select 1 from public.trips t
    where t.rider_id = auth.uid ()
      and t.status in ('REQUESTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'IN_PROGRESS')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Active trip already exists');
  end if;

  select * into v_driver
  from public.profiles p
  where p.profile_type = 'DRIVER'
    and p.status = 'APPROVED'
    and p.online_status = 'ONLINE'
  order by p.last_online_at desc nulls last
  limit 1;

  insert into public.trips (
    rider_id,
    driver_id,
    vehicle_id,
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
    v_driver.id,
    v_driver.current_vehicle_id,
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

comment on function public.rider_request_trip is
  'Rider books a trip (REQUESTED). Stamps assigned driver + current vehicle when an online driver exists.';

-- On accept, ensure vehicle_id is set from the driver's current vehicle.
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
  v_vehicle_id uuid;
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
    select current_vehicle_id into v_vehicle_id
    from public.profiles
    where id = auth.uid ();
    update public.trips
    set
      status = 'EN_ROUTE_PICKUP',
      vehicle_id = coalesce(vehicle_id, v_vehicle_id),
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
