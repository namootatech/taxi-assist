-- Campaign packages pivot: per-campaign pricing, payments, escrow, delivery RPCs.

-- ---------------------------------------------------------------------------
-- 1. ad_packages: campaign package columns
-- ---------------------------------------------------------------------------
alter table public.ad_packages
  add column if not exists base_price_cents integer,
  add column if not exists min_impressions integer not null default 1000,
  add column if not exists max_duration_seconds integer,
  add column if not exists skip_after_seconds integer,
  add column if not exists rider_payout_cents integer,
  add column if not exists allows_website boolean not null default true,
  add column if not exists allows_whatsapp boolean not null default true,
  add column if not exists package_kind text not null default 'campaign';

alter table public.ad_packages
  drop constraint if exists ad_packages_package_kind_check;

alter table public.ad_packages
  add constraint ad_packages_package_kind_check check (package_kind in ('campaign', 'subscription_legacy'));

update public.ad_packages
set package_kind = 'subscription_legacy'
where slug in ('starter', 'growth', 'network');

update public.ad_packages set is_active = false where package_kind = 'subscription_legacy';

insert into public.ad_packages (
  slug, name, description, base_price_cents, min_impressions,
  max_duration_seconds, skip_after_seconds, rider_payout_cents,
  monthly_price_cents, package_kind, is_active
) values
  ('basic', 'Basic', 'Video or image up to 20 seconds. Skip after 5 seconds.', 550000, 1000, 20, 5, 35, 550000, 'campaign', true),
  ('essential', 'Essential', 'Video or image up to 30 seconds. Skip after 10 seconds.', 650000, 1000, 30, 10, 50, 650000, 'campaign', true),
  ('premium', 'Premium', 'Video or image up to 60 seconds. Skip after 20 seconds.', 750000, 1000, 60, 20, 75, 750000, 'campaign', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  base_price_cents = excluded.base_price_cents,
  min_impressions = excluded.min_impressions,
  max_duration_seconds = excluded.max_duration_seconds,
  skip_after_seconds = excluded.skip_after_seconds,
  rider_payout_cents = excluded.rider_payout_cents,
  monthly_price_cents = excluded.base_price_cents,
  package_kind = 'campaign',
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. media_partners extensions
-- ---------------------------------------------------------------------------
alter table public.media_partners
  add column if not exists company_name text,
  add column if not exists prelaunch_bonus_claimed boolean not null default false,
  add column if not exists impression_credits_balance integer not null default 0;

-- ---------------------------------------------------------------------------
-- 3. ad_campaigns extensions
-- ---------------------------------------------------------------------------
alter table public.ad_campaigns
  add column if not exists package_id uuid references public.ad_packages (id) on delete set null,
  add column if not exists company_name text,
  add column if not exists campaign_notes text,
  add column if not exists custom_requirements text,
  add column if not exists destination_type text,
  add column if not exists destination_value text,
  add column if not exists impressions_purchased integer,
  add column if not exists impressions_bonus integer not null default 0,
  add column if not exists impressions_used integer not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists discount_cents integer not null default 0,
  add column if not exists prelaunch_bonus_applied boolean not null default false,
  add column if not exists rider_payout_cents integer,
  add column if not exists escrow_rider_cents integer not null default 0,
  add column if not exists escrow_trip_cents integer not null default 0,
  add column if not exists total_paid_cents integer not null default 0,
  add column if not exists cancellation_reason text;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_destination_type_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_destination_type_check check (
    destination_type is null or destination_type in ('website', 'whatsapp')
  );

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_payment_status_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_payment_status_check check (
    payment_status in ('pending', 'paid', 'refunded')
  );

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_status_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_status_check check (
    status in (
      'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ENDED',
      'REJECTED', 'FORCE_STOPPED', 'CANCELLED', 'CANCELLATION_PENDING'
    )
  );

-- Sync legacy columns
update public.ad_campaigns
set
  impressions_purchased = coalesce(impressions_purchased, max_views),
  impressions_used = coalesce(nullif(impressions_used, 0), current_views)
where partner_id is not null;

-- ---------------------------------------------------------------------------
-- 4. New tables
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (campaign_id) on delete cascade,
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  provider text not null default 'payfast',
  provider_payment_id text,
  payment_kind text not null default 'initial',
  amount_cents integer not null,
  impressions_count integer not null default 0,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint campaign_payments_provider_check check (provider in ('payfast', 'paystack')),
  constraint campaign_payments_kind_check check (payment_kind in ('initial', 'topup')),
  constraint campaign_payments_status_check check (status in ('pending', 'complete', 'failed', 'cancelled'))
);

