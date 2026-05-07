-- Admin platform: wallets/ledger, ads, trip_events, document expiry automation,
-- and small schema extensions required by the admin console prompt.

-- ---------------------------------------------------------------------------
-- profiles: add discriminator for rider vs driver (unified profiles table)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists profile_type text not null default 'DRIVER';
do $$
begin
  alter table public.profiles
    add constraint profiles_profile_type_check
    check (profile_type in ('DRIVER', 'RIDER'));
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- wallets + wallet_transactions (append-only ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  wallet_id uuid primary key default gen_random_uuid (),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  wallet_type text not null,
  balance numeric(12, 2) not null default 0,
  currency text not null default 'ZAR',
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint wallets_wallet_type_check check (wallet_type in ('RIDER', 'DRIVER'))
);

create unique index if not exists wallets_profile_type_unique
  on public.wallets (profile_id, wallet_type);

create table if not exists public.wallet_transactions (
  tx_id uuid primary key default gen_random_uuid (),
  wallet_id uuid not null references public.wallets (wallet_id) on delete cascade,
  direction text not null,
  amount numeric(12, 2) not null,
  type text not null,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now (),
  constraint wallet_transactions_direction_check check (direction in ('CREDIT', 'DEBIT')),
  constraint wallet_transactions_amount_positive check (amount > 0)
);

