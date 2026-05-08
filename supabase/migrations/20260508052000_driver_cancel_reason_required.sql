-- Driver trip cancellation reason enforcement.
-- APD source: docs/planning/drivers/planning/app-prd.md §5.4 and
-- docs/planning/drivers/planning/data-model-and-app-entities.md §3.2 require
-- driver cancellations before pickup to include a reason.

drop function if exists public.driver_transition_trip (uuid, text, numeric, double precision);

create or replace function public.driver_transition_trip (
  p_trip_id uuid,
  p_action text,
  p_final_fare numeric default null,
  p_final_distance_m double precision default null,
  p_cancel_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_online text;
  v_reason text := nullif(trim(coalesce(p_cancel_reason, '')), '');
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
      cancel_reason = coalesce(v_reason, cancel_reason, 'DECLINED_BY_DRIVER'),
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
    if v_reason is null then
      return jsonb_build_object('ok', false, 'error', 'Cancellation reason required');
    end if;
    update public.trips
    set
      status = 'CANCELLED',
      cancel_reason = v_reason,
      updated_at = now ()
    where trip_id = p_trip_id;
    insert into public.trip_events (trip_id, actor_user_id, actor_kind, event_type, metadata)
    values (
      p_trip_id,
      auth.uid (),
      'DRIVER',
      'trip.cancelled_by_driver',
      jsonb_build_object('reason', v_reason, 'previous_status', v_trip.status)
    );
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');

  else
    return jsonb_build_object('ok', false, 'error', 'Unknown action');
  end if;
end;
$$;

comment on function public.driver_transition_trip is
  'Driver-only guarded trip status transitions. Driver pre-pickup cancellation requires a reason.';

grant execute on function public.driver_transition_trip (uuid, text, numeric, double precision, text) to authenticated;
