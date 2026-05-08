import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/user-facing-error";

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, cellphone, status, online_status, current_vehicle_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Driver</h1>
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="text-lg font-semibold tracking-tight">Driver not found</div>
        <p className="mt-2 text-sm muted">This driver may have been removed or you may not have access.</p>
        <Link className="mt-4 inline-flex rounded-lg border border-token px-3 py-2 text-sm font-semibold" href="/drivers">
          Back to drivers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide muted">Driver</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{profile.full_name ?? "Unnamed driver"}</h1>
          <p className="mt-1 text-sm muted">Operational overview, documents, trips, ratings, and audit history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold" href="/verification">
            Review docs
          </Link>
          <Link className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95" href="/trips">
            View trips
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Status</div>
          <div className="mt-2 text-sm font-semibold">{profile.status ?? "—"}</div>
          <div className="mt-1 text-xs muted">Online: {profile.online_status ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Contact</div>
          <div className="mt-2 text-sm font-semibold">{profile.cellphone ?? "—"}</div>
          <div className="mt-1 text-xs muted">Use Support to contact and log the outcome.</div>
        </div>
        <div className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Vehicle</div>
          <div className="mt-2 text-sm font-semibold">{profile.current_vehicle_id ? "Assigned" : "—"}</div>
          <div className="mt-1 text-xs muted">Vehicle details and documents will appear here.</div>
        </div>
      </div>

      <div className="rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="text-sm font-semibold tracking-tight">Next</div>
        <ul className="mt-2 list-disc pl-5 text-sm muted">
          <li>Documents tab with inline previews and expiry risk.</li>
          <li>Trips tab with trip detail drill-down and intervention actions.</li>
          <li>Ratings tab (after ratings schema) with distribution and recent reviews.</li>
          <li>Audit timeline filtered to this driver.</li>
        </ul>
      </div>
    </div>
  );
}

