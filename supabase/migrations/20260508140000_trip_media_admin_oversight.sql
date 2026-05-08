-- Trip Media admin oversight tables, RPCs, views, and storage policies.
-- Adds fraud_analyst role, extends ad_creatives + ad_campaigns lifecycles,
-- and adds the persistence layer needed for the admin Trip Media console.

-- ---------------------------------------------------------------------------
-- 1. admin_profiles: add fraud_analyst role
-- ---------------------------------------------------------------------------
alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_role_check check (
    role in ('superadmin', 'compliance', 'operations', 'finance', 'ad_manager', 'support', 'fraud_analyst')
  );

-- ---------------------------------------------------------------------------
-- 2. ad_creatives: extend lifecycle for moderation
-- ---------------------------------------------------------------------------
alter table public.ad_creatives
  drop constraint if exists ad_creatives_status_check;

alter table public.ad_creatives
  add constraint ad_creatives_status_check check (
    status in (
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'changes_requested',
      'suspended',
      'flagged'
    )
  );

alter table public.ad_creatives
  add column if not exists category text,
  add column if not exists policy_decision jsonb not null default '{}'::jsonb,
  add column if not exists last_action_at timestamptz,
  add column if not exists last_action_by uuid references auth.users (id) on delete set null,
  add column if not exists flagged_at timestamptz,
  add column if not exists suspended_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. ad_campaigns: extend lifecycle for force-stop
-- ---------------------------------------------------------------------------
alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_status_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_status_check check (
    status in ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ENDED', 'REJECTED', 'FORCE_STOPPED')
  );

alter table public.ad_campaigns
  add column if not exists force_stop_reason text,
  add column if not exists force_stopped_by uuid references auth.users (id) on delete set null,
  add column if not exists force_stopped_at timestamptz,
  add column if not exists last_admin_action_at timestamptz,
  add column if not exists last_admin_action_by uuid references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. creative_categories
