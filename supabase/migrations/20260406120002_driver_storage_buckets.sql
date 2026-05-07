-- Storage buckets for driver_app (SupabaseService.bucketDriverDocuments / bucketVehiclePhotos).
-- Paths used by the app: `{auth.uid()}/driver/...` and `{auth.uid()}/vehicle/{vehicle_id}/...`
-- Buckets are public so getPublicUrl works as implemented; tighten to private + signed URLs in production if required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'driver-documents',
    'driver-documents',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  ),
  (
    'vehicle-photos',
    'vehicle-photos',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects: first path segment must equal auth.uid() (matches DocumentUploadService path helpers).
drop policy if exists "driver_documents_insert_own_prefix" on storage.objects;
create policy "driver_documents_insert_own_prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "driver_documents_select_own_prefix" on storage.objects;
create policy "driver_documents_select_own_prefix"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "driver_documents_update_own_prefix" on storage.objects;
create policy "driver_documents_update_own_prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'driver-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "driver_documents_delete_own_prefix" on storage.objects;
create policy "driver_documents_delete_own_prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Public read for public buckets (required for anonymous access to public URLs).
drop policy if exists "driver_documents_public_read" on storage.objects;
create policy "driver_documents_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'driver-documents');

drop policy if exists "vehicle_photos_insert_own_prefix" on storage.objects;
create policy "vehicle_photos_insert_own_prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "vehicle_photos_select_own_prefix" on storage.objects;
create policy "vehicle_photos_select_own_prefix"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "vehicle_photos_update_own_prefix" on storage.objects;
create policy "vehicle_photos_update_own_prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'vehicle-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "vehicle_photos_delete_own_prefix" on storage.objects;
create policy "vehicle_photos_delete_own_prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "vehicle_photos_public_read" on storage.objects;
create policy "vehicle_photos_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-photos');
