create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid (),
  source text not null,
  name text not null,
  email text not null,
  phone text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now (),
  constraint marketing_leads_source_check check (
    source in (
      'contact_form',
      'rider_interest',
      'driver_interest',
      'partner_interest',
      'press_interest',
      'support_interest'
    )
  )
);

create index if not exists marketing_leads_created_idx on public.marketing_leads (created_at desc);
create index if not exists marketing_leads_source_created_idx on public.marketing_leads (source, created_at desc);

alter table public.marketing_leads enable row level security;

drop policy if exists "marketing_leads_select_admin" on public.marketing_leads;
create policy "marketing_leads_select_admin"
  on public.marketing_leads
  for select
  to authenticated
  using (public.is_admin ());

-- Public form inserts are performed server-side with the service role key.
