-- Starter subscription package + daily impression cap enforcement.

-- ---------------------------------------------------------------------------
-- 1. ad_packages: subscription kind + daily cap columns
-- ---------------------------------------------------------------------------
alter table public.ad_packages
  add column if not exists daily_impression_cap integer,
  add column if not exists billing_interval_days integer not null default 30;

alter table public.ad_packages drop constraint if exists ad_packages_package_kind_check;
alter table public.ad_packages
  add constraint ad_packages_package_kind_check check (
    package_kind in ('campaign', 'subscription', 'subscription_legacy')
  );

alter table public.campaign_payments drop constraint if exists campaign_payments_kind_check;
alter table public.campaign_payments
  add constraint campaign_payments_kind_check check (
    payment_kind in ('initial', 'topup', 'subscription')
  );

insert into public.ad_packages (
  slug, name, description,
  monthly_price_cents, base_price_cents, min_impressions,
  max_duration_seconds, skip_after_seconds, rider_payout_cents,
  daily_impression_cap, billing_interval_days,
  package_kind, is_active, max_concurrent_campaigns
) values (
  'starter',
  'Starter',
  'Monthly subscription: up to 30 views per day, 30 second ads, skip available immediately.',
  150000, 150000, 1,
  30, 0, 35,
  30, 30,
  'subscription', true, 1
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  base_price_cents = excluded.base_price_cents,
  min_impressions = excluded.min_impressions,
  max_duration_seconds = excluded.max_duration_seconds,
  skip_after_seconds = excluded.skip_after_seconds,
  rider_payout_cents = excluded.rider_payout_cents,
  daily_impression_cap = excluded.daily_impression_cap,
  billing_interval_days = excluded.billing_interval_days,
  package_kind = 'subscription',
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Partner-facing package view (campaign + subscription)
-- ---------------------------------------------------------------------------
create or replace view public.vw_partner_ad_packages
with (security_invoker = true)
as
select
  id,
  slug,
  name,
  description,
  package_kind,
  base_price_cents,
  monthly_price_cents,
  min_impressions,
  max_duration_seconds,
  skip_after_seconds,
  daily_impression_cap,
  billing_interval_days,
  allows_website,
  allows_whatsapp,
  is_active
from public.ad_packages
where package_kind in ('campaign', 'subscription') and is_active;

grant select on public.vw_partner_ad_packages to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Subscription payment + campaign draft RPCs
-- ---------------------------------------------------------------------------
create or replace function public.partner_save_subscription_campaign_draft(
  p_campaign_id uuid,
  p_partner_id uuid,
  p_advertiser text,
  p_company_name text,
  p_package_id uuid,
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
  v_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if trip_private.partner_role(p_partner_id) not in ('owner', 'admin', 'operator') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select * into v_pkg
  from public.ad_packages
  where id = p_package_id and package_kind = 'subscription' and is_active;
  if v_pkg.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_package');
  end if;

  if p_creative_id is not null then
    select * into v_creative from public.ad_creatives where id = p_creative_id and partner_id = p_partner_id;
    if v_creative.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_creative'); end if;
  end if;

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
      impressions_purchased = coalesce(v_pkg.daily_impression_cap, 30) * coalesce(v_pkg.billing_interval_days, 30),
      discount_cents = 0,
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
      coalesce(v_pkg.daily_impression_cap, 30) * coalesce(v_pkg.billing_interval_days, 30),
      0, v_pkg.rider_payout_cents,
      p_start_date, p_end_date, p_destination_type, nullif(trim(p_destination_value), ''),
      nullif(trim(p_campaign_notes), ''), nullif(trim(p_custom_requirements), ''),
      v_creative.storage_path, 'DRAFT', 'pending'
    ) returning campaign_id into v_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'campaign_id', v_id,
    'pricing', jsonb_build_object(
      'total_cents', v_pkg.monthly_price_cents,
      'package_kind', 'subscription'
    )
  );
end;
$$;

grant execute on function public.partner_save_subscription_campaign_draft(uuid, uuid, text, text, uuid, uuid, date, date, text, text, text, text) to authenticated;

create or replace function public.partner_prepare_starter_subscription_payment(
  p_campaign_id uuid,
  p_partner_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_pkg public.ad_packages%rowtype;
  v_sub_id uuid;
  v_payment_id uuid;
  v_m_payment_id text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if trip_private.partner_role(p_partner_id) not in ('owner', 'admin', 'operator') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select * into v_campaign
  from public.ad_campaigns
  where campaign_id = p_campaign_id and partner_id = p_partner_id
  for update;

  if v_campaign.campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  select * into v_pkg
  from public.ad_packages
  where id = v_campaign.package_id and package_kind = 'subscription' and is_active;

  if v_pkg.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_subscription_package');
  end if;

  insert into public.partner_subscriptions (
    partner_id, package_id, status, current_period_start, current_period_end
  ) values (
    p_partner_id, v_pkg.id, 'trialing', now(), now() + (v_pkg.billing_interval_days || ' days')::interval
  )
  returning id into v_sub_id;

  if v_sub_id is null then
    select id into v_sub_id
    from public.partner_subscriptions
    where partner_id = p_partner_id and package_id = v_pkg.id and status in ('trialing', 'active')
    order by created_at desc
    limit 1;
  end if;

  update public.ad_campaigns set
    subscription_id = v_sub_id,
    total_paid_cents = v_pkg.monthly_price_cents,
    updated_at = now()
  where campaign_id = p_campaign_id;

  insert into public.campaign_payments (
    campaign_id, partner_id, amount_cents, status, payment_kind, impressions_count
  ) values (
    p_campaign_id, p_partner_id, v_pkg.monthly_price_cents, 'pending', 'subscription', 0
  ) returning id into v_payment_id;

  v_m_payment_id := 'subscription:' || p_campaign_id::text || ':' || v_payment_id::text;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'm_payment_id', v_m_payment_id,
    'amount_cents', v_pkg.monthly_price_cents,
    'subscription_id', v_sub_id
  );
