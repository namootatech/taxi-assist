-- Rider verification is optional: PENDING riders may book trips.
-- Blocked statuses (REJECTED / SUSPENDED / DEACTIVATED) remain denied.

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

comment on function public.rider_request_trip is
  'Rider books a trip (REQUESTED). Verification optional — PENDING riders may book; blocked statuses denied.';
