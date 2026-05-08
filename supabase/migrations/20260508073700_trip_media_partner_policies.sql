alter table public.media_partners enable row level security;
alter table public.partner_members enable row level security;
alter table public.ad_packages enable row level security;
alter table public.partner_subscriptions enable row level security;
alter table public.partner_billing_events enable row level security;
alter table public.ad_creatives enable row level security;

create or replace function trip_private.is_partner_member(p_partner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.partner_members pm
    where pm.partner_id = p_partner_id
      and pm.user_id = auth.uid()
      and pm.joined_at is not null
  ) or public.is_admin();
$$;

create or replace function trip_private.partner_role(p_partner_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select pm.role
  from public.partner_members pm
  where pm.partner_id = p_partner_id
    and pm.user_id = auth.uid()
    and pm.joined_at is not null
  limit 1;
$$;

grant usage on schema trip_private to authenticated;
grant execute on function trip_private.is_partner_member(uuid) to authenticated;
grant execute on function trip_private.partner_role(uuid) to authenticated;

drop policy if exists "media_partners_select_member" on public.media_partners;
create policy "media_partners_select_member"
  on public.media_partners
  for select
  to authenticated
  using (trip_private.is_partner_member(id));

drop policy if exists "media_partners_update_admin_owner" on public.media_partners;
create policy "media_partners_update_admin_owner"
  on public.media_partners
  for update
  to authenticated
  using (public.is_admin () or trip_private.partner_role(id) in ('owner', 'admin'))
  with check (public.is_admin () or trip_private.partner_role(id) in ('owner', 'admin'));

drop policy if exists "partner_members_select_member" on public.partner_members;
create policy "partner_members_select_member"
  on public.partner_members
  for select
  to authenticated
  using (trip_private.is_partner_member(partner_id));

drop policy if exists "partner_members_write_owner_admin" on public.partner_members;
create policy "partner_members_write_owner_admin"
  on public.partner_members
  for all
  to authenticated
  using (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin'))
  with check (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin'));

drop policy if exists "ad_packages_select_active" on public.ad_packages;
create policy "ad_packages_select_active"
  on public.ad_packages
  for select
  to authenticated
  using (is_active or public.is_admin ());

drop policy if exists "ad_packages_write_admin" on public.ad_packages;
create policy "ad_packages_write_admin"
  on public.ad_packages
  for all
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

drop policy if exists "partner_subscriptions_select_member" on public.partner_subscriptions;
create policy "partner_subscriptions_select_member"
  on public.partner_subscriptions
  for select
  to authenticated
  using (trip_private.is_partner_member(partner_id));

drop policy if exists "partner_billing_events_select_member" on public.partner_billing_events;
create policy "partner_billing_events_select_member"
  on public.partner_billing_events
  for select
  to authenticated
  using (partner_id is not null and trip_private.is_partner_member(partner_id));

drop policy if exists "ad_creatives_select_member" on public.ad_creatives;
create policy "ad_creatives_select_member"
  on public.ad_creatives
  for select
  to authenticated
  using (trip_private.is_partner_member(partner_id));

drop policy if exists "ad_creatives_insert_operator" on public.ad_creatives;
create policy "ad_creatives_insert_operator"
  on public.ad_creatives
  for insert
  to authenticated
  with check (trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'));

drop policy if exists "ad_creatives_update_operator" on public.ad_creatives;
create policy "ad_creatives_update_operator"
  on public.ad_creatives
  for update
  to authenticated
  using (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'))
  with check (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'));

drop policy if exists "ad_campaigns_select_partner" on public.ad_campaigns;
create policy "ad_campaigns_select_partner"
  on public.ad_campaigns
  for select
  to authenticated
  using (partner_id is not null and trip_private.is_partner_member(partner_id));

drop policy if exists "ad_campaigns_insert_partner" on public.ad_campaigns;
create policy "ad_campaigns_insert_partner"
  on public.ad_campaigns
  for insert
  to authenticated
  with check (partner_id is not null and trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'));

drop policy if exists "ad_campaigns_update_partner" on public.ad_campaigns;
create policy "ad_campaigns_update_partner"
  on public.ad_campaigns
  for update
  to authenticated
  using (partner_id is not null and trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'))
  with check (partner_id is not null and trip_private.partner_role(partner_id) in ('owner', 'admin', 'operator'));

insert into storage.buckets (id, name, public)
values ('partner-ad-creatives', 'partner-ad-creatives', false)
on conflict (id) do update set public = false;

drop policy if exists "partner_creatives_select_own_prefix" on storage.objects;
create policy "partner_creatives_select_own_prefix"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-ad-creatives'
    and exists (
      select 1
      from public.partner_members pm
      where pm.user_id = auth.uid()
        and pm.joined_at is not null
        and (storage.foldername(name))[1] = pm.partner_id::text
    )
  );

drop policy if exists "partner_creatives_insert_own_prefix" on storage.objects;
create policy "partner_creatives_insert_own_prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'partner-ad-creatives'
    and exists (
      select 1
      from public.partner_members pm
      where pm.user_id = auth.uid()
        and pm.joined_at is not null
        and pm.role in ('owner', 'admin', 'operator')
        and (storage.foldername(name))[1] = pm.partner_id::text
    )
  );