-- ---------------------------------------------------------------------------
create table if not exists public.creative_categories (
  slug text primary key,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

alter table public.creative_categories enable row level security;

drop policy if exists "creative_categories_select_authenticated" on public.creative_categories;
create policy "creative_categories_select_authenticated"
  on public.creative_categories
  for select
  to authenticated
  using (is_active or public.is_admin ());

drop policy if exists "creative_categories_write_admin" on public.creative_categories;
create policy "creative_categories_write_admin"
  on public.creative_categories
  for all
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

insert into public.creative_categories (slug, label, sort_order) values
  ('retail', 'Retail', 10),
  ('telco', 'Telecoms', 20),
  ('fintech', 'Financial services', 30),
  ('qsr', 'Quick service / restaurants', 40),
  ('fmcg', 'FMCG', 50),
  ('automotive', 'Automotive', 60),
  ('events', 'Events', 70),
  ('public_sector', 'Public sector', 80),
  ('other', 'Other', 999)
on conflict (slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  updated_at = now ();

-- ---------------------------------------------------------------------------
-- 5. ad_fraud_signals
-- ---------------------------------------------------------------------------
create table if not exists public.ad_fraud_signals (
  id uuid primary key default gen_random_uuid (),
  rider_id uuid references public.profiles (id) on delete set null,
  trip_id uuid references public.trips (trip_id) on delete set null,
  ad_view_id uuid references public.ad_views (ad_view_id) on delete set null,
  campaign_id uuid references public.ad_campaigns (campaign_id) on delete set null,
  partner_id uuid references public.media_partners (id) on delete set null,
  kind text not null,
  level text not null default 'low',
  status text not null default 'open',
  summary text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  owner_admin_id uuid references auth.users (id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint ad_fraud_signals_level_check check (level in ('low', 'medium', 'high', 'critical')),
  constraint ad_fraud_signals_status_check check (status in ('open', 'investigating', 'resolved', 'dismissed', 'escalated'))
);

create index if not exists ad_fraud_signals_status_level_idx on public.ad_fraud_signals (status, level, created_at desc);
create index if not exists ad_fraud_signals_rider_idx on public.ad_fraud_signals (rider_id, created_at desc);
create index if not exists ad_fraud_signals_partner_idx on public.ad_fraud_signals (partner_id, created_at desc);

alter table public.ad_fraud_signals enable row level security;

drop policy if exists "ad_fraud_signals_select_admin" on public.ad_fraud_signals;
create policy "ad_fraud_signals_select_admin"
  on public.ad_fraud_signals
  for select
  to authenticated
  using (public.is_admin ());

-- Writes are mediated through RPCs only; no general INSERT/UPDATE policy.

-- ---------------------------------------------------------------------------
-- 6. ad_reward_holds (audit trail for freezes and reversals)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_reward_holds (
  id uuid primary key default gen_random_uuid (),
  ad_view_id uuid references public.ad_views (ad_view_id) on delete set null,
  rider_id uuid references public.profiles (id) on delete set null,
  campaign_id uuid references public.ad_campaigns (campaign_id) on delete set null,
  amount_cents integer not null default 0,
  status text not null default 'held',
  reason text not null,
  fraud_signal_id uuid references public.ad_fraud_signals (id) on delete set null,
  reverse_tx_id uuid references public.wallet_transactions (tx_id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  released_at timestamptz,
  reversed_at timestamptz,
  constraint ad_reward_holds_status_check check (status in ('held', 'released', 'reversed'))
);

create index if not exists ad_reward_holds_rider_idx on public.ad_reward_holds (rider_id, created_at desc);
create index if not exists ad_reward_holds_status_idx on public.ad_reward_holds (status, created_at desc);

alter table public.ad_reward_holds enable row level security;

drop policy if exists "ad_reward_holds_select_admin" on public.ad_reward_holds;
create policy "ad_reward_holds_select_admin"
  on public.ad_reward_holds
  for select
  to authenticated
  using (public.is_admin ());

-- ---------------------------------------------------------------------------
-- 7. trip_media_settings (key/value config persisted by admins)
-- ---------------------------------------------------------------------------
create table if not exists public.trip_media_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now ()
);

alter table public.trip_media_settings enable row level security;

drop policy if exists "trip_media_settings_select_admin" on public.trip_media_settings;
create policy "trip_media_settings_select_admin"
  on public.trip_media_settings
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "trip_media_settings_write_superadmin" on public.trip_media_settings;
create policy "trip_media_settings_write_superadmin"
  on public.trip_media_settings
  for all
  to authenticated
  using (public.admin_role () in ('superadmin', 'ad_manager'))
  with check (public.admin_role () in ('superadmin', 'ad_manager'));

insert into public.trip_media_settings (key, value) values
  (
    'reward_caps',
    jsonb_build_object(
      'per_trip_max_reward_cents', 500,
      'per_day_max_reward_cents', 2500,
      'default_reward_per_view_cents', 50
    )
  ),
  (
    'rejection_reasons',
    jsonb_build_array(
      jsonb_build_object('slug', 'misleading_content', 'label', 'Misleading content', 'description', 'Promises or claims that are not supported by the product itself.'),
      jsonb_build_object('slug', 'poor_quality', 'label', 'Poor quality', 'description', 'Audio, video, or text quality is too low for rider playback.'),
      jsonb_build_object('slug', 'offensive_material', 'label', 'Offensive material', 'description', 'Content is hateful, explicit, or otherwise inappropriate for riders.'),
      jsonb_build_object('slug', 'copyright_violation', 'label', 'Copyright violation', 'description', 'Uses third-party material without a clear licence.'),
      jsonb_build_object('slug', 'unsupported_claims', 'label', 'Unsupported claims', 'description', 'Mentions performance, savings, or outcomes that are not verifiable.')
    )
  ),
  (
    'risk_thresholds',
    jsonb_build_object(
      'rapid_completion_per_hour', 8,
      'unique_devices_per_account', 3,
      'emulator_score_high', 0.7,
      'shared_ip_per_hour', 5
    )
  ),
  (
    'watch_rules',
    jsonb_build_object(
      'min_watch_ratio', 0.95,
      'min_rating', 1,
      'min_comment_length', 0
    )
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. admin_report_runs (audit + persistence for downloaded reports)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_report_runs (
  id uuid primary key default gen_random_uuid (),
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  row_count integer,
  error_message text,
  started_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now (),
  finished_at timestamptz,
  constraint admin_report_runs_status_check check (status in ('running', 'completed', 'failed'))
);

create index if not exists admin_report_runs_kind_started_idx
  on public.admin_report_runs (kind, started_at desc);

alter table public.admin_report_runs enable row level security;

drop policy if exists "admin_report_runs_select_admin" on public.admin_report_runs;
create policy "admin_report_runs_select_admin"
  on public.admin_report_runs
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "admin_report_runs_insert_admin" on public.admin_report_runs;
create policy "admin_report_runs_insert_admin"
  on public.admin_report_runs
  for insert
  to authenticated
  with check (public.is_admin () and started_by = auth.uid ());

-- ---------------------------------------------------------------------------
-- 9. Storage: admin can read partner-ad-creatives objects (signed URL flow)
-- ---------------------------------------------------------------------------
drop policy if exists "partner_creatives_select_admin" on storage.objects;
create policy "partner_creatives_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-ad-creatives'
    and public.is_admin ()
  );

-- ---------------------------------------------------------------------------
-- 10. RPCs - creative moderation
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_creative_status (
  p_creative_id uuid,
  p_status text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creative public.ad_creatives%rowtype;
  v_now timestamptz := now ();
  v_audit_action text;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_status not in ('approved', 'rejected', 'changes_requested', 'suspended', 'flagged', 'pending_review') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if p_status in ('rejected', 'changes_requested', 'suspended', 'flagged') and nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_creative from public.ad_creatives where id = p_creative_id for update;
  if v_creative.id is null then
    return jsonb_build_object('ok', false, 'error', 'creative_not_found');
  end if;

  update public.ad_creatives
  set
    status = p_status,
    review_note = case when p_reason is null then review_note else nullif(trim(p_reason), '') end,
    reviewed_by = auth.uid (),
    reviewed_at = v_now,
    last_action_at = v_now,
    last_action_by = auth.uid (),
    flagged_at = case when p_status = 'flagged' then v_now else flagged_at end,
    suspended_at = case when p_status = 'suspended' then v_now else suspended_at end,
    policy_decision = coalesce(p_metadata, '{}'::jsonb),
    updated_at = v_now
  where id = p_creative_id;

  v_audit_action := 'creative.' || p_status;
  perform public.admin_audit_log(
    v_audit_action,
    'ad_creatives',
    p_creative_id,
    p_reason,
    jsonb_build_object(
      'partner_id', v_creative.partner_id,
      'previous_status', v_creative.status,
      'new_status', p_status,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  );

  -- Notify partner workspace.
  insert into public.partner_notifications (partner_id, kind, title, body, link)
  values (
    v_creative.partner_id,
    case
      when p_status = 'approved' then 'success'
      when p_status in ('rejected', 'suspended', 'changes_requested', 'flagged') then 'warning'
      else 'info'
    end,
    case
      when p_status = 'approved' then 'Creative approved'
      when p_status = 'rejected' then 'Creative rejected'
      when p_status = 'changes_requested' then 'Changes requested on a creative'
      when p_status = 'suspended' then 'Creative suspended'
      when p_status = 'flagged' then 'Creative flagged for review'
      else 'Creative status updated'
    end,
    coalesce(nullif(trim(p_reason), ''), 'Open the creative to see details.'),
    '/dashboard/creatives'
  );

  return jsonb_build_object('ok', true, 'creative_id', p_creative_id, 'status', p_status);
end;
$$;

revoke all on function public.admin_set_creative_status (uuid, text, text, jsonb) from public;
grant execute on function public.admin_set_creative_status (uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPCs - campaign oversight
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
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_status not in ('PAUSED', 'ACTIVE', 'FORCE_STOPPED') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if p_status = 'FORCE_STOPPED' and nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  update public.ad_campaigns
  set
    status = p_status,
    last_admin_action_at = v_now,
    last_admin_action_by = auth.uid (),
    force_stop_reason = case when p_status = 'FORCE_STOPPED' then nullif(trim(p_reason), '') else force_stop_reason end,
    force_stopped_at = case when p_status = 'FORCE_STOPPED' then v_now else force_stopped_at end,
    force_stopped_by = case when p_status = 'FORCE_STOPPED' then auth.uid () else force_stopped_by end,
    updated_at = v_now
  where campaign_id = p_campaign_id;

  perform public.admin_audit_log(
    'campaign.' || lower(p_status),
    'ad_campaigns',
    p_campaign_id,
    p_reason,
    jsonb_build_object(
      'partner_id', v_campaign.partner_id,
      'previous_status', v_campaign.status,
      'new_status', p_status
    )
  );

  if v_campaign.partner_id is not null then
    insert into public.partner_notifications (partner_id, kind, title, body, link)
    values (
      v_campaign.partner_id,
      case when p_status = 'ACTIVE' then 'success' else 'warning' end,
      case
        when p_status = 'PAUSED' then 'Campaign paused by Trip'
        when p_status = 'ACTIVE' then 'Campaign resumed'
        when p_status = 'FORCE_STOPPED' then 'Campaign force-stopped by Trip'
        else 'Campaign status updated'
      end,
      coalesce(nullif(trim(p_reason), ''), 'Open the campaign to see details.'),
      '/dashboard/campaigns'
    );
  end if;

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id, 'status', p_status);
end;
$$;

revoke all on function public.admin_set_campaign_status (uuid, text, text) from public;
grant execute on function public.admin_set_campaign_status (uuid, text, text) to authenticated;

create or replace function public.admin_adjust_campaign_delivery (
  p_campaign_id uuid,
  p_max_views integer,
  p_reward_per_view numeric,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = p_campaign_id for update;
  if v_campaign.campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  update public.ad_campaigns
  set
    max_views = coalesce(p_max_views, max_views),
    reward_per_view = coalesce(p_reward_per_view, reward_per_view),
    last_admin_action_at = v_now,
    last_admin_action_by = auth.uid (),
    updated_at = v_now
  where campaign_id = p_campaign_id;

  perform public.admin_audit_log(
    'campaign.adjust_delivery',
    'ad_campaigns',
    p_campaign_id,
    p_reason,
    jsonb_build_object(
      'partner_id', v_campaign.partner_id,
      'previous_max_views', v_campaign.max_views,
      'new_max_views', coalesce(p_max_views, v_campaign.max_views),
      'previous_reward_per_view', v_campaign.reward_per_view,
      'new_reward_per_view', coalesce(p_reward_per_view, v_campaign.reward_per_view)
    )
  );

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id);
end;
$$;

revoke all on function public.admin_adjust_campaign_delivery (uuid, integer, numeric, text) from public;
grant execute on function public.admin_adjust_campaign_delivery (uuid, integer, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. RPCs - rider rewards (freeze + reverse)
-- ---------------------------------------------------------------------------
create or replace function public.admin_freeze_reward (
  p_ad_view_id uuid,
  p_reason text,
  p_fraud_signal_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_view public.ad_views%rowtype;
  v_campaign public.ad_campaigns%rowtype;
  v_amount_cents integer;
  v_hold_id uuid;
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_view from public.ad_views where ad_view_id = p_ad_view_id for update;
  if v_view.ad_view_id is null then
    return jsonb_build_object('ok', false, 'error', 'ad_view_not_found');
  end if;

  if v_view.state = 'CREDITED' then
    return jsonb_build_object('ok', false, 'error', 'already_credited_use_reverse');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = v_view.campaign_id;
  v_amount_cents := coalesce(round(v_campaign.reward_per_view * 100), 0);

  update public.ad_views
  set state = 'REJECTED'
  where ad_view_id = p_ad_view_id;

  insert into public.ad_reward_holds (
    ad_view_id,
    rider_id,
    campaign_id,
    amount_cents,
    status,
    reason,
    fraud_signal_id,
    created_by,
    released_at
  ) values (
    p_ad_view_id,
    v_view.rider_id,
    v_view.campaign_id,
    v_amount_cents,
    'held',
    p_reason,
    p_fraud_signal_id,
    auth.uid (),
    null
  )
  returning id into v_hold_id;

  perform public.admin_audit_log(
    'reward.freeze',
    'ad_views',
    p_ad_view_id,
    p_reason,
    jsonb_build_object(
      'rider_id', v_view.rider_id,
      'campaign_id', v_view.campaign_id,
      'amount_cents', v_amount_cents,
      'hold_id', v_hold_id,
      'fraud_signal_id', p_fraud_signal_id
    )
  );

  return jsonb_build_object('ok', true, 'hold_id', v_hold_id, 'amount_cents', v_amount_cents);
end;
$$;

revoke all on function public.admin_freeze_reward (uuid, text, uuid) from public;
grant execute on function public.admin_freeze_reward (uuid, text, uuid) to authenticated;

create or replace function public.admin_reverse_reward (
  p_ad_view_id uuid,
  p_reason text,
  p_fraud_signal_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_view public.ad_views%rowtype;
  v_campaign public.ad_campaigns%rowtype;
  v_amount_dollars numeric(12, 2);
  v_amount_cents integer;
  v_wallet public.wallets%rowtype;
  v_hold_id uuid;
  v_tx_id uuid;
  v_new_balance numeric(12, 2);
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_view from public.ad_views where ad_view_id = p_ad_view_id for update;
  if v_view.ad_view_id is null then
    return jsonb_build_object('ok', false, 'error', 'ad_view_not_found');
  end if;

  if v_view.rider_id is null then
    return jsonb_build_object('ok', false, 'error', 'rider_not_set');
  end if;

  select * into v_campaign from public.ad_campaigns where campaign_id = v_view.campaign_id;
  v_amount_dollars := coalesce(v_campaign.reward_per_view, 0);
  v_amount_cents := coalesce(round(v_amount_dollars * 100), 0);

  if v_amount_dollars > 0 then
    select * into v_wallet
    from public.wallets
    where profile_id = v_view.rider_id and wallet_type = 'RIDER'
    for update;

    if v_wallet.wallet_id is null then
      return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
    end if;

    v_new_balance := v_wallet.balance - v_amount_dollars;
    if v_new_balance < 0 then
      v_new_balance := 0;
    end if;

    insert into public.wallet_transactions (
      wallet_id, direction, amount, type, reference, metadata, created_by
    ) values (
      v_wallet.wallet_id,
      'DEBIT',
      v_amount_dollars,
      'AD_REWARD_REVERSAL',
      p_ad_view_id::text,
      jsonb_build_object(
        'ad_view_id', p_ad_view_id,
        'campaign_id', v_view.campaign_id,
        'reason', p_reason
      ),
      auth.uid ()
    )
    returning tx_id into v_tx_id;

    update public.wallets
    set balance = v_new_balance, updated_at = v_now
    where wallet_id = v_wallet.wallet_id;
  end if;

  update public.ad_views
  set state = 'REJECTED'
  where ad_view_id = p_ad_view_id;

  insert into public.ad_reward_holds (
    ad_view_id,
    rider_id,
    campaign_id,
    amount_cents,
    status,
    reason,
    fraud_signal_id,
    reverse_tx_id,
    created_by,
    reversed_at
  ) values (
    p_ad_view_id,
    v_view.rider_id,
    v_view.campaign_id,
    v_amount_cents,
    'reversed',
    p_reason,
    p_fraud_signal_id,
    v_tx_id,
    auth.uid (),
    v_now
  )
  returning id into v_hold_id;

  perform public.admin_audit_log(
    'reward.reverse',
    'ad_views',
    p_ad_view_id,
    p_reason,
    jsonb_build_object(
      'rider_id', v_view.rider_id,
      'campaign_id', v_view.campaign_id,
      'amount_cents', v_amount_cents,
      'hold_id', v_hold_id,
      'tx_id', v_tx_id,
      'fraud_signal_id', p_fraud_signal_id
    )
  );

  return jsonb_build_object('ok', true, 'hold_id', v_hold_id, 'tx_id', v_tx_id, 'amount_cents', v_amount_cents);
end;
$$;

revoke all on function public.admin_reverse_reward (uuid, text, uuid) from public;
grant execute on function public.admin_reverse_reward (uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 13. RPCs - fraud triage
-- ---------------------------------------------------------------------------
create or replace function public.admin_log_fraud_signal (
  p_kind text,
  p_level text,
  p_summary text,
  p_evidence jsonb default '{}'::jsonb,
  p_rider_id uuid default null,
  p_trip_id uuid default null,
  p_ad_view_id uuid default null,
  p_campaign_id uuid default null,
  p_partner_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal_id uuid;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_level not in ('low', 'medium', 'high', 'critical') then
    return jsonb_build_object('ok', false, 'error', 'invalid_level');
  end if;
  if nullif(trim(p_kind), '') is null then
    return jsonb_build_object('ok', false, 'error', 'kind_required');
  end if;

  insert into public.ad_fraud_signals (
    rider_id, trip_id, ad_view_id, campaign_id, partner_id,
    kind, level, status, summary, evidence, owner_admin_id
  ) values (
    p_rider_id, p_trip_id, p_ad_view_id, p_campaign_id, p_partner_id,
    p_kind, p_level, 'open', coalesce(p_summary, ''), coalesce(p_evidence, '{}'::jsonb), auth.uid ()
  )
  returning id into v_signal_id;

  perform public.admin_audit_log(
    'fraud.log',
    'ad_fraud_signals',
    v_signal_id,
    p_summary,
    jsonb_build_object('kind', p_kind, 'level', p_level, 'rider_id', p_rider_id)
  );

  return jsonb_build_object('ok', true, 'signal_id', v_signal_id);
end;
$$;

revoke all on function public.admin_log_fraud_signal (text, text, text, jsonb, uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.admin_log_fraud_signal (text, text, text, jsonb, uuid, uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.admin_set_fraud_signal_status (
  p_signal_id uuid,
  p_status text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal public.ad_fraud_signals%rowtype;
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_status not in ('open', 'investigating', 'resolved', 'dismissed', 'escalated') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  if p_status in ('resolved', 'dismissed', 'escalated') and nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_signal from public.ad_fraud_signals where id = p_signal_id for update;
  if v_signal.id is null then
    return jsonb_build_object('ok', false, 'error', 'signal_not_found');
  end if;

  update public.ad_fraud_signals
  set
    status = p_status,
    resolution_note = case when p_reason is null then resolution_note else nullif(trim(p_reason), '') end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then v_now else resolved_at end,
    owner_admin_id = case when p_status = 'investigating' then coalesce(owner_admin_id, auth.uid ()) else owner_admin_id end,
    updated_at = v_now
  where id = p_signal_id;

  perform public.admin_audit_log(
    'fraud.' || p_status,
    'ad_fraud_signals',
    p_signal_id,
    p_reason,
    jsonb_build_object(
      'previous_status', v_signal.status,
      'new_status', p_status
    )
  );

  return jsonb_build_object('ok', true, 'signal_id', p_signal_id, 'status', p_status);
end;
$$;

revoke all on function public.admin_set_fraud_signal_status (uuid, text, text) from public;
grant execute on function public.admin_set_fraud_signal_status (uuid, text, text) to authenticated;

create or replace function public.admin_set_fraud_signal_level (
  p_signal_id uuid,
  p_level text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal public.ad_fraud_signals%rowtype;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_level not in ('low', 'medium', 'high', 'critical') then
    return jsonb_build_object('ok', false, 'error', 'invalid_level');
  end if;

  select * into v_signal from public.ad_fraud_signals where id = p_signal_id for update;
  if v_signal.id is null then
    return jsonb_build_object('ok', false, 'error', 'signal_not_found');
  end if;

  update public.ad_fraud_signals
  set
    level = p_level,
    updated_at = now ()
  where id = p_signal_id;

  perform public.admin_audit_log(
    'fraud.set_level',
    'ad_fraud_signals',
    p_signal_id,
    p_reason,
    jsonb_build_object(
      'previous_level', v_signal.level,
      'new_level', p_level
    )
  );

  return jsonb_build_object('ok', true, 'signal_id', p_signal_id, 'level', p_level);
end;
$$;

revoke all on function public.admin_set_fraud_signal_level (uuid, text, text) from public;
grant execute on function public.admin_set_fraud_signal_level (uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 14. RPCs - advertiser controls
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_partner_status (
  p_partner_id uuid,
  p_status text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.media_partners%rowtype;
  v_now timestamptz := now ();
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_status not in ('active', 'suspended', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_partner from public.media_partners where id = p_partner_id for update;
  if v_partner.id is null then
    return jsonb_build_object('ok', false, 'error', 'partner_not_found');
  end if;

  update public.media_partners
  set
    status = p_status,
    updated_at = v_now
  where id = p_partner_id;

  if p_status = 'suspended' then
    update public.ad_campaigns
    set
      status = 'PAUSED',
      last_admin_action_at = v_now,
      last_admin_action_by = auth.uid (),
      updated_at = v_now
    where partner_id = p_partner_id and status in ('ACTIVE', 'PENDING_REVIEW');
  end if;

  perform public.admin_audit_log(
    'partner.' || p_status,
    'media_partners',
    p_partner_id,
    p_reason,
    jsonb_build_object('previous_status', v_partner.status, 'new_status', p_status)
  );

  insert into public.partner_notifications (partner_id, kind, title, body, link)
  values (
    p_partner_id,
    case when p_status = 'active' then 'success' else 'warning' end,
    case
      when p_status = 'suspended' then 'Account suspended by Trip'
      when p_status = 'closed' then 'Account closed by Trip'
      when p_status = 'active' then 'Account restored'
      else 'Account status updated'
    end,
    p_reason,
    '/dashboard'
  );

  return jsonb_build_object('ok', true, 'partner_id', p_partner_id, 'status', p_status);
end;
$$;

revoke all on function public.admin_set_partner_status (uuid, text, text) from public;
grant execute on function public.admin_set_partner_status (uuid, text, text) to authenticated;

create or replace function public.admin_adjust_partner_credits (
  p_partner_id uuid,
  p_delta integer,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.media_partners%rowtype;
  v_new_balance integer;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_delta is null or p_delta = 0 then
    return jsonb_build_object('ok', false, 'error', 'delta_required');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select * into v_partner from public.media_partners where id = p_partner_id for update;
  if v_partner.id is null then
    return jsonb_build_object('ok', false, 'error', 'partner_not_found');
  end if;

  v_new_balance := coalesce(v_partner.promotional_credits_balance, 0) + p_delta;
  if v_new_balance < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  update public.media_partners
  set
    promotional_credits_balance = v_new_balance,
    updated_at = now ()
  where id = p_partner_id;

  perform public.admin_audit_log(
    'partner.adjust_credits',
    'media_partners',
    p_partner_id,
    p_reason,
    jsonb_build_object(
      'delta', p_delta,
      'previous_balance', v_partner.promotional_credits_balance,
      'new_balance', v_new_balance
    )
  );

  insert into public.partner_notifications (partner_id, kind, title, body, link)
  values (
    p_partner_id,
    case when p_delta > 0 then 'success' else 'info' end,
    case when p_delta > 0 then 'Promotional credits added' else 'Promotional credits adjusted' end,
    p_reason,
    '/dashboard/billing'
  );

  return jsonb_build_object('ok', true, 'partner_id', p_partner_id, 'new_balance', v_new_balance);
end;
$$;

revoke all on function public.admin_adjust_partner_credits (uuid, integer, text) from public;
grant execute on function public.admin_adjust_partner_credits (uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 15. RPCs - settings + reports
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_trip_media_setting (
  p_key text,
  p_value jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.admin_role () not in ('superadmin', 'ad_manager') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if nullif(trim(p_key), '') is null then
    return jsonb_build_object('ok', false, 'error', 'key_required');
  end if;
  if p_value is null then
    return jsonb_build_object('ok', false, 'error', 'value_required');
  end if;

  insert into public.trip_media_settings (key, value, updated_by, updated_at)
  values (p_key, p_value, auth.uid (), now ())
  on conflict (key) do update set
    value = excluded.value,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  perform public.admin_audit_log(
    'settings.update',
    'trip_media_settings',
    null,
    p_key,
    jsonb_build_object('key', p_key, 'value', p_value)
  );

  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;

revoke all on function public.admin_set_trip_media_setting (text, jsonb) from public;
grant execute on function public.admin_set_trip_media_setting (text, jsonb) to authenticated;

create or replace function public.admin_record_report_run (
  p_kind text,
  p_params jsonb,
  p_row_count integer,
  p_status text,
  p_error_message text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_status not in ('running', 'completed', 'failed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  insert into public.admin_report_runs (
    kind, params, status, row_count, error_message, started_by, started_at, finished_at
  ) values (
    p_kind,
    coalesce(p_params, '{}'::jsonb),
    p_status,
    p_row_count,
    p_error_message,
    auth.uid (),
    now (),
    case when p_status in ('completed', 'failed') then now () else null end
  )
  returning id into v_run_id;

  perform public.admin_audit_log(
    'report.' || p_kind,
    'admin_report_runs',
    v_run_id,
    null,
    jsonb_build_object('kind', p_kind, 'row_count', p_row_count, 'status', p_status)
  );

  return jsonb_build_object('ok', true, 'run_id', v_run_id);
end;
$$;

revoke all on function public.admin_record_report_run (text, jsonb, integer, text, text) from public;
grant execute on function public.admin_record_report_run (text, jsonb, integer, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 16. Views - vw_trip_media_overview, vw_fraud_candidates
-- ---------------------------------------------------------------------------
create or replace view public.vw_trip_media_overview
with (security_invoker = true)
as
select
  (select count(*) from public.ad_creatives where status = 'pending_review') as pending_creatives_count,
  (select count(*) from public.ad_creatives where status = 'flagged') as flagged_creatives_count,
  (select count(*) from public.ad_campaigns where status = 'ACTIVE') as active_campaigns_count,
  (select count(*) from public.ad_campaigns where status = 'PENDING_REVIEW') as pending_campaigns_count,
  (select count(*) from public.media_partners where status = 'active') as active_partners_count,
  (select count(*) from public.ad_views where created_at >= now () - interval '24 hours') as views_last_24h,
  (
    select coalesce(
      round(
        100.0 * count(*) filter (where state = 'CREDITED')
          / nullif(count(*), 0)
      ),
      0
    )
    from public.ad_views where created_at >= now () - interval '24 hours'
  ) as completion_rate_last_24h_pct,
  (
    select coalesce(sum(c.reward_per_view), 0)
    from public.ad_views v
    join public.ad_campaigns c on c.campaign_id = v.campaign_id
    where v.state = 'CREDITED'
      and v.created_at >= now () - interval '24 hours'
  ) as reward_spend_last_24h,
  (select count(*) from public.ad_fraud_signals where status in ('open', 'investigating')) as open_fraud_signals_count,
  (select count(*) from public.ad_fraud_signals where status in ('open', 'investigating') and level in ('high', 'critical')) as high_priority_fraud_count;

grant select on public.vw_trip_media_overview to authenticated;

create or replace view public.vw_fraud_candidates
with (security_invoker = true)
as
select
  v.rider_id,
  count(*) filter (where v.created_at >= now () - interval '1 hour') as views_last_hour,
  count(*) filter (where v.state = 'REJECTED' and v.created_at >= now () - interval '24 hours') as rejected_last_24h,
  count(*) filter (where v.state = 'CREDITED' and v.created_at >= now () - interval '24 hours') as credited_last_24h,
  max(v.created_at) as last_view_at
from public.ad_views v
where v.rider_id is not null
group by v.rider_id
having count(*) filter (where v.created_at >= now () - interval '1 hour') >= 8
   or count(*) filter (where v.state = 'REJECTED' and v.created_at >= now () - interval '24 hours') >= 3;

grant select on public.vw_fraud_candidates to authenticated;
