export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm muted">Console configuration, feature flags, and operational defaults. (Scaffolding)</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Operational defaults" body="Thresholds for fraud signals, cancellation alerts, SLA targets, and more." />
        <Card title="Feature flags" body="Roll out new flows safely. Permission-aware and auditable." />
      </div>

      <div className="rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="text-sm font-semibold tracking-tight">Next</div>
        <ul className="mt-2 list-disc pl-5 text-sm muted">
          <li>RBAC-aware settings panels per role.</li>
          <li>Audit logs for every configuration change.</li>
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

