-- Trip Media partner invites and notifications
-- Adds partner_invites token table + accept RPC, partner_notifications table,
-- and extends the ad_campaigns status enum to support the full lifecycle.

create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid (),
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  email text not null,
  role text not null default 'viewer',
  token text not null,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now () + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint partner_invites_role_check check (role in ('owner', 'admin', 'operator', 'viewer')),
  constraint partner_invites_token_unique unique (token)
);

create unique index if not exists partner_invites_partner_email_active_idx
  on public.partner_invites (partner_id, lower (email))
  where accepted_at is null and revoked_at is null;

create index if not exists partner_invites_token_idx on public.partner_invites (token)
  where accepted_at is null and revoked_at is null;

create table if not exists public.partner_notifications (
  id uuid primary key default gen_random_uuid (),
  partner_id uuid not null references public.media_partners (id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now (),
  constraint partner_notifications_kind_check check (kind in ('info', 'success', 'warning', 'error'))
);

create index if not exists partner_notifications_partner_idx
  on public.partner_notifications (partner_id, created_at desc);

create index if not exists partner_notifications_partner_unread_idx
  on public.partner_notifications (partner_id)
  where read_at is null;

-- Extend ad_campaigns status enum to cover the full partner lifecycle.
alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_status_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_status_check check (
    status in ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ENDED', 'REJECTED')
  );

alter table public.ad_campaigns
  add column if not exists start_date date;

alter table public.ad_campaigns
  add column if not exists end_date date;

alter table public.ad_campaigns
  add column if not exists review_note text;

alter table public.ad_campaigns
  add column if not exists submitted_at timestamptz;

alter table public.ad_campaigns
  add column if not exists activated_at timestamptz;

alter table public.partner_invites enable row level security;
alter table public.partner_notifications enable row level security;

drop policy if exists "partner_invites_select_member" on public.partner_invites;
create policy "partner_invites_select_member"
  on public.partner_invites
  for select
  to authenticated
  using (trip_private.is_partner_member(partner_id));

drop policy if exists "partner_invites_write_admin_owner" on public.partner_invites;
create policy "partner_invites_write_admin_owner"
  on public.partner_invites
  for all
  to authenticated
  using (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin'))
  with check (public.is_admin () or trip_private.partner_role(partner_id) in ('owner', 'admin'));

drop policy if exists "partner_notifications_select_member" on public.partner_notifications;
create policy "partner_notifications_select_member"
  on public.partner_notifications
  for select
  to authenticated
  using (trip_private.is_partner_member(partner_id));

drop policy if exists "partner_notifications_update_member" on public.partner_notifications;
create policy "partner_notifications_update_member"
  on public.partner_notifications
  for update
  to authenticated
  using (trip_private.is_partner_member(partner_id))
  with check (trip_private.is_partner_member(partner_id));

-- get_partner_invite_preview returns minimal info needed to render the accept page
-- to anonymous and authenticated users. Only the invite token grants access; without
-- the token nothing is leaked. The email is what the invitee already supplied.
create or replace function public.get_partner_invite_preview(p_token text)
returns table (
  partner_name text,
  role text,
  email text,
  is_expired boolean,
  is_revoked boolean,
  is_accepted boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    mp.name as partner_name,
    pi.role,
    pi.email,
    (pi.expires_at < now ()) as is_expired,
    (pi.revoked_at is not null) as is_revoked,
    (pi.accepted_at is not null) as is_accepted
  from public.partner_invites pi
  join public.media_partners mp on mp.id = pi.partner_id
  where pi.token = p_token
  limit 1;
$$;

grant execute on function public.get_partner_invite_preview(text) to anon, authenticated;

-- accept_partner_invite attaches the current authenticated user to the partner
-- workspace described by the invite token. Idempotent and safe to call repeatedly.
-- Returns the partner_id on success.
create or replace function public.accept_partner_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid ();
  v_user_email text;
  v_invite public.partner_invites%rowtype;
  v_partner_id uuid;
  v_now timestamptz := now ();
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invite from public.partner_invites where token = p_token limit 1;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = '22023';
  end if;

  if v_invite.expires_at < v_now then
    raise exception 'invite_expired' using errcode = '22023';
  end if;

  if v_user_email is null or lower (v_user_email) <> lower (v_invite.email) then
    raise exception 'invite_email_mismatch' using errcode = '22023';
  end if;

  v_partner_id := v_invite.partner_id;

  -- Upsert membership: prefer attaching to existing email-row, otherwise insert.
  update public.partner_members
  set
    user_id = v_user_id,
    joined_at = coalesce (joined_at, v_now),
    role = v_invite.role,
    updated_at = v_now
  where
    partner_id = v_partner_id
    and (
      (email is not null and lower (email) = lower (v_invite.email))
      or user_id = v_user_id
    );

  if not found then
    insert into public.partner_members (partner_id, user_id, email, role, invited_at, joined_at)
    values (v_partner_id, v_user_id, v_invite.email, v_invite.role, v_invite.created_at, v_now)
    on conflict (partner_id, user_id) do update
      set joined_at = excluded.joined_at,
          role = excluded.role,
          email = excluded.email,
          updated_at = v_now;
  end if;

  if v_invite.accepted_at is null then
    update public.partner_invites
    set accepted_at = v_now,
        updated_at = v_now
    where id = v_invite.id;
  end if;

  insert into public.partner_notifications (partner_id, kind, title, body, link)
  values (
    v_partner_id,
    'success',
    'New team member joined',
    coalesce (v_invite.email, '') || ' joined the workspace as ' || v_invite.role || '.',
    '/dashboard/team'
  );

  return v_partner_id;
end;
$$;

grant execute on function public.accept_partner_invite(text) to authenticated;
