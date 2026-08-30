-- Vehicle annual onboarding fees by category (first year waived).

-- ---------------------------------------------------------------------------
-- 1. HATCHBACK category + fee columns on vehicles
-- ---------------------------------------------------------------------------
alter table public.vehicles drop constraint if exists vehicles_category_check;
alter table public.vehicles
  add constraint vehicles_category_check check (
    category in ('HATCHBACK', 'TUKTUK', 'SEDAN', 'LUXURY', 'VAN')
  );

alter table public.vehicles
  add column if not exists onboarding_fee_status text not null default 'waived_first_year',
  add column if not exists onboarding_fee_waived_until timestamptz,
  add column if not exists onboarding_fee_paid_until timestamptz,
  add column if not exists onboarding_fee_last_payment_id uuid;

alter table public.vehicles drop constraint if exists vehicles_onboarding_fee_status_check;
alter table public.vehicles
  add constraint vehicles_onboarding_fee_status_check check (
    onboarding_fee_status in ('waived_first_year', 'due', 'paid', 'overdue')
  );

update public.vehicles
set
  onboarding_fee_waived_until = coalesce(onboarding_fee_waived_until, created_at + interval '1 year'),
  onboarding_fee_status = case
    when onboarding_fee_paid_until is not null and onboarding_fee_paid_until > now() then 'paid'
    when coalesce(onboarding_fee_waived_until, created_at + interval '1 year') > now() then 'waived_first_year'
    else 'due'
  end
where onboarding_fee_waived_until is null or onboarding_fee_status = 'waived_first_year';

-- ---------------------------------------------------------------------------
-- 2. Fee tiers (admin-configurable)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_onboarding_fee_tiers (
  category text primary key,
  annual_fee_cents integer not null,
  currency text not null default 'ZAR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_onboarding_fee_tiers_category_check check (
    category in ('HATCHBACK', 'TUKTUK', 'SEDAN', 'LUXURY', 'VAN')
  )
);

insert into public.vehicle_onboarding_fee_tiers (category, annual_fee_cents) values
  ('HATCHBACK', 230000),
  ('SEDAN', 250000),
  ('LUXURY', 280000),
  ('VAN', 300000),
  ('TUKTUK', 230000)
on conflict (category) do update set
  annual_fee_cents = excluded.annual_fee_cents,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Payment records
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_onboarding_payments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (vehicle_id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'ZAR',
  status text not null default 'pending',
  provider text not null default 'payfast',
  provider_payment_id text,
  m_payment_id text,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_onboarding_payments_status_check check (
    status in ('pending', 'paid', 'failed', 'refunded')
  )
);

create index if not exists vehicle_onboarding_payments_vehicle_idx
  on public.vehicle_onboarding_payments (vehicle_id, created_at desc);
create index if not exists vehicle_onboarding_payments_driver_idx
  on public.vehicle_onboarding_payments (driver_id, created_at desc);

alter table public.vehicles
  drop constraint if exists vehicles_onboarding_fee_last_payment_fkey;
