import { createSupabaseServerClient } from "@/lib/supabase/server";

type VehicleRow = {
  vehicle_id: string;
  registration_number: string;
  make: string;
  model: string;
  colour: string;
  category: string;
  status: string;
  linked_driver_id: string | null;
  linked_driver: Array<{ full_name: string | null; cellphone: string | null }> | null;
  updated_at: string;
};

export default async function VehiclesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "vehicle_id, registration_number, make, model, colour, category, status, linked_driver_id, updated_at, linked_driver:profiles!vehicles_linked_driver_id_fkey(full_name, cellphone)",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Vehicles</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as VehicleRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vehicles</h1>
          <p className="mt-1 text-sm muted">Fleet overview with linked driver identity and verification status.</p>
        </div>
        <p className="text-xs muted">Showing latest {rows.length}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="border-b border-token bg-[var(--surface-1)] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Vehicle</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Make/Model</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Category</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Driver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vehicle_id} className="border-b border-token hover:bg-black/3 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.registration_number}</div>
                  <div className="text-xs muted">{r.colour ? `${r.colour} • ` : ""}{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</div>
                </td>
                <td className="px-4 py-3">
                  {r.make || r.model ? `${r.make} ${r.model}`.trim() : "—"}
                </td>
                <td className="px-4 py-3">{r.category ?? "—"}</td>
                <td className="px-4 py-3">{r.status ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.linked_driver?.[0] ? (
                    <div>
                      <div className="font-semibold">{r.linked_driver[0].full_name ?? "Unnamed driver"}</div>
                      <div className="text-xs muted">{r.linked_driver[0].cellphone ?? "—"}</div>
                    </div>
                  ) : (
                    <span className="text-xs muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-sm muted" colSpan={5}>
                  No vehicles found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

