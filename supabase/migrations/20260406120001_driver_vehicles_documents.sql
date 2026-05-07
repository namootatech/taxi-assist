-- vehicles + documents (Prompt 3 / business-logic §2.2–2.3). App expects PK column `vehicle_id`.

create table if not exists public.vehicles (
  vehicle_id uuid primary key default gen_random_uuid (),
  owner_type text not null,
  registration_number text not null,
  colour text not null default '',
  make text not null default '',
  model text not null default '',
  category text not null default 'SEDAN',
  vin text not null default '',
  speedometer_reading numeric,
  owner_details jsonb,
  company_details jsonb,
  status text not null default 'PENDING',
  linked_driver_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_owner_type_check check (owner_type in ('PRIVATE', 'COMPANY')),
  constraint vehicles_category_check check (
    category in ('TUKTUK', 'SEDAN', 'LUXURY', 'VAN')
  ),
  constraint vehicles_status_check check (
    status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')
  )
);

create index if not exists vehicles_linked_driver_id_idx on public.vehicles (linked_driver_id);
create index if not exists vehicles_registration_number_idx on public.vehicles (registration_number);

comment on table public.vehicles is 'Driver-registered vehicles; documents reference vehicle_id.';

-- Optional FK from profiles to vehicles (after vehicles exists).
do $$
begin
  alter table public.profiles
    add constraint profiles_current_vehicle_id_fkey
    foreign key (current_vehicle_id) references public.vehicles (vehicle_id) on delete set null;
exception
  when duplicate_object then null;
end;
$$;

alter table public.vehicles enable row level security;

drop policy if exists "vehicles_select_linked_owner" on public.vehicles;
create policy "vehicles_select_linked_owner"
  on public.vehicles
  for select
  to authenticated
  using (linked_driver_id = auth.uid());

drop policy if exists "vehicles_insert_self_link" on public.vehicles;
create policy "vehicles_insert_self_link"
  on public.vehicles
  for insert
  to authenticated
  with check (linked_driver_id = auth.uid());

drop policy if exists "vehicles_update_linked_owner" on public.vehicles;
create policy "vehicles_update_linked_owner"
  on public.vehicles
  for update
  to authenticated
  using (linked_driver_id = auth.uid())
  with check (linked_driver_id = auth.uid());

-- ---------------------------------------------------------------------------
-- documents (Flutter stores storage path in file_path; status includes PENDING)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  document_id uuid primary key default gen_random_uuid (),
  entity_type text not null,
  entity_id uuid not null,
  document_type text not null,
  file_path text not null,
  status text not null default 'PENDING',
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  expiry_date date,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  constraint documents_entity_type_check check (entity_type in ('DRIVER', 'VEHICLE')),
  constraint documents_status_check check (
    status in ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', 'REJECTED')
  )
);

create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by);
create index if not exists documents_entity_idx on public.documents (entity_type, entity_id);
create index if not exists documents_status_idx on public.documents (status);

comment on table public.documents is 'Driver/vehicle uploads; Realtime enabled for waiting-approval UI.';

alter table public.documents enable row level security;

drop policy if exists "documents_select_own_uploads" on public.documents;
create policy "documents_select_own_uploads"
  on public.documents
  for select
  to authenticated
  using (uploaded_by = auth.uid());

drop policy if exists "documents_insert_own_uploads" on public.documents;
create policy "documents_insert_own_uploads"
  on public.documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      (entity_type = 'DRIVER' and entity_id = auth.uid())
      or (entity_type = 'VEHICLE' and exists (
        select 1
        from public.vehicles v
        where v.vehicle_id = entity_id
          and v.linked_driver_id = auth.uid()
      ))
    )
  );

-- Drivers do not update rows after insert in MVP; back-office uses service_role (bypasses RLS).
-- Add update policy for reviewer flows later if needed.

-- Realtime: postgres_changes on documents (Supabase dashboard must have Realtime on for the table).
alter publication supabase_realtime add table public.documents;