alter table public.vehicles
  add constraint vehicles_onboarding_fee_last_payment_fkey
  foreign key (onboarding_fee_last_payment_id)
  references public.vehicle_onboarding_payments (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Trigger: first-year waiver on insert
-- ---------------------------------------------------------------------------
create or replace function public.set_vehicle_onboarding_fee_waiver()
returns trigger
language plpgsql
as $$
begin
  if new.onboarding_fee_waived_until is null then
    new.onboarding_fee_waived_until := new.created_at + interval '1 year';
  end if;
  if new.onboarding_fee_status is null or new.onboarding_fee_status = 'waived_first_year' then
    if new.onboarding_fee_paid_until is not null and new.onboarding_fee_paid_until > now() then
      new.onboarding_fee_status := 'paid';
    elsif new.onboarding_fee_waived_until > now() then
      new.onboarding_fee_status := 'waived_first_year';
    else
      new.onboarding_fee_status := 'due';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_onboarding_fee_waiver on public.vehicles;
create trigger vehicles_onboarding_fee_waiver
  before insert on public.vehicles
  for each row execute function public.set_vehicle_onboarding_fee_waiver();

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.vehicle_onboarding_fee_tiers enable row level security;
alter table public.vehicle_onboarding_payments enable row level security;

drop policy if exists "vehicle_onboarding_fee_tiers_select" on public.vehicle_onboarding_fee_tiers;
create policy "vehicle_onboarding_fee_tiers_select"
  on public.vehicle_onboarding_fee_tiers for select to authenticated
  using (is_active or public.is_admin());

drop policy if exists "vehicle_onboarding_fee_tiers_admin" on public.vehicle_onboarding_fee_tiers;
create policy "vehicle_onboarding_fee_tiers_admin"
  on public.vehicle_onboarding_fee_tiers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vehicle_onboarding_payments_select_owner" on public.vehicle_onboarding_payments;
create policy "vehicle_onboarding_payments_select_owner"
  on public.vehicle_onboarding_payments for select to authenticated
  using (
    driver_id = auth.uid()
    or exists (
      select 1 from public.vehicles v
      where v.vehicle_id = vehicle_onboarding_payments.vehicle_id
        and v.linked_driver_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "vehicle_onboarding_payments_admin" on public.vehicle_onboarding_payments;
create policy "vehicle_onboarding_payments_admin"
  on public.vehicle_onboarding_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_vehicle_onboarding_fee(p_category text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tier public.vehicle_onboarding_fee_tiers%rowtype;
begin
  select * into v_tier
  from public.vehicle_onboarding_fee_tiers
  where category = upper(trim(p_category)) and is_active;

  if v_tier.category is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_category');
  end if;

  return jsonb_build_object(
    'ok', true,
    'category', v_tier.category,
    'annual_fee_cents', v_tier.annual_fee_cents,
    'currency', v_tier.currency
  );
end;
$$;

grant execute on function public.get_vehicle_onboarding_fee(text) to authenticated;

create or replace function public.get_vehicle_onboarding_fee_status(p_vehicle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_tier public.vehicle_onboarding_fee_tiers%rowtype;
  v_status text;
begin
  select * into v_vehicle from public.vehicles where vehicle_id = p_vehicle_id;
  if v_vehicle.vehicle_id is null then
    return jsonb_build_object('ok', false, 'error', 'vehicle_not_found');
  end if;

  if auth.uid() is not null
    and v_vehicle.linked_driver_id is distinct from auth.uid()
    and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select * into v_tier
  from public.vehicle_onboarding_fee_tiers
  where category = v_vehicle.category and is_active;

  if v_vehicle.onboarding_fee_paid_until is not null and v_vehicle.onboarding_fee_paid_until > now() then
    v_status := 'paid';
  elsif coalesce(v_vehicle.onboarding_fee_waived_until, v_vehicle.created_at + interval '1 year') > now() then
    v_status := 'waived_first_year';
  else
    v_status := 'due';
  end if;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v_vehicle.vehicle_id,
    'category', v_vehicle.category,
    'annual_fee_cents', coalesce(v_tier.annual_fee_cents, 0),
    'status', v_status,
    'waived_until', v_vehicle.onboarding_fee_waived_until,
    'paid_until', v_vehicle.onboarding_fee_paid_until,
    'payment_required', v_status = 'due'
  );
end;
$$;

grant execute on function public.get_vehicle_onboarding_fee_status(uuid) to authenticated;

create or replace function public.driver_prepare_onboarding_payment(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_tier public.vehicle_onboarding_fee_tiers%rowtype;
  v_payment_id uuid;
  v_m_payment_id text;
  v_status jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_vehicle from public.vehicles where vehicle_id = p_vehicle_id for update;
  if v_vehicle.vehicle_id is null then
    return jsonb_build_object('ok', false, 'error', 'vehicle_not_found');
  end if;
  if v_vehicle.linked_driver_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  v_status := public.get_vehicle_onboarding_fee_status(p_vehicle_id);
  if coalesce((v_status->>'payment_required')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'payment_not_required', 'status', v_status->>'status');
  end if;

  select * into v_tier
  from public.vehicle_onboarding_fee_tiers
  where category = v_vehicle.category and is_active;
  if v_tier.category is null then
    return jsonb_build_object('ok', false, 'error', 'fee_tier_missing');
  end if;

  insert into public.vehicle_onboarding_payments (
    vehicle_id, driver_id, amount_cents, status
  ) values (
    p_vehicle_id, auth.uid(), v_tier.annual_fee_cents, 'pending'
  ) returning id into v_payment_id;

  v_m_payment_id := 'onboarding:' || p_vehicle_id::text || ':' || v_payment_id::text;

  update public.vehicle_onboarding_payments
  set m_payment_id = v_m_payment_id, updated_at = now()
  where id = v_payment_id;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'm_payment_id', v_m_payment_id,
    'amount_cents', v_tier.annual_fee_cents,
    'category', v_vehicle.category
  );
end;
$$;

grant execute on function public.driver_prepare_onboarding_payment(uuid) to authenticated;

create or replace function public.driver_confirm_onboarding_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_amount_cents integer,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.vehicle_onboarding_payments%rowtype;
  v_paid boolean;
begin
  select * into v_payment
  from public.vehicle_onboarding_payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    return jsonb_build_object('ok', false, 'error', 'payment_not_found');
  end if;

  v_paid := upper(trim(p_status)) in ('COMPLETE', 'PAID');

  update public.vehicle_onboarding_payments set
    status = case when v_paid then 'paid' else 'failed' end,
    provider_payment_id = p_provider_payment_id,
    paid_at = case when v_paid then now() else paid_at end,
    period_start = case when v_paid then now() else period_start end,
    period_end = case when v_paid then now() + interval '1 year' else period_end end,
    updated_at = now()
  where id = p_payment_id;

  if v_paid then
    update public.vehicles set
      onboarding_fee_status = 'paid',
      onboarding_fee_paid_until = now() + interval '1 year',
      onboarding_fee_last_payment_id = p_payment_id,
      updated_at = now()
    where vehicle_id = v_payment.vehicle_id;
  end if;

  return jsonb_build_object('ok', true, 'paid', v_paid);
end;
$$;

revoke all on function public.driver_confirm_onboarding_payment(uuid, text, integer, text) from public;
grant execute on function public.driver_confirm_onboarding_payment(uuid, text, integer, text) to service_role;

create or replace function public.driver_can_submit_registration(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vehicle_id uuid;
  v_status jsonb;
begin
  if auth.uid() is null or auth.uid() is distinct from p_profile_id then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select current_vehicle_id into v_vehicle_id from public.profiles where id = p_profile_id;
  if v_vehicle_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_vehicle', 'can_submit', false);
  end if;

  v_status := public.get_vehicle_onboarding_fee_status(v_vehicle_id);

  return jsonb_build_object(
    'ok', true,
    'can_submit', coalesce((v_status->>'payment_required')::boolean, false) is not true,
    'fee_status', v_status
  );
end;
$$;

grant execute on function public.driver_can_submit_registration(uuid) to authenticated;
