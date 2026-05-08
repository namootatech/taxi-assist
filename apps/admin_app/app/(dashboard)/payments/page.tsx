import Link from "next/link";

export default async function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm muted">Payout queue, reconciliation, and payment health. (Scaffolding)</p>
        </div>
        <Link className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold" href="/wallets">
          Go to wallets
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Payout queue" body="Pending payouts will appear here with status, amount, and audit trail." />
        <Card title="Reconciliation" body="Match trips → payments → wallet ledger. Flag mismatches for review." />
        <Card title="Risk signals" body="Chargebacks, failed payouts, and suspicious patterns surface here." />
      </div>

      <div className="rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="text-sm font-semibold tracking-tight">Next</div>
        <ul className="mt-2 list-disc pl-5 text-sm muted">
          <li>Payout status workflow (audited).</li>
          <li>Transaction viewer linked to wallets and trips.</li>
          <li>Filters: failed, pending, high-value, anomalies.</li>
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

