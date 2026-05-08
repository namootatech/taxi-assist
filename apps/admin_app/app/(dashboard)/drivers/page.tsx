import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/user-facing-error";
import { DriversTableClient } from "./DriversTableClient";

type VehicleRow = {
  vehicle_id: string;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  status: string | null;
};

type DriverRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  status: string | null;
  online_status: string | null;
  current_vehicle_id: string | null;
  vehicle: VehicleRow | null;
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
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  const baseRows = (data ?? []) as Array<Omit<DriverRow, "vehicle">>;
  const vehicleIds = Array.from(
    new Set(baseRows.map((r) => r.current_vehicle_id).filter(Boolean) as Array<string>),
  );

  const { data: vehiclesRaw } = vehicleIds.length
    ? await supabase
        .from("vehicles")
        .select("vehicle_id, registration_number, make, model, status")
        .in("vehicle_id", vehicleIds)
    : { data: [] as unknown[] };

  const vehicles = (vehiclesRaw ?? []) as Array<VehicleRow>;
  const vehicleById = new Map(vehicles.map((v) => [v.vehicle_id, v]));

  const rows = baseRows.map((r) => ({
    ...r,
    vehicle: r.current_vehicle_id ? vehicleById.get(r.current_vehicle_id) ?? null : null,
  })) as DriverRow[];

  return <DriversTableClient rows={rows} />;
}

