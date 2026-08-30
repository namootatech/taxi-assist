import Link from 'next/link';
import { loadOnboardingFeeTiers, loadOnboardingPayments } from '@/lib/vehicles/onboarding-fees';
import { OnboardingPaymentsConsole } from './OnboardingPaymentsConsole';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const [tiers, payments] = await Promise.all([
    loadOnboardingFeeTiers(),
    loadOnboardingPayments(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm muted">
            Vehicle onboarding fees, tier configuration, and Payfast payment history.
          </p>
        </div>
        <Link className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold" href="/wallets">
          Go to wallets
        </Link>
      </div>

      <OnboardingPaymentsConsole tiers={tiers} payments={payments} />
    </div>
  );
}
