-- Prompt 4: trip summaries for dashboard + go-online precheck (business-logic §3.1, §4.1).

-- ---------------------------------------------------------------------------
-- trips (MVP driver-visible completed trips / earnings)
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  trip_id uuid primary key default gen_random_uuid (),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (vehicle_id) on delete set null,
  status text not null default 'REQUESTED',
  final_fare numeric(12, 2),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_status_mvp_check check (
    status in (
      'REQUESTED',
      'ACCEPTED',
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW'
    )
  )
);

create index if not exists trips_driver_id_completed_at_idx
  on public.trips (driver_id, completed_at desc);

comment on table public.trips is 'MVP trip ledger; app shows today COMPLETED count/sum for dashboard.';

alter table public.trips enable row level security;

drop policy if exists "trips_select_own_driver" on public.trips;
create policy "trips_select_own_driver"
  on public.trips
  for select
  to authenticated
  using (driver_id = auth.uid());

-- Back-office / dispatch can INSERT via service_role later; no driver INSERT in MVP.

-- ---------------------------------------------------------------------------
-- Go-online precheck (SECURITY INVOKER: uses RLS + auth.uid())
-- ---------------------------------------------------------------------------
create or replace function public.driver_precheck_go_online ()
returns jsonb
language plpgsql
stable
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
    online_status
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

  -- Critical documents: expired, past expiry_date, or declined.
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
  'Returns { ok: bool, reasons: string[] } for go-online gating (Prompt 4).';

grant execute on function public.driver_precheck_go_online () to authenticated;

-- Dashboard: react to admin/profile changes (force offline, approvals).
alter publication supabase_realtime add table public.profiles;
