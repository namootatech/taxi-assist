import Link from "next/link";

export default async function DashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">
        MVP shell — next: KPIs, live trips, verification queue.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link className="rounded-xl border bg-white p-4 hover:bg-zinc-50" href="/drivers">
          <div className="text-sm font-medium">Drivers</div>
          <div className="mt-1 text-xs text-zinc-600">Browse and review drivers</div>
        </Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-zinc-50" href="/vehicles">
          <div className="text-sm font-medium">Vehicles</div>
          <div className="mt-1 text-xs text-zinc-600">Browse fleet and approvals</div>
        </Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-zinc-50" href="/verification">
          <div className="text-sm font-medium">Verification</div>
          <div className="mt-1 text-xs text-zinc-600">Review pending documents</div>
        </Link>
      </div>
    </div>
  );
}

