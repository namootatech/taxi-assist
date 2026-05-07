import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import dynamic from "next/dynamic";

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

const TripsLiveMap = dynamic(
  () => import("@/components/maps/TripsLiveMap").then((m) => m.TripsLiveMap),
  { ssr: false },
);

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { status } = await searchParams;

  let q = supabase
    .from("trips")
    .select(
      "trip_id, status, driver_id, rider_id, vehicle_id, payment_method, estimated_fare, final_fare, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Trips</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as TripRow[];
  const active = rows.filter((r) =>
    ["REQUESTED", "ACCEPTED", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "IN_PROGRESS"].includes(
      r.status,
    ),
  );

  const activeTripIds = active.map((t) => t.trip_id);
  const { data: locData } =
    activeTripIds.length > 0
      ? await supabase
          .from("trip_locations")
          .select("trip_id, driver_id, lat, lng, recorded_at")
          .in("trip_id", activeTripIds)
          .order("recorded_at", { ascending: false })
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
    <div className="p-6">
      <RealtimeRefresh table="trips" />
      <RealtimeRefresh table="trip_locations" />
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Trips</h1>
        <p className="text-sm text-zinc-600">
          Showing latest {rows.length} • Active {active.length}
        </p>
      </div>

      <div className="mt-4">
        <TripsLiveMap points={points} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Trip</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Rider</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Fare</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.trip_id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{r.trip_id}</div>
                </td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{r.driver_id}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{r.rider_id ?? "—"}</span>
                </td>
                <td className="px-4 py-3">{r.payment_method ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.final_fare ?? r.estimated_fare ?? "—"}
                </td>
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={7}>
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

