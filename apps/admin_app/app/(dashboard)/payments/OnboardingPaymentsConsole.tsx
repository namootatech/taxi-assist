'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateOnboardingFeeTier } from '@/lib/vehicles/onboarding-fee-actions';
import type { OnboardingFeeTier, OnboardingPaymentRow } from '@/lib/vehicles/onboarding-fees';
import { formatOnboardingFeeZar } from '@/lib/vehicles/onboarding-fees';

function fmt(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    waived_first_year: 'bg-sky-100 text-sky-800',
    paid: 'bg-emerald-100 text-emerald-800',
    due: 'bg-amber-100 text-amber-900',
    overdue: 'bg-red-100 text-red-800',
    pending: 'bg-zinc-100 text-zinc-800',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? 'bg-zinc-100'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function FeeTierCard({ tier }: { tier: OnboardingFeeTier }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]"
      action={(fd) => {
        startTransition(async () => {
          const result = await updateOnboardingFeeTier(fd);
          if (result.success) toast.success('Fee tier updated.');
          else toast.error(result.message ?? 'Update failed.');
        });
      }}
    >
      <input type="hidden" name="category" value={tier.category} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{tier.category}</div>
          <div className="mt-1 text-xs muted">Annual onboarding fee</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm muted">R</span>
          <input
            name="annual_fee_rands"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(tier.annualFeeCents / 100).toFixed(2)}
            className="w-28 rounded-lg border border-token bg-transparent px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function OnboardingPaymentsConsole({
  tiers,
  payments,
}: {
  tiers: Array<OnboardingFeeTier>;
  payments: Array<OnboardingPaymentRow>;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Vehicle fee tiers</h2>
        <p className="text-sm muted">
          Annual platform onboarding fees by vehicle category. First year is waived for new vehicles.
        </p>
        <div className="grid gap-3">
          {tiers.map((tier) => (
            <FeeTierCard key={tier.category} tier={tier} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Onboarding payments</h2>
        {payments.length ? (
          <div className="overflow-x-auto rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-token text-left text-xs uppercase muted">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-token">
                    <td className="px-4 py-3">{p.driverName ?? '—'}</td>
                    <td className="px-4 py-3">{p.registrationNumber ?? p.vehicleId.slice(0, 8)}</td>
                    <td className="px-4 py-3">{p.category ?? '—'}</td>
                    <td className="px-4 py-3">{formatOnboardingFeeZar(p.amountCents)}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 muted">{fmt(p.paidAt ?? p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm muted">No onboarding payments recorded yet.</p>
        )}
      </section>
    </div>
  );
}