create index if not exists wallet_transactions_wallet_created_idx
  on public.wallet_transactions (wallet_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

-- Admin read access
drop policy if exists "wallets_select_admin" on public.wallets;
create policy "wallets_select_admin"
  on public.wallets
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "wallet_transactions_select_admin" on public.wallet_transactions;
create policy "wallet_transactions_select_admin"
  on public.wallet_transactions
  for select
  to authenticated
  using (public.is_admin ());

-- Admin can insert transactions; wallet balance updated via RPC.
drop policy if exists "wallet_transactions_insert_admin" on public.wallet_transactions;
create policy "wallet_transactions_insert_admin"
  on public.wallet_transactions
  for insert
  to authenticated
  with check (public.is_admin () and created_by = auth.uid ());

-- No direct wallet updates (force through RPC)

create or replace function public.admin_wallet_adjust (
  p_profile_id uuid,
  p_wallet_type text,
  p_direction text,
  p_amount numeric,
  p_tx_type text,
  p_reason text,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_new_balance numeric(12, 2);
  v_tx_id uuid;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if public.is_admin () is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_wallet_type not in ('RIDER', 'DRIVER') then
    return jsonb_build_object('ok', false, 'error', 'Invalid wallet type');
  end if;
  if p_direction not in ('CREDIT', 'DEBIT') then
    return jsonb_build_object('ok', false, 'error', 'Invalid direction');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;
  if nullif(trim(p_reason), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Reason required');
  end if;

  select * into v_wallet
  from public.wallets
  where profile_id = p_profile_id and wallet_type = p_wallet_type
  for update;

  if v_wallet.wallet_id is null then
    insert into public.wallets (profile_id, wallet_type)
    values (p_profile_id, p_wallet_type)
    returning * into v_wallet;
  end if;

  if p_direction = 'CREDIT' then
    v_new_balance := v_wallet.balance + p_amount;
  else
    v_new_balance := v_wallet.balance - p_amount;
  end if;

  if v_new_balance < 0 then
    return jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  end if;

  insert into public.wallet_transactions (
    wallet_id, direction, amount, type, reference, metadata, created_by
  ) values (
    v_wallet.wallet_id, p_direction, p_amount, p_tx_type, p_reference, coalesce(p_metadata, '{}'::jsonb), auth.uid()
  )
  returning tx_id into v_tx_id;

  update public.wallets
  set balance = v_new_balance, updated_at = now()
  where wallet_id = v_wallet.wallet_id;

  perform public.admin_audit_log(
    'wallet.adjust',
    'wallets',
    v_wallet.wallet_id,
    p_reason,
    jsonb_build_object(
      'profile_id', p_profile_id,
      'wallet_type', p_wallet_type,
      'direction', p_direction,
      'amount', p_amount,
      'tx_type', p_tx_type,
      'tx_id', v_tx_id
    )
  );

  return jsonb_build_object('ok', true, 'wallet_id', v_wallet.wallet_id, 'tx_id', v_tx_id, 'balance', v_new_balance);
end;
$$;

revoke all on function public.admin_wallet_adjust (uuid, text, text, numeric, text, text, text, jsonb) from public;
grant execute on function public.admin_wallet_adjust (uuid, text, text, numeric, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Ads: campaigns + views
-- ---------------------------------------------------------------------------
create table if not exists public.ad_campaigns (
  campaign_id uuid primary key default gen_random_uuid (),
  advertiser text not null,
  video_path text not null,
  target_json jsonb not null default '{}'::jsonb,
  max_views integer,
  current_views integer not null default 0,
  reward_per_view numeric(12, 2) not null default 0,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint ad_campaigns_status_check check (status in ('ACTIVE', 'PAUSED', 'ENDED'))
);

create index if not exists ad_campaigns_status_idx on public.ad_campaigns (status);

create table if not exists public.ad_views (
  ad_view_id uuid primary key default gen_random_uuid (),
  campaign_id uuid not null references public.ad_campaigns (campaign_id) on delete cascade,
  trip_id uuid references public.trips (trip_id) on delete set null,
  rider_id uuid references public.profiles (id) on delete set null,
  state text not null default 'STARTED',
  rating smallint,
  comment text,
  watched_at timestamptz,
  created_at timestamptz not null default now (),
  constraint ad_views_state_check check (state in ('STARTED', 'WATCHED', 'RATED', 'CREDITED', 'REJECTED')),
  constraint ad_views_rating_check check (rating is null or (rating >= 1 and rating <= 5))
);

create index if not exists ad_views_campaign_created_idx on public.ad_views (campaign_id, created_at desc);
create index if not exists ad_views_rider_created_idx on public.ad_views (rider_id, created_at desc);

alter table public.ad_campaigns enable row level security;
alter table public.ad_views enable row level security;

drop policy if exists "ad_campaigns_select_admin" on public.ad_campaigns;
create policy "ad_campaigns_select_admin"
  on public.ad_campaigns
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "ad_campaigns_write_admin" on public.ad_campaigns;
create policy "ad_campaigns_write_admin"
  on public.ad_campaigns
  for all
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

drop policy if exists "ad_views_select_admin" on public.ad_views;
create policy "ad_views_select_admin"
  on public.ad_views
  for select
  to authenticated
  using (public.is_admin ());

-- ---------------------------------------------------------------------------
-- trip_events (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.trip_events (
  event_id bigserial primary key,
  trip_id uuid not null references public.trips (trip_id) on delete cascade,
  actor_user_id uuid references auth.users (id),
  actor_kind text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now (),
  constraint trip_events_actor_kind_check check (actor_kind in ('DRIVER', 'ADMIN', 'SYSTEM'))
);

create index if not exists trip_events_trip_created_idx
  on public.trip_events (trip_id, created_at desc);

alter table public.trip_events enable row level security;

drop policy if exists "trip_events_select_admin" on public.trip_events;
create policy "trip_events_select_admin"
  on public.trip_events
  for select
  to authenticated
  using (public.is_admin ());

drop policy if exists "trip_events_insert_admin" on public.trip_events;
create policy "trip_events_insert_admin"
  on public.trip_events
  for insert
  to authenticated
  with check (public.is_admin () and actor_user_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- Document expiry automation (best-effort)
-- - Trigger covers inserts/updates.
-- - Cron job (if pg_cron exists) covers drift.
-- ---------------------------------------------------------------------------
create or replace function public.apply_document_expiry ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.expiry_date is not null and new.expiry_date < (timezone('utc', now()))::date then
    if new.status = 'APPROVED' then
      new.status := 'EXPIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_apply_expiry on public.documents;
create trigger documents_apply_expiry
before insert or update on public.documents
for each row
execute function public.apply_document_expiry ();

create or replace function public.expire_approved_documents ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.documents
  set status = 'EXPIRED'
  where status = 'APPROVED'
    and expiry_date is not null
    and expiry_date < (timezone('utc', now()))::date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Try to schedule a daily sweep if pg_cron is available.
do $$
begin
  perform 1 from pg_extension where extname = 'pg_cron';
  if found then
    -- Daily at 01:05 UTC
    perform cron.schedule(
      'expire_approved_documents_daily',
      '5 1 * * *',
      $$select public.expire_approved_documents();$$
    );
  end if;
exception
  when undefined_function then null;
  when insufficient_privilege then null;
  when others then null;
end;
$$;

