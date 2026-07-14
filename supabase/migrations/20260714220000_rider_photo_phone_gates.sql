-- Require selfie + cellphone before booking.
-- Expose driver cellphone only from EN_ROUTE_PICKUP onward.

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

  if v_profile.cellphone is null or length(trim(v_profile.cellphone)) < 9 then
    return jsonb_build_object('ok', false, 'error', 'Cellphone required');
  end if;
  if v_profile.selfie_url is null or length(trim(v_profile.selfie_url)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Profile photo required');
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
  'Rider books a trip. Requires cellphone + profile photo (selfie_url).';

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
  v_show_phone boolean;
  v_phone text;
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

  -- Phone only after the driver is on the way (or later in the trip).
  v_show_phone := v_trip.status in (
    'EN_ROUTE_PICKUP',
    'ARRIVED_PICKUP',
    'IN_PROGRESS',
    'COMPLETED'
  );
  v_phone := case when v_show_phone then v_driver.cellphone else null end;

  return jsonb_build_object(
    'ok', true,
    'assigned', true,
    'driver', jsonb_build_object(
      'id', v_driver.id,
      'full_name', v_driver.full_name,
      'cellphone', v_phone,
      'cellphone_visible', v_show_phone,
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
  'Rider trip driver card. Cellphone only when status is EN_ROUTE_PICKUP or later.';
