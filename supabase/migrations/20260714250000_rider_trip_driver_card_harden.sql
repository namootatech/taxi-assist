-- Harden rider_get_trip_driver: aggregate ratings without relying on the summary
-- view (RLS/security_invoker can make the view fail for riders), and always
-- return a stable driver card payload for assigned trips.

create or replace function public.rider_get_trip_driver (p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_driver public.profiles%rowtype;
  v_vehicle_id uuid;
  v_make text;
  v_model text;
  v_colour text;
  v_reg text;
  v_category text;
  v_avg numeric(10, 2);
  v_count bigint;
  v_show_phone boolean;
  v_phone text;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;

  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;

  if v_trip.driver_id is null then
    return jsonb_build_object('ok', true, 'assigned', false, 'driver', null);
  end if;

  select * into v_driver from public.profiles where id = v_trip.driver_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Driver not found');
  end if;

  v_vehicle_id := coalesce(v_trip.vehicle_id, v_driver.current_vehicle_id);
  if v_vehicle_id is not null then
    select make, model, colour, registration_number, category
    into v_make, v_model, v_colour, v_reg, v_category
    from public.vehicles
    where vehicle_id = v_vehicle_id;
  end if;

  select
    round(avg(r.rating)::numeric, 2),
    count(*)::bigint
  into v_avg, v_count
  from public.driver_ratings r
  where r.driver_id = v_trip.driver_id;

  -- Visible once the driver is heading to pickup (and for the rest of the trip).
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
    'trip_status', v_trip.status,
    'driver', jsonb_build_object(
      'id', v_driver.id,
      'full_name', coalesce(nullif(trim(v_driver.full_name), ''), 'Your driver'),
      'cellphone', v_phone,
      'cellphone_visible', v_show_phone,
      'selfie_url', v_driver.selfie_url,
      'avg_rating', v_avg,
      'total_ratings', coalesce(v_count, 0),
      'vehicle', case
        when v_vehicle_id is null then null
        else jsonb_build_object(
          'vehicle_id', v_vehicle_id,
          'make', coalesce(v_make, ''),
          'model', coalesce(v_model, ''),
          'colour', coalesce(v_colour, ''),
          'registration_number', coalesce(v_reg, ''),
          'category', coalesce(v_category, 'SEDAN')
        )
      end
    )
  );
end;
$$;

comment on function public.rider_get_trip_driver is
  'Rider trip driver card (name, photo, rating, vehicle). Cellphone from EN_ROUTE_PICKUP onward.';

grant execute on function public.rider_get_trip_driver (uuid) to authenticated;
