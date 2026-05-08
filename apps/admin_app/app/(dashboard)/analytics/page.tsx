export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm muted">
          Utilization, cancellations, earnings, and quality signals. (Scaffolding)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Utilization" body="Active drivers vs requests. Peak-hour heatmaps and supply gaps." />
        <Card title="Cancellations" body="Rider vs driver cancellations, trend lines, and root causes." />
        <Card title="Earnings" body="Driver earnings distributions and payout performance." />
      </div>

      <div className="rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="text-sm font-semibold tracking-tight">Next</div>
        <ul className="mt-2 list-disc pl-5 text-sm muted">
          <li>Charts with time windows (24h / 7d / 30d).</li>
          <li>Operational drill-down links to Drivers, Trips, and Support.</li>
          <li>Risk/quality dashboards (low ratings, high cancel, fraud flags).</li>
        </ul>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-sm muted">{body}</div>
    </div>
  );
}