create unique index if not exists campaign_payments_provider_event_unique
  on public.campaign_payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists campaign_payments_campaign_idx on public.campaign_payments (campaign_id, created_at desc);
create index if not exists campaign_payments_partner_idx on public.campaign_payments (partner_id, created_at desc);

create table if not exists public.campaign_impression_ledger (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (campaign_id) on delete cascade,
  partner_id uuid references public.media_partners (id) on delete set null,
  ad_view_id uuid references public.ad_views (ad_view_id) on delete set null,
  direction text not null,
  impressions integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint campaign_impression_ledger_direction_check check (direction in ('debit', 'credit')),
  constraint campaign_impression_ledger_impressions_positive check (impressions > 0)
);

create index if not exists campaign_impression_ledger_campaign_idx
  on public.campaign_impression_ledger (campaign_id, created_at desc);

create table if not exists public.ad_click_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (campaign_id) on delete cascade,
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  trip_id uuid,
  rider_id uuid references public.profiles (id) on delete set null,
  destination_type text not null,
  destination_value text not null,
  created_at timestamptz not null default now(),
  constraint ad_click_events_destination_type_check check (destination_type in ('website', 'whatsapp'))
);

create index if not exists ad_click_events_campaign_idx on public.ad_click_events (campaign_id, created_at desc);

create table if not exists public.internal_trip_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  mime_type text,
  duration_seconds integer,
  cta_url text,
  status text not null default 'active',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_trip_ads_status_check check (status in ('draft', 'active', 'paused', 'archived'))
);

create table if not exists public.platform_promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  discount_pct numeric(5, 2) not null default 50,
  bonus_impressions integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_promotions (slug, name, start_at, end_at, discount_pct, bonus_impressions)
values (
  'prelaunch_gauteng',
  'Prelaunch Gauteng',
  '2026-01-01'::timestamptz,
  '2026-12-31'::timestamptz,
  50,
  1000
)
on conflict (slug) do update set
  discount_pct = excluded.discount_pct,
  bonus_impressions = excluded.bonus_impressions,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Partner-facing package view (hides rider payout)
-- ---------------------------------------------------------------------------
create or replace view public.vw_partner_ad_packages
with (security_invoker = true)
as
select
  id,
  slug,
  name,
  description,
  base_price_cents,
  min_impressions,
  max_duration_seconds,
  skip_after_seconds,
  allows_website,
  allows_whatsapp,
  is_active
from public.ad_packages
where package_kind = 'campaign' and is_active;

grant select on public.vw_partner_ad_packages to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------
alter table public.campaign_payments enable row level security;
alter table public.campaign_impression_ledger enable row level security;
alter table public.ad_click_events enable row level security;
alter table public.internal_trip_ads enable row level security;
alter table public.platform_promotions enable row level security;

drop policy if exists "campaign_payments_select_member" on public.campaign_payments;
create policy "campaign_payments_select_member"
  on public.campaign_payments for select to authenticated
  using (trip_private.is_partner_member(partner_id) or public.is_admin());

drop policy if exists "ad_click_events_select_member" on public.ad_click_events;
create policy "ad_click_events_select_member"
  on public.ad_click_events for select to authenticated
  using (trip_private.is_partner_member(partner_id) or public.is_admin());

drop policy if exists "campaign_impression_ledger_select_member" on public.campaign_impression_ledger;
create policy "campaign_impression_ledger_select_member"
  on public.campaign_impression_ledger for select to authenticated
  using (
    partner_id is not null and trip_private.is_partner_member(partner_id)
    or public.is_admin()
  );

drop policy if exists "internal_trip_ads_admin" on public.internal_trip_ads;
create policy "internal_trip_ads_admin"
  on public.internal_trip_ads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "platform_promotions_select" on public.platform_promotions;
create policy "platform_promotions_select"
  on public.platform_promotions for select to authenticated
  using (is_active or public.is_admin());

drop policy if exists "platform_promotions_admin" on public.platform_promotions;
create policy "platform_promotions_admin"
  on public.platform_promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Helpers
-- ---------------------------------------------------------------------------
create or replace function trip_private.active_prelaunch_promotion()
returns public.platform_promotions
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.platform_promotions
  where is_active
    and slug = 'prelaunch_gauteng'
    and now() >= start_at
    and now() < end_at
  limit 1;
$$;

