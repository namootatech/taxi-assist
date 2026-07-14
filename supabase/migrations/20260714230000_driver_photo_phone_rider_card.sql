-- Driver photo + cellphone required to go online / accept trips.
-- Rider ratings from driver_rate_completed_trip; driver_get_trip_rider for request card.
-- Rider cellphone visible only after accept (EN_ROUTE_PICKUP+).

-- ---------------------------------------------------------------------------
-- A. Go-online precheck: require selfie_url + cellphone
-- ---------------------------------------------------------------------------
create or replace function public.driver_precheck_go_online ()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_vehicle record;
  v_reasons text[] := array[]::text[];
  v_bad integer;
begin
  select
    id,
    status,
    training_completed,
    current_vehicle_id,
    online_status,
    cellphone,
    selfie_url
  into v_profile
  from public.profiles
  where id = auth.uid ();

  if v_profile.id is null then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array('Driver profile not found.')
    );
  end if;

  if v_profile.status is distinct from 'APPROVED' then
    v_reasons := array_append(v_reasons, 'Your profile is not approved yet.');
  end if;

  if coalesce (v_profile.training_completed, false) = false then
    v_reasons := array_append(v_reasons, 'Complete required training before going online.');
  end if;

  if v_profile.cellphone is null or length(trim(v_profile.cellphone)) < 9 then
    v_reasons := array_append(
      v_reasons,
      'Add a valid cellphone number in Profile before going online.'
    );
  end if;

  if v_profile.selfie_url is null or length(trim(v_profile.selfie_url)) = 0 then
    v_reasons := array_append(
      v_reasons,
      'Add a profile photo in Profile before going online.'
    );
  end if;

  if v_profile.current_vehicle_id is null then
    v_reasons := array_append(v_reasons, 'Link an approved vehicle first.');
  else
    select vehicle_id, status
    into v_vehicle
    from public.vehicles
    where vehicle_id = v_profile.current_vehicle_id;

    if v_vehicle.vehicle_id is null then
      v_reasons := array_append(v_reasons, 'Linked vehicle not found.');
    elsif v_vehicle.status is distinct from 'APPROVED' then
      v_reasons := array_append(v_reasons, 'Your vehicle is not approved yet.');
    end if;
  end if;

  select count(*) into v_bad
  from public.documents d
  where
    (
      (d.entity_type = 'DRIVER' and d.entity_id = auth.uid ())
      or (
        d.entity_type = 'VEHICLE'
        and v_profile.current_vehicle_id is not null
        and d.entity_id = v_profile.current_vehicle_id
      )
    )
    and d.document_type = any (
      array[
        'DRIVERS_LICENSE',
        'ID',
        'SELFIE',
        'PROOF_OF_RESIDENCE',
        'NATIS',
        'DOUBLE_DISC',
        'INSURANCE'
      ]::text[]
    )
    and (
      d.status in ('EXPIRED', 'DECLINED', 'REJECTED')
      or (
        d.expiry_date is not null
        and d.expiry_date < (timezone ('utc', now ()))::date
      )
    );

  if coalesce (v_bad, 0) > 0 then
    v_reasons := array_append(
      v_reasons,
      'One or more critical documents are expired or declined. Renew them to go online.'
    );
  end if;

  if coalesce(array_length(v_reasons, 1), 0) > 0 then
    return jsonb_build_object('ok', false, 'reasons', to_jsonb (v_reasons));
  end if;

  return jsonb_build_object('ok', true, 'reasons', '[]'::jsonb);
end;
$$;

comment on function public.driver_precheck_go_online () is
  'Returns { ok: bool, reasons: string[] } for go-online gating. Requires profile photo + cellphone.';

grant execute on function public.driver_precheck_go_online () to authenticated;

