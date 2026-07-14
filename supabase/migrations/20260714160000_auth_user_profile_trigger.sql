-- Ensure every auth signup gets a profiles row (rider or driver).
-- Client apps still upsert profile fields; this covers email-confirm / no-session cases.

create or replace function public.handle_new_auth_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_type text;
begin
  v_profile_type := upper(coalesce(new.raw_user_meta_data ->> 'profile_type', 'DRIVER'));
  if v_profile_type not in ('DRIVER', 'RIDER') then
    v_profile_type := 'DRIVER';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    cellphone,
    profile_type,
    status,
    registration_submitted
  ) values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'cellphone', '')), ''),
    v_profile_type,
    'PENDING',
    false
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    cellphone = coalesce(excluded.cellphone, public.profiles.cellphone),
    profile_type = coalesce(excluded.profile_type, public.profiles.profile_type),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user ();

comment on function public.handle_new_auth_user is
  'Creates/updates public.profiles on auth.users insert. profile_type from user_metadata (default DRIVER).';

-- Fix prior rider trigger that rewrote bare DRIVER rows (no license yet) to RIDER.
create or replace function public.profiles_default_rider_type ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Only backfill when unset. Never rewrite an explicit DRIVER/RIDER value.
  if new.profile_type is null then
    new.profile_type := 'RIDER';
  end if;
  return new;
end;
$$;
