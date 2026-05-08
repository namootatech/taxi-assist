-- Add profile + vehicle rejection reason fields for onboarding feedback.
-- Aligns with PRD: admin must be able to reject with clear reasons; driver must see reason.

alter table public.profiles
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz;

alter table public.vehicles
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz;

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists vehicles_status_idx on public.vehicles (status);

