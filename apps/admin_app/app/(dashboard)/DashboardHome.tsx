import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function kpiLabel(n: number | null | undefined) {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();

  const [{ count: activeTrips }, { count: pendingDocs }, { data: recentAudit }, { data: recentTrips }] =
    await Promise.all([
      supabase.from("trips").select("id", { count: "exact", head: true }).in("status", ["requested", "accepted", "started"]),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("audit_logs")
        .select("id, action, actor_role, entity_type, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("trips")
        .select("id, status, created_at, fare_amount, payment_method, driver_id, rider_id")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm muted">
            Live operational view: active work, risk signals, and audit-ready actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]"
            href="/trips"
          >
            Monitor trips
          </Link>
          <Link
            className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
            href="/verification"
          >
            Review verification
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Active trips" value={kpiLabel(activeTrips)} hint="Realtime location + interventions" href="/trips" />
        <KpiCard label="Docs pending" value={kpiLabel(pendingDocs)} hint="Driver + vehicle verification queue" href="/verification" />
        <KpiCard label="Support queue" value="—" hint="Triage, escalate, close with audit" href="/support" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Recent trips" subtitle="Latest activity across the network" href="/trips">
          <div className="divide-y divide-[color:var(--border)]">
            {(recentTrips ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.status}</div>
                  <div className="text-xs muted">
                    {new Date(t.created_at).toLocaleString()} • {t.payment_method ?? "—"}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold">
                  {typeof t.fare_amount === "number" ? `${t.fare_amount.toFixed(2)}` : "—"}
                </div>
              </div>
            ))}
            {!recentTrips?.length ? <EmptyLine /> : null}
          </div>
        </Panel>

        <Panel title="Recent admin activity" subtitle="Audited actions across the console" href="/audit">
          <div className="divide-y divide-[color:var(--border)]">
            {(recentAudit ?? []).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{a.action}</div>
                  <div className="text-xs muted">
                    {a.entity_type} • {a.actor_role ?? "—"} • {new Date(a.created_at).toLocaleString()}
                  </div>
                  {a.reason ? <div className="mt-1 truncate text-xs muted">“{a.reason}”</div> : null}
                </div>
                <div className="shrink-0 rounded-full border border-token bg-[var(--brand-navy-50)] px-2 py-0.5 text-[11px] text-[var(--brand-navy-900)]">
                  audit
                </div>
              </div>
            ))}
            {!recentAudit?.length ? <EmptyLine /> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)] transition hover:-translate-y-[1px] hover:border-[var(--brand-red)]"
    >
      <div className="text-xs font-semibold uppercase tracking-wide muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-sm muted">{hint}</div>
    </Link>
  );
}

function Panel({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3 border-b border-token p-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="text-xs muted">{subtitle}</div>
        </div>
        <Link className="text-sm font-semibold text-[var(--brand-red)] hover:underline" href={href}>
          View
        </Link>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyLine() {
  return <div className="py-10 text-center text-sm muted">No activity yet.</div>;
}

