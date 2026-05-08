import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DriversTableClient } from "./DriversTableClient";

type DriverRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  status: string | null;
  online_status: string | null;
  current_vehicle_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function DriversPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, cellphone, status, online_status, current_vehicle_id, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-lg font-semibold">Drivers</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as DriverRow[];

  return <DriversTableClient rows={rows} />;
}