create or replace function public.compute_campaign_price_cents(
  p_package_id uuid,
  p_impressions integer,
  p_partner_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pkg public.ad_packages%rowtype;
  v_promo public.platform_promotions%rowtype;
  v_partner public.media_partners%rowtype;
  v_subtotal integer;
  v_discount integer := 0;
  v_bonus integer := 0;
  v_total integer;
begin
  select * into v_pkg from public.ad_packages where id = p_package_id and package_kind = 'campaign' and is_active;
  if v_pkg.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_package');
  end if;
  if p_impressions < v_pkg.min_impressions then
    return jsonb_build_object('ok', false, 'error', 'min_impressions', 'min', v_pkg.min_impressions);
  end if;

  v_subtotal := (v_pkg.base_price_cents * p_impressions) / v_pkg.min_impressions;

  select * into v_promo from trip_private.active_prelaunch_promotion();
  if v_promo.id is not null then
    v_discount := round(v_subtotal * v_promo.discount_pct / 100.0);
  end if;

  select * into v_partner from public.media_partners where id = p_partner_id;
  if v_promo.id is not null and v_partner.prelaunch_bonus_claimed is distinct from true then
    v_bonus := v_promo.bonus_impressions;
  end if;

  v_total := v_subtotal - v_discount;

  return jsonb_build_object(
    'ok', true,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'total_cents', v_total,
    'bonus_impressions', v_bonus,
    'cost_per_impression_cents', v_pkg.base_price_cents / v_pkg.min_impressions,
    'package_id', v_pkg.id
  );
end;
$$;

grant execute on function public.compute_campaign_price_cents(uuid, integer, uuid) to authenticated;

create or replace function trip_private.init_campaign_escrow(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_total_impressions integer;
  v_rider_per_impression integer;
  v_paid_impressions integer;
  v_bonus_impressions integer;
  v_rider_escrow integer;
  v_trip_escrow integer;
begin
  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then return; end if;

  v_total_impressions := coalesce(v_campaign.impressions_purchased, 0) + coalesce(v_campaign.impressions_bonus, 0);
  v_rider_per_impression := coalesce(v_campaign.rider_payout_cents, round(v_campaign.reward_per_view * 100)::integer, 0);
  v_paid_impressions := coalesce(v_campaign.impressions_purchased, 0);
  v_bonus_impressions := coalesce(v_campaign.impressions_bonus, 0);

  v_rider_escrow := v_total_impressions * v_rider_per_impression;
  v_trip_escrow := greatest(v_campaign.total_paid_cents - (v_paid_impressions * v_rider_per_impression), 0);

  update public.ad_campaigns
  set
    escrow_rider_cents = v_rider_escrow,
    escrow_trip_cents = v_trip_escrow,
    max_views = v_total_impressions,
    impression_cap = v_total_impressions,
    reward_per_view = v_rider_per_impression / 100.0,
    updated_at = now()
  where campaign_id = p_campaign_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Partner RPCs
-- ---------------------------------------------------------------------------
create or replace function public.partner_save_campaign_draft(
  p_campaign_id uuid,
  p_partner_id uuid,
  p_advertiser text,
  p_company_name text,
  p_package_id uuid,
  p_impressions integer,
  p_creative_id uuid,
  p_start_date date,
  p_end_date date,
  p_destination_type text,
  p_destination_value text,
  p_campaign_notes text,
  p_custom_requirements text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.ad_packages%rowtype;
  v_creative public.ad_creatives%rowtype;
  v_campaign public.ad_campaigns%rowtype;
  v_price jsonb;
  v_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if trip_private.partner_role(p_partner_id) not in ('owner', 'admin', 'operator') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select * into v_pkg from public.ad_packages where id = p_package_id and package_kind = 'campaign' and is_active;
  if v_pkg.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_package'); end if;
  if p_impressions < v_pkg.min_impressions then
    return jsonb_build_object('ok', false, 'error', 'min_impressions', 'min', v_pkg.min_impressions);
  end if;

  if p_creative_id is not null then
    select * into v_creative from public.ad_creatives where id = p_creative_id and partner_id = p_partner_id;
    if v_creative.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_creative'); end if;
  end if;

  if p_destination_type is not null and p_destination_type not in ('website', 'whatsapp') then
    return jsonb_build_object('ok', false, 'error', 'invalid_destination');
  end if;

  v_price := public.compute_campaign_price_cents(p_package_id, p_impressions, p_partner_id);

  if p_campaign_id is not null then
    select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id and partner_id = p_partner_id for update;
    if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;
    if v_campaign.status not in ('DRAFT', 'REJECTED') then
      return jsonb_build_object('ok', false, 'error', 'not_editable');
    end if;

    update public.ad_campaigns set
      advertiser = p_advertiser,
      company_name = p_company_name,
      package_id = p_package_id,
      creative_id = p_creative_id,
      impressions_purchased = p_impressions,
      discount_cents = (v_price->>'discount_cents')::integer,
      rider_payout_cents = v_pkg.rider_payout_cents,
      start_date = p_start_date,
      end_date = p_end_date,
      destination_type = p_destination_type,
      destination_value = nullif(trim(p_destination_value), ''),
      campaign_notes = nullif(trim(p_campaign_notes), ''),
      custom_requirements = nullif(trim(p_custom_requirements), ''),
      video_path = coalesce(v_creative.storage_path, video_path),
      updated_at = now()
    where campaign_id = p_campaign_id;
    v_id := p_campaign_id;
  else
    insert into public.ad_campaigns (
      advertiser, partner_id, company_name, package_id, creative_id,
      impressions_purchased, discount_cents, rider_payout_cents,
      start_date, end_date, destination_type, destination_value,
      campaign_notes, custom_requirements, video_path, status, payment_status
    ) values (
      p_advertiser, p_partner_id, p_company_name, p_package_id, p_creative_id,
      p_impressions, (v_price->>'discount_cents')::integer, v_pkg.rider_payout_cents,
      p_start_date, p_end_date, p_destination_type, nullif(trim(p_destination_value), ''),
      nullif(trim(p_campaign_notes), ''), nullif(trim(p_custom_requirements), ''),
      coalesce(v_creative.storage_path, 'pending://creative'),
      'DRAFT', 'pending'
    )
    returning campaign_id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'campaign_id', v_id, 'pricing', v_price);
end;
$$;

grant execute on function public.partner_save_campaign_draft(uuid, uuid, text, text, uuid, integer, uuid, date, date, text, text, text, text) to authenticated;

create or replace function public.partner_prepare_campaign_payment(
  p_campaign_id uuid,
  p_partner_id uuid,
  p_payment_kind text default 'initial'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_price jsonb;
  v_payment_id uuid;
  v_amount integer;
  v_impressions integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if trip_private.partner_role(p_partner_id) not in ('owner', 'admin', 'operator') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id and partner_id = p_partner_id for update;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;

  if p_payment_kind = 'initial' then
    if v_campaign.status not in ('DRAFT', 'REJECTED') then
      return jsonb_build_object('ok', false, 'error', 'invalid_status');
    end if;
    v_impressions := coalesce(v_campaign.impressions_purchased, 0);
    v_price := public.compute_campaign_price_cents(v_campaign.package_id, v_impressions, p_partner_id);
    v_amount := (v_price->>'total_cents')::integer;
  else
    return jsonb_build_object('ok', false, 'error', 'use_topup_rpc');
  end if;

  insert into public.campaign_payments (
    campaign_id, partner_id, payment_kind, amount_cents, impressions_count, status
  ) values (
    p_campaign_id, p_partner_id, p_payment_kind, v_amount, v_impressions, 'pending'
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'amount_cents', v_amount,
    'm_payment_id', 'campaign:' || p_campaign_id::text || ':' || v_payment_id::text,
    'pricing', v_price
  );
end;
$$;

grant execute on function public.partner_prepare_campaign_payment(uuid, uuid, text) to authenticated;

create or replace function public.partner_confirm_campaign_payment(
  p_campaign_id uuid,
  p_payment_id uuid,
  p_provider_payment_id text,
  p_amount_cents integer,
  p_status text default 'COMPLETE'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.campaign_payments%rowtype;
  v_campaign public.ad_campaigns%rowtype;
  v_partner public.media_partners%rowtype;
  v_price jsonb;
  v_bonus integer;
begin
  select * into v_payment from public.campaign_payments where id = p_payment_id and campaign_id = p_campaign_id for update;
  if v_payment.id is null then return jsonb_build_object('ok', false, 'error', 'payment_not_found'); end if;
  if v_payment.status = 'complete' then return jsonb_build_object('ok', true, 'already_confirmed'); end if;

  if upper(p_status) <> 'COMPLETE' then
    update public.campaign_payments set status = 'failed', provider_payment_id = p_provider_payment_id where id = p_payment_id;
    return jsonb_build_object('ok', false, 'error', 'payment_failed');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  select * into v_partner from public.media_partners where id = v_payment.partner_id for update;

  v_price := public.compute_campaign_price_cents(v_campaign.package_id, v_campaign.impressions_purchased, v_payment.partner_id);
  v_bonus := coalesce((v_price->>'bonus_impressions')::integer, 0);

  update public.campaign_payments set
    status = 'complete',
    provider_payment_id = p_provider_payment_id,
    confirmed_at = now(),
    amount_cents = p_amount_cents
  where id = p_payment_id;

  update public.ad_campaigns set
    payment_status = 'paid',
    total_paid_cents = p_amount_cents,
    discount_cents = (v_price->>'discount_cents')::integer,
    impressions_bonus = case when v_bonus > 0 and v_partner.prelaunch_bonus_claimed is distinct from true then v_bonus else impressions_bonus end,
    prelaunch_bonus_applied = case when v_bonus > 0 and v_partner.prelaunch_bonus_claimed is distinct from true then true else prelaunch_bonus_applied end,
    updated_at = now()
  where campaign_id = p_campaign_id;

  if v_bonus > 0 and v_partner.prelaunch_bonus_claimed is distinct from true then
    update public.media_partners set prelaunch_bonus_claimed = true, updated_at = now() where id = v_payment.partner_id;
  end if;

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id, 'bonus_impressions', v_bonus);
end;
$$;

revoke all on function public.partner_confirm_campaign_payment(uuid, uuid, text, integer, text) from public;
grant execute on function public.partner_confirm_campaign_payment(uuid, uuid, text, integer, text) to service_role;

create or replace function public.partner_add_campaign_impressions(
  p_campaign_id uuid,
  p_partner_id uuid,
  p_impressions integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_pkg public.ad_packages%rowtype;
  v_amount integer;
  v_payment_id uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if trip_private.partner_role(p_partner_id) not in ('owner', 'admin', 'operator') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_impressions <= 0 then return jsonb_build_object('ok', false, 'error', 'invalid_impressions'); end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id and partner_id = p_partner_id for update;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;
  if v_campaign.status <> 'ACTIVE' then return jsonb_build_object('ok', false, 'error', 'campaign_not_active'); end if;
  if v_campaign.payment_status <> 'paid' then return jsonb_build_object('ok', false, 'error', 'payment_required'); end if;

  select * into v_pkg from public.ad_packages where id = v_campaign.package_id;
  v_amount := (v_pkg.base_price_cents * p_impressions) / v_pkg.min_impressions;

  insert into public.campaign_payments (
    campaign_id, partner_id, payment_kind, amount_cents, impressions_count, status
  ) values (
    p_campaign_id, p_partner_id, 'topup', v_amount, p_impressions, 'pending'
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'amount_cents', v_amount,
    'm_payment_id', 'topup:' || p_campaign_id::text || ':' || v_payment_id::text
  );
end;
$$;

grant execute on function public.partner_add_campaign_impressions(uuid, uuid, integer) to authenticated;

create or replace function public.partner_confirm_impression_topup(
  p_campaign_id uuid,
  p_payment_id uuid,
  p_provider_payment_id text,
  p_amount_cents integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.campaign_payments%rowtype;
  v_campaign public.ad_campaigns%rowtype;
begin
  select * into v_payment from public.campaign_payments where id = p_payment_id and campaign_id = p_campaign_id and payment_kind = 'topup' for update;
  if v_payment.id is null then return jsonb_build_object('ok', false, 'error', 'payment_not_found'); end if;
  if v_payment.status = 'complete' then return jsonb_build_object('ok', true); end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;

  update public.campaign_payments set status = 'complete', provider_payment_id = p_provider_payment_id, confirmed_at = now() where id = p_payment_id;

  update public.ad_campaigns set
    impressions_purchased = coalesce(impressions_purchased, 0) + v_payment.impressions_count,
    max_views = coalesce(max_views, 0) + v_payment.impressions_count,
    impression_cap = coalesce(impression_cap, 0) + v_payment.impressions_count,
    total_paid_cents = total_paid_cents + p_amount_cents,
    escrow_rider_cents = escrow_rider_cents + (v_payment.impressions_count * coalesce(rider_payout_cents, 0)),
    escrow_trip_cents = escrow_trip_cents + (p_amount_cents - (v_payment.impressions_count * coalesce(rider_payout_cents, 0))),
    updated_at = now()
  where campaign_id = p_campaign_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.partner_confirm_impression_topup(uuid, uuid, text, integer) from public;
grant execute on function public.partner_confirm_impression_topup(uuid, uuid, text, integer) to service_role;

create or replace function public.partner_request_campaign_cancellation(
  p_campaign_id uuid,
  p_partner_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if nullif(trim(p_reason), '') is null then return jsonb_build_object('ok', false, 'error', 'reason_required'); end if;

  update public.ad_campaigns set
    status = 'CANCELLATION_PENDING',
    cancellation_reason = trim(p_reason),
    updated_at = now()
  where campaign_id = p_campaign_id
    and partner_id = p_partner_id
    and status in ('ACTIVE', 'PAUSED', 'PENDING_REVIEW');

  if not found then return jsonb_build_object('ok', false, 'error', 'not_cancellable'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.partner_request_campaign_cancellation(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Extend admin_set_campaign_status (approve/reject + escrow)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_campaign_status (
  p_campaign_id uuid,
  p_status text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_status not in ('PAUSED', 'ACTIVE', 'FORCE_STOPPED', 'REJECTED') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if p_status in ('FORCE_STOPPED', 'REJECTED') and nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  if p_status = 'ACTIVE' and v_campaign.payment_status <> 'paid' then
    return jsonb_build_object('ok', false, 'error', 'payment_not_confirmed');
  end if;

  update public.ad_campaigns
  set
    status = p_status,
    review_note = case when p_status = 'REJECTED' then nullif(trim(p_reason), '') else review_note end,
    last_admin_action_at = v_now,
    last_admin_action_by = auth.uid (),
    force_stop_reason = case when p_status = 'FORCE_STOPPED' then nullif(trim(p_reason), '') else force_stop_reason end,
    force_stopped_at = case when p_status = 'FORCE_STOPPED' then v_now else force_stopped_at end,
    force_stopped_by = case when p_status = 'FORCE_STOPPED' then auth.uid () else force_stopped_by end,
    activated_at = case when p_status = 'ACTIVE' and activated_at is null then v_now else activated_at end,
    updated_at = v_now
  where campaign_id = p_campaign_id;

  if p_status = 'ACTIVE' then
    perform trip_private.init_campaign_escrow(p_campaign_id);
  end if;

  perform public.admin_audit_log(
    'campaign.' || lower(p_status),
    'ad_campaigns',
    p_campaign_id,
    p_reason,
    jsonb_build_object('partner_id', v_campaign.partner_id, 'previous_status', v_campaign.status, 'new_status', p_status)
  );

  if v_campaign.partner_id is not null then
    insert into public.partner_notifications (partner_id, kind, title, body, link)
    values (
      v_campaign.partner_id,
      case when p_status = 'ACTIVE' then 'success' when p_status = 'REJECTED' then 'error' else 'warning' end,
      case
        when p_status = 'PAUSED' then 'Campaign paused by Trip'
        when p_status = 'ACTIVE' then 'Campaign approved'
        when p_status = 'FORCE_STOPPED' then 'Campaign force-stopped by Trip'
        when p_status = 'REJECTED' then 'Campaign rejected'
        else 'Campaign status updated'
      end,
      coalesce(nullif(trim(p_reason), ''), 'Open the campaign to see details.'),
      '/dashboard/campaigns/' || p_campaign_id::text
    );
  end if;

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id, 'status', p_status);
end;
$$;

create or replace function public.admin_cancel_campaign_credit_partner(
  p_campaign_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_remaining integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if public.is_admin() is distinct from true then return jsonb_build_object('ok', false, 'error', 'not_authorized'); end if;
  if nullif(trim(p_reason), '') is null then return jsonb_build_object('ok', false, 'error', 'reason_required'); end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;

  v_remaining := greatest(
    coalesce(v_campaign.impressions_purchased, 0) + coalesce(v_campaign.impressions_bonus, 0) - coalesce(v_campaign.impressions_used, 0),
    0
  );

  if v_remaining > 0 and v_campaign.partner_id is not null then
    update public.media_partners
    set impression_credits_balance = impression_credits_balance + v_remaining, updated_at = now()
    where id = v_campaign.partner_id;

    insert into public.campaign_impression_ledger (
      campaign_id, partner_id, direction, impressions, reason, metadata
    ) values (
      p_campaign_id, v_campaign.partner_id, 'credit', v_remaining, 'cancellation_credit',
      jsonb_build_object('admin_reason', p_reason)
    );
  end if;

  update public.ad_campaigns set
    status = 'CANCELLED',
    cancellation_reason = trim(p_reason),
    updated_at = now()
  where campaign_id = p_campaign_id;

  perform public.admin_audit_log('campaign.cancelled', 'ad_campaigns', p_campaign_id, p_reason, jsonb_build_object('credited_impressions', v_remaining));

  return jsonb_build_object('ok', true, 'credited_impressions', v_remaining);
end;
$$;

grant execute on function public.admin_cancel_campaign_credit_partner(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Delivery RPCs
-- ---------------------------------------------------------------------------
create or replace function public.record_ad_view_event(
  p_trip_id uuid,
  p_rider_id uuid,
  p_campaign_id uuid,
  p_event text,
  p_watched_seconds integer default null,
  p_rating smallint default null,
  p_comment text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_pkg public.ad_packages%rowtype;
  v_view public.ad_views%rowtype;
  v_remaining integer;
  v_is_valid boolean := false;
  v_view_id uuid;
begin
  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id and status = 'ACTIVE' for update;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_active'); end if;

  select * into v_pkg from public.ad_packages where id = v_campaign.package_id;
  v_remaining := coalesce(v_campaign.impressions_purchased, 0) + coalesce(v_campaign.impressions_bonus, 0) - coalesce(v_campaign.impressions_used, 0);
  if v_remaining <= 0 then return jsonb_build_object('ok', false, 'error', 'no_impressions_remaining'); end if;

  select * into v_view from public.ad_views
  where campaign_id = p_campaign_id and trip_id = p_trip_id and rider_id = p_rider_id
  order by created_at desc limit 1;

  if p_event = 'STARTED' then
    insert into public.ad_views (campaign_id, trip_id, rider_id, state)
    values (p_campaign_id, p_trip_id, p_rider_id, 'STARTED')
    returning ad_view_id into v_view_id;
    return jsonb_build_object('ok', true, 'ad_view_id', v_view_id, 'skip_after_seconds', coalesce(v_pkg.skip_after_seconds, 5));
  end if;

  if v_view.ad_view_id is null then return jsonb_build_object('ok', false, 'error', 'view_not_started'); end if;

  if p_event = 'COMPLETED' then
    v_is_valid := coalesce(p_watched_seconds, 0) >= coalesce(v_pkg.max_duration_seconds, 999)
      or coalesce(p_watched_seconds, 0) >= coalesce(v_pkg.skip_after_seconds, 5);
  elsif p_event = 'SKIPPED' then
    v_is_valid := coalesce(p_watched_seconds, 0) >= coalesce(v_pkg.skip_after_seconds, 5);
  elsif p_event = 'ABANDONED' then
    v_is_valid := false;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_event');
  end if;

  if not v_is_valid then
    update public.ad_views set state = 'REJECTED', watched_at = now() where ad_view_id = v_view.ad_view_id;
    return jsonb_build_object('ok', true, 'valid', false, 'ad_view_id', v_view.ad_view_id);
  end if;

  update public.ad_views set
    state = case when p_rating is not null then 'RATED' else 'WATCHED' end,
    rating = coalesce(p_rating, rating),
    comment = coalesce(p_comment, comment),
    watched_at = now()
  where ad_view_id = v_view.ad_view_id;

  update public.ad_campaigns set
    impressions_used = coalesce(impressions_used, 0) + 1,
    current_views = coalesce(current_views, 0) + 1,
    updated_at = now()
  where campaign_id = p_campaign_id;

  insert into public.campaign_impression_ledger (
    campaign_id, partner_id, ad_view_id, direction, impressions, reason
  ) values (
    p_campaign_id, v_campaign.partner_id, v_view.ad_view_id, 'debit', 1, 'valid_impression'
  );

  return jsonb_build_object('ok', true, 'valid', true, 'ad_view_id', v_view.ad_view_id);
end;
$$;

revoke all on function public.record_ad_view_event(uuid, uuid, uuid, text, integer, smallint, text) from public;
grant execute on function public.record_ad_view_event(uuid, uuid, uuid, text, integer, smallint, text) to authenticated, service_role;

create or replace function public.finalize_trip_ad_rewards(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_view record;
  v_campaign public.ad_campaigns%rowtype;
  v_wallet public.wallets%rowtype;
  v_amount numeric(12, 2);
  v_payout_cents integer;
  v_total numeric(12, 2) := 0;
  v_count integer := 0;
begin
  for v_view in
    select av.* from public.ad_views av
    where av.trip_id = p_trip_id and av.state in ('WATCHED', 'RATED')
  loop
    select * into v_campaign from public.ad_campaigns where campaign_id = v_view.campaign_id for update;
    v_payout_cents := coalesce(v_campaign.rider_payout_cents, round(v_campaign.reward_per_view * 100)::integer, 0);
    v_amount := v_payout_cents / 100.0;

    if v_amount <= 0 then
      update public.ad_views set state = 'CREDITED' where ad_view_id = v_view.ad_view_id;
      continue;
    end if;

    select * into v_wallet from public.wallets where profile_id = v_view.rider_id and wallet_type = 'RIDER' for update;
    if v_wallet.wallet_id is null then
      insert into public.wallets (profile_id, wallet_type) values (v_view.rider_id, 'RIDER') returning * into v_wallet;
    end if;

    insert into public.wallet_transactions (wallet_id, direction, amount, type, reference, metadata)
    values (
      v_wallet.wallet_id, 'CREDIT', v_amount, 'AD_REWARD', v_view.ad_view_id::text,
      jsonb_build_object('campaign_id', v_view.campaign_id, 'trip_id', p_trip_id)
    );

    update public.wallets set balance = balance + v_amount, updated_at = now() where wallet_id = v_wallet.wallet_id;
    update public.ad_views set state = 'CREDITED' where ad_view_id = v_view.ad_view_id;

    update public.ad_campaigns set
      escrow_rider_cents = greatest(escrow_rider_cents - v_payout_cents, 0),
      updated_at = now()
    where campaign_id = v_view.campaign_id;

    v_total := v_total + v_amount;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'credited_count', v_count, 'total_amount', v_total);
end;
$$;

revoke all on function public.finalize_trip_ad_rewards(uuid) from public;
grant execute on function public.finalize_trip_ad_rewards(uuid) to authenticated, service_role;

create or replace function public.get_next_ads_for_trip(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_paid_count integer;
  v_partner_ad record;
  v_internal_ad record;
  v_ads jsonb := '[]'::jsonb;
begin
  select count(*) into v_paid_count
  from public.ad_views av
  join public.ad_campaigns c on c.campaign_id = av.campaign_id
  where av.trip_id = p_trip_id and c.partner_id is not null and av.state <> 'REJECTED';

  select c.campaign_id, c.video_path, c.advertiser, c.destination_type, c.destination_value,
         p.max_duration_seconds, p.skip_after_seconds, 'partner' as ad_kind
  into v_partner_ad
  from public.ad_campaigns c
  join public.ad_packages p on p.id = c.package_id
  where c.status = 'ACTIVE'
    and c.partner_id is not null
    and coalesce(c.impressions_purchased, 0) + coalesce(c.impressions_bonus, 0) > coalesce(c.impressions_used, 0)
  order by random()
  limit 1;

  if v_partner_ad.campaign_id is not null then
    v_ads := v_ads || jsonb_build_object(
      'campaign_id', v_partner_ad.campaign_id,
      'video_path', v_partner_ad.video_path,
      'advertiser', v_partner_ad.advertiser,
      'destination_type', v_partner_ad.destination_type,
      'destination_value', v_partner_ad.destination_value,
      'max_duration_seconds', v_partner_ad.max_duration_seconds,
      'skip_after_seconds', v_partner_ad.skip_after_seconds,
      'ad_kind', 'partner'
    );
  end if;

  if v_paid_count > 0 and mod(v_paid_count, 2) = 0 then
    select id, storage_path, title, cta_url, duration_seconds, 'internal' as ad_kind
    into v_internal_ad
    from public.internal_trip_ads
    where status = 'active'
    order by sort_order, random()
    limit 1;

    if v_internal_ad.id is not null then
      v_ads := v_ads || jsonb_build_object(
        'internal_ad_id', v_internal_ad.id,
        'video_path', v_internal_ad.storage_path,
        'advertiser', v_internal_ad.title,
        'destination_type', 'website',
        'destination_value', v_internal_ad.cta_url,
        'ad_kind', 'internal'
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'ads', v_ads);
end;
$$;

grant execute on function public.get_next_ads_for_trip(uuid) to authenticated, service_role;

create or replace function public.record_ad_click(
  p_campaign_id uuid,
  p_trip_id uuid,
  p_rider_id uuid,
  p_destination_type text,
  p_destination_value text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
begin
  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;

  insert into public.ad_click_events (
    campaign_id, partner_id, trip_id, rider_id, destination_type, destination_value
  ) values (
    p_campaign_id, v_campaign.partner_id, p_trip_id, p_rider_id, p_destination_type, p_destination_value
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.record_ad_click(uuid, uuid, uuid, text, text) to authenticated, service_role;
