-- Rider may read only their own aggregate rating (avg + count), never rows/comments.

create or replace function public.rider_get_my_rating_summary ()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(10, 2);
  v_count bigint;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select
    round(avg(r.rating)::numeric, 2),
    count(*)::bigint
  into v_avg, v_count
  from public.rider_ratings r
  where r.rider_id = auth.uid ();

  return jsonb_build_object(
    'ok', true,
    'avg_rating', v_avg,
    'total_ratings', coalesce(v_count, 0)
  );
end;
$$;

comment on function public.rider_get_my_rating_summary is
  'Rider-only: own average star rating and count. No comments or rater identities.';

grant execute on function public.rider_get_my_rating_summary () to authenticated;
