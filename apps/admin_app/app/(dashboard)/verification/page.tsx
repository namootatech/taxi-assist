import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActionError, logActionInfo, logActionWarn } from "@/lib/server-action-logger";
import { userFacingError } from "@/lib/user-facing-error";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import { VerificationQueueClient } from "./VerificationQueueClient";

type DocRow = {
  document_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_path?: string;
  status: string;
  created_at: string;
  expiry_date: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  email: string | null;
  id_number: string | null;
  dob: string | null;
  sex: string | null;
  residential_address: string | null;
  license_number: string | null;
  license_code: string | null;
  pdp_number: string | null;
  pdp_expiry: string | null;
  bank_details: unknown | null;
  selfie_url: string | null;
  status: string | null;
  online_status: string | null;
  training_completed: boolean | null;
  registration_submitted: boolean | null;
  current_vehicle_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VehicleRow = {
  vehicle_id: string;
  linked_driver_id: string | null;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  category: string | null;
  vin: string | null;
  speedometer_reading: number | null;
  owner_type: string | null;
  owner_details: unknown | null;
  company_details: unknown | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocWithSignedUrl = DocRow & { signedUrl: string | null };

type DriverVerificationCase = {
  driver_id: string;
  driver: ProfileRow | null;
  vehicles: Array<VehicleRow>;
  driverDocs: Array<DocWithSignedUrl>;
  vehicleDocsByVehicleId: Record<string, Array<DocWithSignedUrl>>;
  stats: {
    totalDocs: number;
    expiringSoonDocs: number;
    oldestCreatedAt: string | null;
  };
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; driverId?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { status, driverId } = await searchParams;
  const effectiveStatus = status ?? "PENDING";

  // Queue driver selection is based on a status filter (eg PENDING),
  // but case review + driver approval must have access to *all* docs for a driver and their vehicles.
  const { data: queueDocsRaw, error } = await supabase
    .from("documents")
    .select("document_id, entity_type, entity_id, document_type, file_path, status, created_at, expiry_date")
    .eq("status", effectiveStatus)
    .order("created_at", { ascending: true })
    .limit(400);

  function storageBucketForPath(filePath: string) {
    const parts = filePath.split("/");
    if (parts.length >= 4 && parts[1] === "vehicle") {
      const file = parts[3] ?? "";
      if (
        file.startsWith("front_") ||
        file.startsWith("left_") ||
        file.startsWith("right_") ||
        file.startsWith("rear_") ||
        file.startsWith("speedo_")
      ) {
        return "vehicle-photos";
      }
    }
    return "driver-documents";
  }

  async function signedUrlFor(doc: DocRow) {
    const filePath = doc.file_path;
    if (!filePath) return null;

    // Bucket is derived from the stored file path (vehicle photos vs general docs).
    const bucket = storageBucketForPath(filePath);
    const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 5);
    return data?.signedUrl ?? null;
  }

  async function review(formData: FormData) {
    "use server";
    const docId = String(formData.get("document_id") ?? "");
    const decision = String(formData.get("decision") ?? "");
    const reason = String(formData.get("reason") ?? "");
    logActionInfo("admin.verification.review", "started", { docId, decision, hasReason: Boolean(reason.trim()) });

    if (!docId || (decision !== "APPROVED" && decision !== "DECLINED")) {
      logActionWarn("admin.verification.review", "invalid_request", { docId, decision });
      return { ok: false as const, error: "Invalid request" };
    }
    if (!reason.trim()) {
      logActionWarn("admin.verification.review", "missing_reason", { docId, decision });
      return { ok: false as const, error: "Reason is required" };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      logActionError("admin.verification.review", "not_authenticated", userErr, { docId, decision });
      return { ok: false as const, error: "Not authenticated" };
    }

    const { error: updateErr } = await supabase
      .from("documents")
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        decline_reason: decision === "DECLINED" ? reason : null,
      })
      .eq("document_id", docId);

    if (updateErr) {
      logActionError("admin.verification.review", "update_failed", updateErr, { docId, decision, userId: user.id });
      return { ok: false as const, error: userFacingError(updateErr) };
    }

    await supabase.rpc("admin_audit_log", {
      p_action: decision === "APPROVED" ? "document.approve" : "document.decline",
      p_entity_type: "documents",
      p_entity_id: docId,
      p_reason: reason,
      p_metadata: {},
    });

    logActionInfo("admin.verification.review", "completed", { docId, decision, userId: user.id });
    return { ok: true as const };
  }

  async function approveDriver(formData: FormData) {
    "use server";
    const targetDriverId = String(formData.get("driver_id") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();

    if (!targetDriverId) {
      console.error("[approveDriver] Missing driver_id");
      return { ok: false as const, error: "Invalid request" };
    }
    if (!reason) {
      console.error("[approveDriver] Missing reason", { targetDriverId });
      return { ok: false as const, error: "Reason is required" };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error("[approveDriver] Not authenticated", { targetDriverId, userErr });
      return { ok: false as const, error: "Not authenticated" };
    }

    const { data: vehicleRows, error: vehiclesErr } = await supabase
      .from("vehicles")
      .select("vehicle_id")
      .eq("linked_driver_id", targetDriverId);

    if (vehiclesErr) {
      console.error("[approveDriver] Vehicle fetch failed", { targetDriverId, vehiclesErr });
      return { ok: false as const, error: userFacingError(vehiclesErr) };
    }

    const vehicleIds = (vehicleRows ?? []).map((v) => v.vehicle_id).filter(Boolean) as Array<string>;
    const entityIds = [targetDriverId, ...vehicleIds];

    const { data: relevantDocs, error: docsErr } = await supabase
      .from("documents")
      .select("document_id, entity_type, entity_id, document_type, status")
      .in("entity_id", entityIds)
      .in("entity_type", ["DRIVER", "VEHICLE"]);

    if (docsErr) {
      console.error("[approveDriver] Doc fetch failed", { targetDriverId, docsErr });
      return { ok: false as const, error: userFacingError(docsErr) };
    }

    const docs = relevantDocs ?? [];
    if (!docs.length) {
      console.error("[approveDriver] No docs found", { targetDriverId, vehicleIdsCount: vehicleIds.length });
      return { ok: false as const, error: "Driver has no documents to review" };
    }

    const hasPending = docs.some((d) => String(d.status ?? "").toUpperCase() === "PENDING");
    if (hasPending) {
      const pendingCount = docs.filter((d) => String(d.status ?? "").toUpperCase() === "PENDING").length;
      console.error("[approveDriver] Pending docs exist", { targetDriverId, pendingCount, docsCount: docs.length });
      const pendingExamples = docs
        .filter((d) => String(d.status ?? "").toUpperCase() === "PENDING")
        .slice(0, 5)
        .map((d) => {
          const entity = String(d.entity_type ?? "").toUpperCase() === "VEHICLE" ? "Vehicle" : "Driver"
          const docType = typeof d.document_type === "string" ? d.document_type : "Unknown document"
          return `${entity}: ${docType}`
        })
        .filter(Boolean);

      return {
        ok: false as const,
        error: pendingExamples.length
          ? `You still have ${pendingCount} pending document(s). Review and approve/decline them first. Examples: ${pendingExamples.join(", ")}`
          : `You still have ${pendingCount} pending document(s). Review and approve/decline them first.`,
      };
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ status: "APPROVED" })
      .eq("id", targetDriverId);

    if (updateErr) {
      console.error("[approveDriver] Profile update failed", { targetDriverId, updateErr });
      return { ok: false as const, error: userFacingError(updateErr) };
    }

    await supabase.rpc("admin_audit_log", {
      p_action: "driver.approve",
      p_entity_type: "profiles",
      p_entity_id: targetDriverId,
      p_reason: reason,
      p_metadata: {},
    });

    console.log("[approveDriver] Success", { targetDriverId, vehicleIdsCount: vehicleIds.length, docsCount: docs.length });
    return { ok: true as const };
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Verification</h1>
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  const queueRows = (queueDocsRaw ?? []) as DocRow[];

  const queueDriverIds = new Set(queueRows.filter((d) => d.entity_type === "DRIVER").map((d) => d.entity_id));
  if (driverId) queueDriverIds.add(driverId);

  const driverIdsArray = Array.from(queueDriverIds);
  const { data: vehiclesForDriver } = driverId
    ? await supabase.from("vehicles").select("vehicle_id, linked_driver_id").eq("linked_driver_id", driverId)
    : { data: [] as unknown[] };

  const vehicleIdsForDrivers = new Set<string>();
  for (const v of ((vehiclesForDriver ?? []) as unknown as Array<{ vehicle_id: string | null }>)) {
    if (v.vehicle_id) vehicleIdsForDrivers.add(v.vehicle_id);
  }

  const vehicleIdsFromQueueDocs = new Set<string>();
  for (const d of queueRows) {
    if (d.entity_type === "VEHICLE") vehicleIdsFromQueueDocs.add(d.entity_id);
  }

  // Expand the doc set: all docs for drivers in scope + their vehicles (all statuses).
  const entityIdsToFetch = Array.from(new Set([...driverIdsArray, ...vehicleIdsFromQueueDocs, ...Array.from(vehicleIdsForDrivers)]));

  const { data: expandedDocsRaw, error: expandedErr } = entityIdsToFetch.length
    ? await supabase
        .from("documents")
        .select("document_id, entity_type, entity_id, document_type, file_path, status, created_at, expiry_date")
        .in("entity_id", entityIdsToFetch)
        .in("entity_type", ["DRIVER", "VEHICLE"])
        .order("created_at", { ascending: true })
        .limit(2000)
    : { data: [] as unknown[], error: null as unknown };

  if (expandedErr) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Verification</h1>
        <p className="mt-2 text-sm text-red-600">{userFacingError(expandedErr)}</p>
      </div>
    );
  }

  const rows = (expandedDocsRaw ?? []) as DocRow[];
  const signedUrls = await Promise.all(rows.map((r) => signedUrlFor(r)));

  const docsWithUrls: Array<DocWithSignedUrl> = rows.map((r, idx) => ({
    ...r,
    signedUrl: (signedUrls[idx] as string | null) ?? null,
  }));

  const driverIdsFromDriverDocs = new Set(docsWithUrls.filter((d) => d.entity_type === "DRIVER").map((d) => d.entity_id));
  const vehicleIds = Array.from(new Set(docsWithUrls.filter((d) => d.entity_type === "VEHICLE").map((d) => d.entity_id)));

  const [{ data: vehiclesRaw }, { data: profilesRaw }] = await Promise.all([
    vehicleIds.length
      ? supabase
          .from("vehicles")
          .select(
            "vehicle_id, linked_driver_id, registration_number, make, model, colour, category, vin, speedometer_reading, owner_type, owner_details, company_details, status, created_at, updated_at",
          )
          .in("vehicle_id", vehicleIds)
      : Promise.resolve({ data: [] as unknown[] }),
    driverIdsFromDriverDocs.size
      ? supabase
          .from("profiles")
          .select(
            "id, full_name, cellphone, email, id_number, dob, sex, residential_address, license_number, license_code, pdp_number, pdp_expiry, bank_details, selfie_url, status, online_status, training_completed, registration_submitted, current_vehicle_id, created_at, updated_at",
          )
          .in("id", Array.from(driverIdsFromDriverDocs))
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const vehicles = ((vehiclesRaw ?? []) as unknown as Array<VehicleRow>).filter((v) => !!v.vehicle_id);
  const profiles = ((profilesRaw ?? []) as unknown as Array<ProfileRow>).filter((p) => !!p.id);

  const driverIdsFromVehicleDocs = new Set(vehicles.map((v) => v.linked_driver_id).filter(Boolean) as Array<string>);
  const missingProfileIds = Array.from(driverIdsFromVehicleDocs).filter((id) => !profiles.some((p) => p.id === id));
  if (missingProfileIds.length) {
    const { data: extraProfiles } = await supabase
      .from("profiles")
      .select(
        "id, full_name, cellphone, email, id_number, dob, sex, residential_address, license_number, license_code, pdp_number, pdp_expiry, bank_details, selfie_url, status, online_status, training_completed, registration_submitted, current_vehicle_id, created_at, updated_at",
      )
      .in("id", missingProfileIds);
    profiles.push(...(((extraProfiles ?? []) as unknown) as Array<ProfileRow>));
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const vehiclesByDriverId = new Map<string, Array<VehicleRow>>();
  for (const v of vehicles) {
    const driverId = v.linked_driver_id;
    if (!driverId) continue;
    const list = vehiclesByDriverId.get(driverId) ?? [];
    list.push(v);
    vehiclesByDriverId.set(driverId, list);
  }

  const vehicleById = new Map(vehicles.map((v) => [v.vehicle_id, v]));

  const driverIdsForCases = new Set<string>();
  for (const d of docsWithUrls) {
    if (d.entity_type === "DRIVER") driverIdsForCases.add(d.entity_id);
    if (d.entity_type === "VEHICLE") {
      const vehicle = vehicleById.get(d.entity_id);
      if (vehicle?.linked_driver_id) driverIdsForCases.add(vehicle.linked_driver_id);
    }
  }

  const cases: Array<DriverVerificationCase> = Array.from(driverIdsForCases).map((driverId) => {
    const driverDocs = docsWithUrls.filter((d) => d.entity_type === "DRIVER" && d.entity_id === driverId);
    const linkedVehicles = vehiclesByDriverId.get(driverId) ?? [];
    const vehicleDocsByVehicleId: Record<string, Array<DocWithSignedUrl>> = {};

    for (const d of docsWithUrls) {
      if (d.entity_type !== "VEHICLE") continue;
      const vehicle = vehicleById.get(d.entity_id);
      if (!vehicle || vehicle.linked_driver_id !== driverId) continue;
      const list = vehicleDocsByVehicleId[d.entity_id] ?? [];
      list.push(d);
      vehicleDocsByVehicleId[d.entity_id] = list;
    }

    const allDocs = [...driverDocs, ...Object.values(vehicleDocsByVehicleId).flat()];
    const expiringSoonDocs = allDocs.filter((d) => {
      const until = daysUntil(d.expiry_date);
      return typeof until === "number" && until >= 0 && until <= 14;
    }).length;
    const oldestCreatedAt =
      allDocs.reduce<string | null>((acc, d) => {
        if (!acc) return d.created_at;
        return new Date(d.created_at).getTime() < new Date(acc).getTime() ? d.created_at : acc;
      }, null) ?? null;

    return {
      driver_id: driverId,
      driver: profileById.get(driverId) ?? null,
      vehicles: linkedVehicles,
      driverDocs,
      vehicleDocsByVehicleId,
      stats: {
        totalDocs: allDocs.length,
        expiringSoonDocs,
        oldestCreatedAt,
      },
    };
  });

  cases.sort((a, b) => {
    const ta = a.stats.oldestCreatedAt ? new Date(a.stats.oldestCreatedAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.stats.oldestCreatedAt ? new Date(b.stats.oldestCreatedAt).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  return (
    <div className="space-y-4">
      <RealtimeRefresh table="documents" />
      <VerificationQueueClient
        effectiveStatus={effectiveStatus}
        cases={cases}
        reviewAction={review}
        approveDriverAction={approveDriver}
        initialDriverId={driverId ?? null}
      />
    </div>
  );
}

