-- Allow admin updates to support_tickets (status changes) under RLS.

drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_update_admin"
  on public.support_tickets
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

