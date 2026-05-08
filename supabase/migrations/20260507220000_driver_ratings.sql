-- Driver ratings captured after trips.
-- Admin-first (RLS) for now; rider-facing insert can be added later.

create table if not exists public.driver_ratings (
  rating_id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  rider_id uuid not null,
  driver_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text null,
  created_at timestamptz not null default now()
);

create index if not exists driver_ratings_driver_id_created_at_idx
  on public.driver_ratings (driver_id, created_at desc);

create index if not exists driver_ratings_trip_id_idx
  on public.driver_ratings (trip_id);

alter table public.driver_ratings enable row level security;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace) then
    -- Admin-only for now
    create policy driver_ratings_select_admin on public.driver_ratings
      for select using (public.is_admin());

    create policy driver_ratings_insert_admin on public.driver_ratings
      for insert with check (public.is_admin());

    create policy driver_ratings_update_admin on public.driver_ratings
      for update using (public.is_admin()) with check (public.is_admin());

    create policy driver_ratings_delete_admin on public.driver_ratings
      for delete using (public.is_admin());
  end if;
end $$;

create or replace view public.driver_rating_summary as
select
  driver_id,
  avg(rating)::numeric(10,2) as avg_rating,
  count(*)::bigint as total_ratings,
  max(created_at) as last_rating_at
from public.driver_ratings
group by driver_id;