end;
$$;

grant execute on function public.partner_prepare_starter_subscription_payment(uuid, uuid) to authenticated;

create or replace function public.partner_confirm_starter_subscription_payment(
  p_campaign_id uuid,
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
  v_payment public.campaign_payments%rowtype;
  v_campaign public.ad_campaigns%rowtype;
  v_paid boolean;
begin
  select * into v_payment from public.campaign_payments where id = p_payment_id for update;
  if v_payment.id is null then
    return jsonb_build_object('ok', false, 'error', 'payment_not_found');
  end if;

  v_paid := upper(trim(p_status)) in ('COMPLETE', 'PAID');

  update public.campaign_payments set
    status = case when v_paid then 'complete' else 'failed' end,
    provider_payment_id = p_provider_payment_id,
    confirmed_at = case when v_paid then now() else confirmed_at end
  where id = p_payment_id;

  if v_paid then
    select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;

    update public.ad_campaigns set
      payment_status = 'paid',
      updated_at = now()
    where campaign_id = p_campaign_id;

    if v_campaign.subscription_id is not null then
      update public.partner_subscriptions set
        status = 'active',
        provider_subscription_id = p_provider_payment_id,
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        updated_at = now()
      where id = v_campaign.subscription_id;
    end if;

    perform trip_private.init_campaign_escrow(p_campaign_id);
  end if;

  return jsonb_build_object('ok', true, 'paid', v_paid);
end;
$$;

revoke all on function public.partner_confirm_starter_subscription_payment(uuid, uuid, text, integer, text) from public;
grant execute on function public.partner_confirm_starter_subscription_payment(uuid, uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Daily cap + instant skip in ad delivery
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
  v_daily_count integer;
  v_is_valid boolean := false;
  v_view_id uuid;
  v_skip_after integer;
begin
  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id and status = 'ACTIVE' for update;
  if v_campaign.campaign_id is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_active'); end if;

  select * into v_pkg from public.ad_packages where id = v_campaign.package_id;
  v_skip_after := coalesce(v_pkg.skip_after_seconds, 5);

  if v_pkg.package_kind = 'subscription' and v_pkg.daily_impression_cap is not null then
    select count(*) into v_daily_count
    from public.ad_views av
    where av.campaign_id = p_campaign_id
      and av.created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg')
      and av.state <> 'REJECTED';

    if v_daily_count >= v_pkg.daily_impression_cap then
      return jsonb_build_object('ok', false, 'error', 'daily_cap_reached');
    end if;
  end if;

  v_remaining := coalesce(v_campaign.impressions_purchased, 0) + coalesce(v_campaign.impressions_bonus, 0) - coalesce(v_campaign.impressions_used, 0);
  if v_remaining <= 0 then return jsonb_build_object('ok', false, 'error', 'no_impressions_remaining'); end if;

  select * into v_view from public.ad_views
  where campaign_id = p_campaign_id and trip_id = p_trip_id and rider_id = p_rider_id
  order by created_at desc limit 1;

  if p_event = 'STARTED' then
    insert into public.ad_views (campaign_id, trip_id, rider_id, state)
    values (p_campaign_id, p_trip_id, p_rider_id, 'STARTED')
    returning ad_view_id into v_view_id;
    return jsonb_build_object('ok', true, 'ad_view_id', v_view_id, 'skip_after_seconds', v_skip_after);
  end if;

  if v_view.ad_view_id is null then return jsonb_build_object('ok', false, 'error', 'view_not_started'); end if;

  if p_event = 'COMPLETED' then
    v_is_valid := coalesce(p_watched_seconds, 0) >= coalesce(v_pkg.max_duration_seconds, 999)
      or coalesce(p_watched_seconds, 0) >= v_skip_after;
  elsif p_event = 'SKIPPED' then
    v_is_valid := coalesce(p_watched_seconds, 0) >= v_skip_after;
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
  v_daily_count integer;
begin
  select count(*) into v_paid_count
  from public.ad_views av
  join public.ad_campaigns c on c.campaign_id = av.campaign_id
  where av.trip_id = p_trip_id and c.partner_id is not null and av.state <> 'REJECTED';

  select c.campaign_id, c.video_path, c.advertiser, c.destination_type, c.destination_value,
         p.max_duration_seconds, p.skip_after_seconds, p.package_kind, p.daily_impression_cap, 'partner' as ad_kind
  into v_partner_ad
  from public.ad_campaigns c
  join public.ad_packages p on p.id = c.package_id
  where c.status = 'ACTIVE'
    and c.partner_id is not null
    and coalesce(c.impressions_purchased, 0) + coalesce(c.impressions_bonus, 0) > coalesce(c.impressions_used, 0)
    and (
      p.package_kind <> 'subscription'
      or p.daily_impression_cap is null
      or (
        select count(*) from public.ad_views av2
        where av2.campaign_id = c.campaign_id
          and av2.created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg')
          and av2.state <> 'REJECTED'
      ) < p.daily_impression_cap
    )
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
        'id', v_internal_ad.id,
        'video_path', v_internal_ad.storage_path,
        'advertiser', v_internal_ad.title,
        'cta_url', v_internal_ad.cta_url,
        'max_duration_seconds', v_internal_ad.duration_seconds,
        'skip_after_seconds', 5,
        'ad_kind', 'internal'
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'ads', v_ads);
end;
$$;

revoke all on function public.get_next_ads_for_trip(uuid) from public;
grant execute on function public.get_next_ads_for_trip(uuid) to authenticated, service_role;
