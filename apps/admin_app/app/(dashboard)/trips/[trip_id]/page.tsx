import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import { TripsLiveMapSection } from '@/components/maps/TripsLiveMapSection';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';

type TripRow = {
  trip_id: string;
  status: string;
  driver_id: string;
  rider_id: string | null;
  payment_method: string | null;
  estimated_fare: number | null;
  final_fare: number | null;
  created_at: string;
  completed_at: string | null;
};

type LocationRow = {
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
};

type TripEventRow = {
  id: string;
  trip_id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
};

type ProfileMini = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
};

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ trip_id: string }>;
}) {
  const { trip_id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: trip, error } = await supabase
    .from('trips')
    .select(
      'trip_id, status, driver_id, rider_id, payment_method, estimated_fare, final_fare, created_at, completed_at',
    )
    .eq('trip_id', trip_id)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Trip</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className='rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]'>
        <div className='text-lg font-semibold tracking-tight'>
          Trip not found
        </div>
        <p className='mt-2 text-sm muted'>
          This trip may have been removed or you may not have access.
        </p>
        <Link
          className='mt-4 inline-flex rounded-lg border border-token px-3 py-2 text-sm font-semibold'
          href='/trips'
        >
          Back to trips
        </Link>
      </div>
    );
  }

  const t = trip as TripRow;

  const profileIds = Array.from(
    new Set([t.driver_id, t.rider_id].filter(Boolean) as string[]),
  );
  const { data: profileData } =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, cellphone')
          .in('id', profileIds)
      : { data: [] as ProfileMini[] };
  const profiles = new Map<string, ProfileMini>();
  for (const p of (profileData ?? []) as ProfileMini[]) profiles.set(p.id, p);

  const [{ data: locData }, { data: eventsData }] = await Promise.all([
    supabase
      .from('trip_locations')
      .select('trip_id, driver_id, lat, lng, recorded_at')
      .eq('trip_id', t.trip_id)
      .order('recorded_at', { ascending: false })
      .limit(200),
    supabase
      .from('trip_events')
      .select('id, trip_id, event_type, payload, created_at')
      .eq('trip_id', t.trip_id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const latestLoc = (locData ?? [])[0] as LocationRow | undefined;
  const points = latestLoc ? [{ ...latestLoc, status: t.status }] : [];

  return (
    <div className='space-y-6'>
      <RealtimeRefresh table='trips' />
      <RealtimeRefresh
        table='trip_locations'
        filter={`trip_id=eq.${t.trip_id}`}
      />
      <RealtimeRefresh table='trip_events' filter={`trip_id=eq.${t.trip_id}`} />

      <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
        <div>
          <div className='text-xs font-semibold uppercase tracking-wide muted'>
            Trip
          </div>
          <h1 className='mt-1 text-2xl font-semibold tracking-tight'>
            {t.status}
          </h1>
          <p className='mt-1 text-sm muted'>
            Created {new Date(t.created_at).toLocaleString()} • ID ending{' '}
            {t.trip_id.slice(-6)}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link
            className='rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold'
            href='/support'
          >
            Open support
          </Link>
          <Link
            className='rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95'
            href='/trips'
          >
            Back to trips
          </Link>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
        <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
          <div className='text-xs font-semibold uppercase tracking-wide muted'>
            Driver
          </div>
          <div className='mt-2 text-sm font-semibold'>
            {profiles.get(t.driver_id)?.full_name ?? 'Unnamed driver'}
          </div>
          <div className='mt-1 text-xs muted'>
            {profiles.get(t.driver_id)?.cellphone ?? '—'}
          </div>
          <Link
            className='mt-3 inline-flex text-sm font-semibold text-[var(--brand-red)] hover:underline'
            href={`/drivers/${t.driver_id}`}
          >
            View driver
          </Link>
        </div>
        <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
          <div className='text-xs font-semibold uppercase tracking-wide muted'>
            Rider
          </div>
          <div className='mt-2 text-sm font-semibold'>
            {t.rider_id
              ? (profiles.get(t.rider_id)?.full_name ?? 'Unnamed rider')
              : '—'}
          </div>
          <div className='mt-1 text-xs muted'>
            {t.rider_id ? (profiles.get(t.rider_id)?.cellphone ?? '—') : '—'}
          </div>
        </div>
        <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
          <div className='text-xs font-semibold uppercase tracking-wide muted'>
            Payment
          </div>
          <div className='mt-2 text-sm font-semibold'>
            {t.payment_method ?? '—'}
          </div>
          <div className='mt-1 text-xs muted'>
            Fare: {t.final_fare ?? t.estimated_fare ?? '—'}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
        <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
          <div className='flex items-baseline justify-between'>
            <div>
              <div className='text-sm font-semibold tracking-tight'>
                Live map
              </div>
              <div className='text-xs muted'>
                Latest location{' '}
                {latestLoc
                  ? new Date(latestLoc.recorded_at).toLocaleString()
                  : '—'}
              </div>
            </div>
            <div className='text-xs muted'>Realtime</div>
          </div>
          <div className='mt-3'>
            <TripsLiveMapSection points={points} />
          </div>
        </div>

        <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
          <div className='text-sm font-semibold tracking-tight'>Timeline</div>
          <div className='mt-1 text-xs muted'>
            Recent trip events (server recorded)
          </div>
          <div className='mt-3 divide-y divide-[color:var(--border)]'>
            {(eventsData ?? []).map((e) => (
              <div key={(e as TripEventRow).id} className='py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-sm font-semibold'>
                    {(e as TripEventRow).event_type}
                  </div>
                  <div className='text-xs muted'>
                    {new Date((e as TripEventRow).created_at).toLocaleString()}
                  </div>
                </div>
                <div className='mt-1 text-xs muted'>
                  {typeof (e as TripEventRow).payload === 'object' &&
                  (e as TripEventRow).payload
                    ? 'Details available'
                    : '—'}
                </div>
              </div>
            ))}
            {!eventsData?.length ? (
              <div className='py-10 text-center text-sm muted'>
                No events yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
