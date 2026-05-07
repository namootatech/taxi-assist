import { createSupabaseServerClient } from "@/lib/supabase/server";

type DriverRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  status: string | null;
  online_status: string | null;
  current_vehicle_id: string | null;
  updated_at: string | null;
};

export default async function DriversPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, cellphone, status, online_status, current_vehicle_id, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Drivers</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as DriverRow[];

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Drivers</h1>
        <p className="text-sm text-zinc-600">Showing latest {rows.length}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Online</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{r.full_name ?? "—"}</td>
                <td className="px-4 py-3">{r.cellphone ?? "—"}</td>
                <td className="px-4 py-3">{r.status ?? "—"}</td>
                <td className="px-4 py-3">{r.online_status ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{r.current_vehicle_id ?? "—"}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
                  No drivers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

