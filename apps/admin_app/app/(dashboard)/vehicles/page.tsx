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
  updated_at: string;
};

export default async function VehiclesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "vehicle_id, registration_number, make, model, colour, category, status, linked_driver_id, updated_at",
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

  const rows = (data ?? []) as VehicleRow[];

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Vehicles</h1>
        <p className="text-sm text-zinc-600">Showing latest {rows.length}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Reg</th>
              <th className="px-4 py-3 font-medium">Make/Model</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Driver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vehicle_id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.registration_number}</div>
                  <div className="text-xs text-zinc-600">
                    {r.colour ? `${r.colour} • ` : ""}
                    <span className="font-mono">{r.vehicle_id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.make || r.model ? `${r.make} ${r.model}`.trim() : "—"}
                </td>
                <td className="px-4 py-3">{r.category ?? "—"}</td>
                <td className="px-4 py-3">{r.status ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{r.linked_driver_id ?? "—"}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
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

