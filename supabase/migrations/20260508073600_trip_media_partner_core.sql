create schema if not exists trip_private;

create table if not exists public.media_partners (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  legal_name text,
  registration_number text,
  billing_country text not null default 'ZA',
  billing_currency text not null default 'ZAR',
  billing_provider text,
  status text not null default 'active',
  trial_ends_at timestamptz,
  promotional_credits_balance integer not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint media_partners_billing_provider_check check (billing_provider is null or billing_provider in ('payfast', 'paystack')),
  constraint media_partners_status_check check (status in ('active', 'suspended', 'closed'))
);

create table if not exists public.partner_members (
  id uuid primary key default gen_random_uuid (),
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer',
  invited_at timestamptz not null default now (),
  joined_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint partner_members_role_check check (role in ('owner', 'admin', 'operator', 'viewer')),
  constraint partner_members_user_or_email_check check (user_id is not null or email is not null),
  constraint partner_members_partner_user_unique unique (partner_id, user_id),
  constraint partner_members_partner_email_unique unique (partner_id, email)
);

create table if not exists public.ad_packages (
  id uuid primary key default gen_random_uuid (),
  slug text not null unique,
  name text not null,
  description text not null,
  monthly_price_cents integer not null default 0,
  currency text not null default 'ZAR',
  impression_cap_monthly integer,
  max_concurrent_campaigns integer not null default 1,
  payfast_plan_id text,
  paystack_plan_id text,
  trial_days_default integer not null default 14,
  welcome_credits_default integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create table if not exists public.partner_subscriptions (
  id uuid primary key default gen_random_uuid (),
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  package_id uuid references public.ad_packages (id) on delete set null,
  provider text not null default 'payfast',
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint partner_subscriptions_provider_check check (provider in ('payfast', 'paystack')),
  constraint partner_subscriptions_status_check check (status in ('trialing', 'active', 'past_due', 'canceled', 'paused'))
);

create table if not exists public.partner_billing_events (
  id uuid primary key default gen_random_uuid (),
  provider text not null,
  event_id text not null,
  type text not null,
  partner_id uuid references public.media_partners (id) on delete set null,
  payload_json jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now (),
  created_at timestamptz not null default now (),
  constraint partner_billing_events_provider_check check (provider in ('payfast', 'paystack')),
  constraint partner_billing_events_unique unique (provider, event_id)
);

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid (),
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  storage_path text,
  mime_type text,
  duration_seconds integer,
  title text not null,
  cta_url text,
  status text not null default 'draft',
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint ad_creatives_status_check check (status in ('draft', 'pending_review', 'approved', 'rejected')),
  constraint ad_creatives_url_check check (cta_url is null or cta_url ~* '^https?://')
);

alter table public.ad_campaigns
  add column if not exists partner_id uuid references public.media_partners (id) on delete set null,
  add column if not exists creative_id uuid references public.ad_creatives (id) on delete set null,
  add column if not exists subscription_id uuid references public.partner_subscriptions (id) on delete set null,
  add column if not exists impression_cap integer,
  add column if not exists schedule_band text not null default 'all';

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_schedule_band_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_schedule_band_check check (schedule_band in ('peak', 'off_peak', 'all_day', 'night', 'all'));

create index if not exists media_partners_status_idx on public.media_partners (status);
create index if not exists partner_members_user_idx on public.partner_members (user_id);
create index if not exists partner_members_partner_idx on public.partner_members (partner_id);
create index if not exists partner_subscriptions_partner_idx on public.partner_subscriptions (partner_id, status);
create index if not exists partner_billing_events_partner_idx on public.partner_billing_events (partner_id, processed_at desc);
create index if not exists ad_creatives_partner_status_idx on public.ad_creatives (partner_id, status);
create index if not exists ad_campaigns_partner_idx on public.ad_campaigns (partner_id, status);

insert into public.ad_packages (
  slug,
  name,
  description,
  monthly_price_cents,
  impression_cap_monthly,
  max_concurrent_campaigns,
  trial_days_default,
  welcome_credits_default
)
values
  ('starter', 'Starter', 'Test Taxi Assist Media with a focused campaign and clear limits.', 149900, 10000, 1, 14, 1000),
  ('growth', 'Growth', 'Run more campaigns with a higher monthly impression cap.', 399900, 50000, 3, 14, 2500),
  ('network', 'Network', 'Plan broader in-trip media coverage with custom operations support.', 999900, null, 8, 14, 5000)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  impression_cap_monthly = excluded.impression_cap_monthly,
  max_concurrent_campaigns = excluded.max_concurrent_campaigns,
  trial_days_default = excluded.trial_days_default,
  welcome_credits_default = excluded.welcome_credits_default,
  updated_at = now ();
