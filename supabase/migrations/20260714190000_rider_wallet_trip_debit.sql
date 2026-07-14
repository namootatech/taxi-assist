-- Wallet trip payment: debit RIDER wallet when booking with WALLET.
-- WALLET_CASH stores the method only (cash covers remainder — no partial debit yet).

create or replace function public.rider_debit_wallet_for_trip (
  p_trip_id uuid,
  p_amount numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_wallet public.wallets%rowtype;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Invalid amount');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;
  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;

  select * into v_wallet
  from public.wallets
  where profile_id = auth.uid () and wallet_type = 'RIDER'
  for update;

  if v_wallet.wallet_id is null then
    return jsonb_build_object('ok', false, 'error', 'Wallet not found');
  end if;
  if v_wallet.balance < p_amount then
    return jsonb_build_object(
      'ok', false,
      'error', 'Insufficient wallet balance',
      'balance', v_wallet.balance
    );
  end if;

  update public.wallets
  set balance = balance - p_amount, updated_at = now ()
  where wallet_id = v_wallet.wallet_id;

  insert into public.wallet_transactions (
    wallet_id, direction, amount, type, reference, metadata, created_by
  ) values (
    v_wallet.wallet_id,
    'DEBIT',
    p_amount,
    'TRIP_FARE',
    p_trip_id::text,
    jsonb_build_object('trip_id', p_trip_id),
    auth.uid ()
  );

  return jsonb_build_object(
    'ok', true,
    'debited', p_amount,
    'balance', v_wallet.balance - p_amount
  );
end;
$$;

grant execute on function public.rider_debit_wallet_for_trip (uuid, numeric) to authenticated;

-- Ensure every rider gets a wallet row on first sign-up (idempotent).
create or replace function public.ensure_rider_wallet ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_type = 'RIDER' then
    insert into public.wallets (profile_id, wallet_type, balance)
    values (new.id, 'RIDER', 0)
    on conflict (profile_id, wallet_type) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_rider_wallet on public.profiles;
create trigger profiles_ensure_rider_wallet
after insert or update of profile_type on public.profiles
for each row
execute function public.ensure_rider_wallet ();

comment on function public.rider_debit_wallet_for_trip is
  'Debits RIDER wallet for full WALLET fare payment after trip request.';
