-- Drivers may read only their aggregate star summary (no raters / comments).

create or replace function public.driver_get_my_rating ()
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

  select s.avg_rating, s.total_ratings
  into v_avg, v_count
  from public.driver_rating_summary s
  where s.driver_id = auth.uid ();

  return jsonb_build_object(
    'ok', true,
    'avg_rating', v_avg,
    'total_ratings', coalesce(v_count, 0)
  );
end;
$$;

comment on function public.driver_get_my_rating () is
  'Signed-in driver: own avg_rating + total_ratings only (no comments or raters).';

grant execute on function public.driver_get_my_rating () to authenticated;
