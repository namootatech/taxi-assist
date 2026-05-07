-- Prompt 7: driver support + payout visibility (PRD §5.6, business-logic §4.4).

-- ---------------------------------------------------------------------------
-- support_tickets — in-app messages to back-office
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  ticket_id uuid primary key default gen_random_uuid (),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now (),
  constraint support_tickets_status_check check (
    status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
  )
);

create index if not exists support_tickets_driver_id_created_idx
  on public.support_tickets (driver_id, created_at desc);

comment on table public.support_tickets is 'Driver app support requests; drivers insert and read own rows.';

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
  on public.support_tickets
  for select
  to authenticated
  using (driver_id = auth.uid ());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
  on public.support_tickets
  for insert
  to authenticated
  with check (driver_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- payouts — back-office ledger; drivers SELECT only
-- ---------------------------------------------------------------------------
create table if not exists public.payouts (
  payout_id uuid primary key default gen_random_uuid (),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null,
  status text not null default 'PENDING',
  reference text,
  created_at timestamptz not null default now (),
  processed_at timestamptz,
  constraint payouts_status_check check (
    status in ('PENDING', 'PROCESSING', 'PAID', 'FAILED')
  )
);

create index if not exists payouts_driver_id_created_idx
  on public.payouts (driver_id, created_at desc);

comment on table public.payouts is 'Processed payouts; populated by service_role / admin; drivers read-only.';

alter table public.payouts enable row level security;

drop policy if exists "payouts_select_own" on public.payouts;
create policy "payouts_select_own"
  on public.payouts
  for select
  to authenticated
  using (driver_id = auth.uid ());