-- ---------------------------------------------------------------------------
-- B. Accept gate on driver_transition_trip (unified signature)
-- ---------------------------------------------------------------------------
drop function if exists public.driver_transition_trip (uuid, text, numeric, double precision);
drop function if exists public.driver_transition_trip (uuid, text, numeric, double precision, text);

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
  v_vehicle_id uuid;
  v_cellphone text;
  v_selfie text;
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

  select online_status, cellphone, selfie_url
  into v_online, v_cellphone, v_selfie
  from public.profiles
  where id = auth.uid ();

  if v_online is distinct from 'ONLINE' and p_action in ('accept', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'You must be online to respond to requests');
  end if;

  if p_action = 'accept' then
    if v_trip.status is distinct from 'REQUESTED' then
      return jsonb_build_object('ok', false, 'error', 'Invalid state for accept');
    end if;
    if v_cellphone is null or length(trim(v_cellphone)) < 9 then
      return jsonb_build_object('ok', false, 'error', 'Cellphone required before accepting trips');
    end if;
    if v_selfie is null or length(trim(v_selfie)) = 0 then
      return jsonb_build_object('ok', false, 'error', 'Profile photo required before accepting trips');
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
  'Driver trip transitions. Accept requires profile photo + cellphone. Cancel en-route needs a reason.';

grant execute on function public.driver_transition_trip (uuid, text, numeric, double precision, text) to authenticated;

-- ---------------------------------------------------------------------------
-- C. Rider ratings (driver → rider)
-- ---------------------------------------------------------------------------
create table if not exists public.rider_ratings (
  rating_id uuid primary key default gen_random_uuid (),
  trip_id uuid not null references public.trips (trip_id) on delete cascade,
  driver_id uuid not null,
  rider_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text null,
  created_at timestamptz not null default now (),
  unique (trip_id)
);

create index if not exists rider_ratings_rider_id_created_at_idx
  on public.rider_ratings (rider_id, created_at desc);

create index if not exists rider_ratings_driver_id_idx
  on public.rider_ratings (driver_id);

alter table public.rider_ratings enable row level security;

do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'is_admin' and pronamespace = 'public'::regnamespace
  ) then
    create policy rider_ratings_select_admin on public.rider_ratings
      for select using (public.is_admin());
    create policy rider_ratings_insert_admin on public.rider_ratings
      for insert with check (public.is_admin());
    create policy rider_ratings_update_admin on public.rider_ratings
      for update using (public.is_admin()) with check (public.is_admin());
    create policy rider_ratings_delete_admin on public.rider_ratings
      for delete using (public.is_admin());
  end if;
exception
  when duplicate_object then null;
end $$;

create or replace view public.rider_rating_summary as
select
  rider_id,
  avg(rating)::numeric(10, 2) as avg_rating,
  count(*)::bigint as total_ratings,
  max(created_at) as last_rating_at
from public.rider_ratings
group by rider_id;

-- Backfill from completed trips that already have driver_rating.
insert into public.rider_ratings (trip_id, driver_id, rider_id, rating, comment, created_at)
select
  t.trip_id,
  t.driver_id,
  t.rider_id,
  t.driver_rating::int,
  t.driver_comment,
  coalesce(t.completed_at, t.updated_at, now ())
from public.trips t
where t.driver_rating is not null
  and t.driver_id is not null
  and t.rider_id is not null
on conflict (trip_id) do nothing;

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
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
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
  if v_trip.rider_id is null then
    return jsonb_build_object('ok', false, 'error', 'Trip has no rider');
  end if;

  update public.trips
  set
    driver_rating = p_rating,
    driver_comment = v_comment,
    updated_at = now ()
  where trip_id = p_trip_id;

  insert into public.rider_ratings (trip_id, driver_id, rider_id, rating, comment)
  values (p_trip_id, auth.uid (), v_trip.rider_id, p_rating::int, v_comment)
  on conflict (trip_id) do update
  set
    rating = excluded.rating,
    comment = excluded.comment,
    created_at = now ();

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.driver_rate_completed_trip is
  'Driver rates a completed trip; upserts rider_ratings and trips.driver_rating.';

grant execute on function public.driver_rate_completed_trip (uuid, smallint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- D. Rider card for drivers
-- ---------------------------------------------------------------------------
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
      'total_ratings', coalesce(v_count, 0)
    )
  );
end;
$$;

comment on function public.driver_get_trip_rider is
  'Driver trip rider card. Cellphone only when status is EN_ROUTE_PICKUP or later.';

grant execute on function public.driver_get_trip_rider (uuid) to authenticated;
