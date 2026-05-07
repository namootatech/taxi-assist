-- Driver app: profiles shape aligned with DriverProfile (driver_app) + business-logic §2.1.
-- Safe to run on projects that already have a minimal `profiles` table (e.g. Supabase templates).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists driver_id uuid;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists residential_address text;
alter table public.profiles add column if not exists license_number text;
alter table public.profiles add column if not exists license_code text;
alter table public.profiles add column if not exists pdp_number text;
alter table public.profiles add column if not exists pdp_expiry date;
alter table public.profiles add column if not exists cellphone text;
alter table public.profiles add column if not exists bank_details jsonb;
alter table public.profiles add column if not exists selfie_url text;
alter table public.profiles add column if not exists status text not null default 'PENDING';
alter table public.profiles add column if not exists online_status text not null default 'OFFLINE';
alter table public.profiles add column if not exists current_vehicle_id uuid;
alter table public.profiles add column if not exists training_completed boolean not null default false;
alter table public.profiles add column if not exists registration_submitted boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists last_online_at timestamptz;

create unique index if not exists profiles_driver_id_unique
  on public.profiles (driver_id)
  where driver_id is not null;

comment on column public.profiles.registration_submitted is
  'After onboarding wizard submit; routing while status remains PENDING.';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
