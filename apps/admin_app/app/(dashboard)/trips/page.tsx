import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';
import { TripsLiveMapSection } from '@/components/maps/TripsLiveMapSection';
import Link from 'next/link';

type TripRow = {
  trip_id: string;
  status: string;
  driver_id: string;
  rider_id: string | null;
  vehicle_id: string | null;
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

type ProfileMini = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
};

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClerkSupabaseServerClient();
  const { status } = await searchParams;

  let q = supabase
    .from('trips')
    .select(
      'trip_id, status, driver_id, rider_id, vehicle_id, payment_method, estimated_fare, final_fare, created_at, completed_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Trips</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as TripRow[];
  const profileIds = Array.from(
    new Set(
      rows.flatMap(
        (r) => [r.driver_id, r.rider_id].filter(Boolean) as string[],
      ),
    ),
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

  const active = rows.filter((r) =>
    [
      'REQUESTED',
      'ACCEPTED',
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'IN_PROGRESS',
    ].includes(r.status),
  );

  const activeTripIds = active.map((t) => t.trip_id);
  const { data: locData } =
    activeTripIds.length > 0
      ? await supabase
          .from('trip_locations')
          .select('trip_id, driver_id, lat, lng, recorded_at')
          .in('trip_id', activeTripIds)
          .order('recorded_at', { ascending: false })
          .limit(500)
      : { data: [] as LocationRow[] };

  const latestByTrip = new Map<string, LocationRow>();
  for (const l of (locData ?? []) as LocationRow[]) {
    if (!latestByTrip.has(l.trip_id)) latestByTrip.set(l.trip_id, l);
  }
  const points = Array.from(latestByTrip.values()).map((p) => ({
    ...p,
    status: active.find((t) => t.trip_id === p.trip_id)?.status,
  }));

  return (
    <div className='space-y-4'>
      <RealtimeRefresh table='trips' />
      <RealtimeRefresh table='trip_locations' />
      <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-xl font-semibold tracking-tight'>Trips</h1>
          <p className='mt-1 text-sm muted'>
            Monitor live trips, investigate incidents, and drill into
            timelines—without raw IDs as primary UI.
          </p>
        </div>
        <p className='text-xs muted'>
          Showing latest {rows.length} • Active {active.length}
        </p>
      </div>

      <div>
        <TripsLiveMapSection points={points} />
      </div>

      <div className='overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]'>
        <table className='w-full text-sm'>
          <thead className='border-b border-token bg-[var(--surface-1)] text-left'>
            <tr>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Trip
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Status
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Driver
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Rider
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Payment
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Fare
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.trip_id}
                className='border-b border-token hover:bg-black/3 last:border-b-0'
              >
                <td className='px-4 py-3'>
                  <Link
                    className='font-semibold hover:underline'
                    href={`/trips/${r.trip_id}`}
                  >
                    View trip
                  </Link>
                  <div className='text-xs muted'>
                    ID ending {r.trip_id.slice(-6)}
                  </div>
                </td>
                <td className='px-4 py-3'>{r.status}</td>
                <td className='px-4 py-3'>
                  {profiles.get(r.driver_id)?.full_name ?? 'Unnamed driver'}
                  <div className='text-xs muted'>
                    {profiles.get(r.driver_id)?.cellphone ?? '—'}
                  </div>
                </td>
                <td className='px-4 py-3'>
                  {r.rider_id
                    ? (profiles.get(r.rider_id)?.full_name ?? 'Unnamed rider')
                    : '—'}
                  <div className='text-xs muted'>
                    {r.rider_id
                      ? (profiles.get(r.rider_id)?.cellphone ?? '—')
                      : ''}
                  </div>
                </td>
                <td className='px-4 py-3'>{r.payment_method ?? '—'}</td>
                <td className='px-4 py-3'>
                  {r.final_fare ?? r.estimated_fare ?? '—'}
                </td>
                <td className='px-4 py-3'>
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className='px-4 py-10 text-sm muted' colSpan={7}>
                  No trips found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
