-- Admin tools: campaign package adjustments, rider payout multiplier, internal ad storage.

-- Default launch payout multiplier (1.0 = package rate; >1 for higher launch incentives).
insert into public.trip_media_settings (key, value)
values ('rider_payout_multiplier', '{"multiplier": 1.25}'::jsonb)
on conflict (key) do nothing;

-- Admin upload/read for internal Trip ads under partner-ad-creatives/internal/
drop policy if exists "partner_creatives_admin_internal_select" on storage.objects;
create policy "partner_creatives_admin_internal_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-ad-creatives'
    and (storage.foldername(name))[1] = 'internal'
    and public.is_admin()
  );

drop policy if exists "partner_creatives_admin_internal_write" on storage.objects;
create policy "partner_creatives_admin_internal_write"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'partner-ad-creatives'
    and (storage.foldername(name))[1] = 'internal'
    and public.is_admin()
  )
  with check (
    bucket_id = 'partner-ad-creatives'
    and (storage.foldername(name))[1] = 'internal'
    and public.is_admin()
  );

create or replace function trip_private.rider_payout_multiplier()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif((value->>'multiplier')::numeric, 0),
    1.0
  )
  from public.trip_media_settings
  where key = 'rider_payout_multiplier'
  limit 1;
$$;

create or replace function public.admin_adjust_campaign_package(
  p_campaign_id uuid,
  p_package_id uuid default null,
  p_impressions_purchased integer default null,
  p_impressions_bonus integer default null,
  p_rider_payout_cents integer default null,
  p_start_date date default null,
  p_end_date date default null,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_pkg public.ad_packages%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin() is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  if p_package_id is not null then
    select * into v_pkg from public.ad_packages
    where id = p_package_id and package_kind = 'campaign' and is_active;
    if v_pkg.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_package');
    end if;
  end if;

  if p_impressions_purchased is not null and p_impressions_purchased < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_impressions');
  end if;

  update public.ad_campaigns
  set
    package_id = coalesce(p_package_id, package_id),
    impressions_purchased = coalesce(p_impressions_purchased, impressions_purchased),
    impressions_bonus = coalesce(p_impressions_bonus, impressions_bonus),
    rider_payout_cents = coalesce(p_rider_payout_cents, rider_payout_cents),
    start_date = coalesce(p_start_date, start_date),
    end_date = coalesce(p_end_date, end_date),
    last_admin_action_at = v_now,
    last_admin_action_by = auth.uid(),
    updated_at = v_now
  where campaign_id = p_campaign_id;

  if (select status from public.ad_campaigns where campaign_id = p_campaign_id) = 'ACTIVE' then
    perform trip_private.init_campaign_escrow(p_campaign_id);
  end if;

  perform public.admin_audit_log(
    'campaign.adjust_package',
    'ad_campaigns',
    p_campaign_id,
    p_reason,
    jsonb_build_object(
      'partner_id', v_campaign.partner_id,
      'package_id', coalesce(p_package_id, v_campaign.package_id),
      'impressions_purchased', coalesce(p_impressions_purchased, v_campaign.impressions_purchased),
      'impressions_bonus', coalesce(p_impressions_bonus, v_campaign.impressions_bonus),
      'rider_payout_cents', coalesce(p_rider_payout_cents, v_campaign.rider_payout_cents)
    )
  );

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id);
end;
$$;

grant execute on function public.admin_adjust_campaign_package(
  uuid, uuid, integer, integer, integer, date, date, text
) to authenticated;

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
  v_multiplier numeric;
  v_total numeric(12, 2) := 0;
  v_count integer := 0;
begin
  v_multiplier := trip_private.rider_payout_multiplier();

  for v_view in
    select av.* from public.ad_views av
    where av.trip_id = p_trip_id and av.state in ('WATCHED', 'RATED')
  loop
    select * into v_campaign from public.ad_campaigns where campaign_id = v_view.campaign_id for update;
    v_payout_cents := round(
      coalesce(v_campaign.rider_payout_cents, round(v_campaign.reward_per_view * 100)::integer, 0) * v_multiplier
    )::integer;
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
      jsonb_build_object(
        'campaign_id', v_view.campaign_id,
        'trip_id', p_trip_id,
        'payout_multiplier', v_multiplier
      )
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
