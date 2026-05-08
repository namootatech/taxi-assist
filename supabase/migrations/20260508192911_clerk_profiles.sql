-- Base identity profile synced from Clerk webhooks.
-- Uses Clerk user id (`auth.jwt() ->> 'sub'`) as the ownership key.
--
-- IMPORTANT: This does NOT replace the existing `public.profiles` uuid-keyed
-- driver domain table. It is a separate cross-app identity table.

create table if not exists public.clerk_profiles (
  clerk_user_id text primary key,
  email text,
  email_verified boolean,
  cellphone text,
  phone_verified boolean,
  firstname text,
  lastname text,
  name text,
  full_name text,
  image_url text,
  username text,
  public_metadata jsonb not null default '{}'::jsonb,
  unsafe_metadata jsonb not null default '{}'::jsonb,
  user_type text,
  app_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clerk_profiles_email_idx on public.clerk_profiles (email);
create index if not exists clerk_profiles_user_type_idx on public.clerk_profiles (user_type);
create index if not exists clerk_profiles_app_source_idx on public.clerk_profiles (app_source);

alter table public.clerk_profiles enable row level security;

drop policy if exists "clerk_profiles_select_own" on public.clerk_profiles;
create policy "clerk_profiles_select_own"
  on public.clerk_profiles
  for select
  to authenticated
  using (clerk_user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "clerk_profiles_insert_own" on public.clerk_profiles;
create policy "clerk_profiles_insert_own"
  on public.clerk_profiles
  for insert
  to authenticated
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "clerk_profiles_update_own" on public.clerk_profiles;
create policy "clerk_profiles_update_own"
  on public.clerk_profiles
  for update
  to authenticated
  using (clerk_user_id = (auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

