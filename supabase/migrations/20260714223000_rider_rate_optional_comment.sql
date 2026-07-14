-- Allow rating without a written comment (stars alone are enough).

create or replace function public.rider_rate_completed_trip (
  p_trip_id uuid,
  p_rating smallint,
  p_comment text default null,
  p_tip_amount numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_wallet public.wallets%rowtype;
  v_tip numeric(12, 2);
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'Rating must be 1–5');
  end if;

  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trip not found');
  end if;
  if v_trip.rider_id is distinct from auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'Not your trip');
  end if;
  if v_trip.status is distinct from 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'Trip is not completed');
  end if;
  if v_trip.driver_id is null then
    return jsonb_build_object('ok', false, 'error', 'No driver to rate');
  end if;

  if exists (
    select 1 from public.driver_ratings dr
    where dr.trip_id = v_trip.trip_id::text and dr.rider_id = auth.uid ()
  ) then
    return jsonb_build_object('ok', false, 'error', 'Already rated');
  end if;

  insert into public.driver_ratings (trip_id, rider_id, driver_id, rating, comment)
  values (
    v_trip.trip_id::text,
    auth.uid (),
    v_trip.driver_id,
    p_rating,
    nullif(trim(coalesce(p_comment, '')), '')
  );

  v_tip := coalesce(p_tip_amount, 0);
  if v_tip > 0 then
    if v_tip > 500 then
      return jsonb_build_object('ok', false, 'error', 'Tip exceeds R500 cap');
    end if;

    select * into v_wallet
    from public.wallets
    where profile_id = auth.uid () and wallet_type = 'RIDER'
    for update;

    if v_wallet.wallet_id is null or v_wallet.balance < v_tip then
      return jsonb_build_object('ok', false, 'error', 'Insufficient wallet balance for tip');
    end if;

    update public.wallets
    set balance = balance - v_tip, updated_at = now ()
    where wallet_id = v_wallet.wallet_id;

    insert into public.wallet_transactions (
      wallet_id, direction, amount, type, reference, metadata, created_by
    ) values (
      v_wallet.wallet_id,
      'DEBIT',
      v_tip,
      'TIP',
      v_trip.trip_id::text,
      jsonb_build_object('driver_id', v_trip.driver_id),
      auth.uid ()
    );

    update public.trips
    set rider_tip_amount = v_tip, updated_at = now ()
    where trip_id = p_trip_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.rider_rate_completed_trip is
  'Rider rates the driver after COMPLETED. Comment optional; tip optional (wallet).';
