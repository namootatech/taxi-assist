-- Expose rider join date on driver_get_trip_rider for tenure display.

create or replace function public.driver_get_trip_rider (p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_rider public.profiles%rowtype;
  v_avg numeric(10, 2);
  v_count bigint;
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

  if v_trip.driver_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;

  if v_trip.rider_id is null then
    return jsonb_build_object('ok', true, 'assigned', false, 'rider', null);
  end if;

  select * into v_rider from public.profiles where id = v_trip.rider_id;
  if v_rider.id is null then
    return jsonb_build_object('ok', false, 'error', 'Rider not found');
  end if;

  select s.avg_rating, s.total_ratings
  into v_avg, v_count
  from public.rider_rating_summary s
  where s.rider_id = v_trip.rider_id;

  -- Phone only after the driver has accepted (EN_ROUTE_PICKUP or later).
  v_show_phone := v_trip.status in (
    'EN_ROUTE_PICKUP',
    'ARRIVED_PICKUP',
    'IN_PROGRESS',
    'COMPLETED'
  );
  v_phone := case when v_show_phone then v_rider.cellphone else null end;

  return jsonb_build_object(
    'ok', true,
    'assigned', true,
    'rider', jsonb_build_object(
      'id', v_rider.id,
      'full_name', coalesce(nullif(trim(v_rider.full_name), ''), v_trip.rider_display_name, 'Rider'),
      'cellphone', v_phone,
      'cellphone_visible', v_show_phone,
      'selfie_url', v_rider.selfie_url,
      'verified', coalesce(v_trip.rider_verified, v_rider.status = 'APPROVED', false),
      'avg_rating', v_avg,
      'total_ratings', coalesce(v_count, 0),
      'created_at', v_rider.created_at
    )
  );
end;
$$;

comment on function public.driver_get_trip_rider is
  'Driver trip rider card: name, photo, rating, verified, join date; cellphone after accept.';

grant execute on function public.driver_get_trip_rider (uuid) to authenticated;
