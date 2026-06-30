'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pollCheckoutPayment } from './actions';

type CheckoutReturnState =
  | { status: 'complete'; kind: 'initial' | 'topup'; campaignId: string; packageName?: string }
  | { status: 'pending'; kind: 'initial' | 'topup'; campaignId: string }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' };

export function CheckoutReturnBanner({
  initial,
  campaignId,
  paymentId,
}: {
  initial: CheckoutReturnState;
  campaignId?: string;
  paymentId?: string;
}) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (state.status !== 'pending' || !campaignId || !paymentId) return;

    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      const result = await pollCheckoutPayment(campaignId, paymentId);
      if (result.status === 'complete') {
        setState((current) =>
          current.status === 'pending'
            ? { ...current, status: 'complete' }
            : current,
        );
        window.clearInterval(interval);
      } else if (result.status === 'failed' || result.status === 'missing') {
        setState({ status: 'failed', message: 'Payment was not completed.' });
        window.clearInterval(interval);
      } else if (attempts >= 15) {
        window.clearInterval(interval);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [campaignId, paymentId, state.status]);

  if (state.status === 'cancelled') {
    return (
      <p className='rounded-3xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
        Checkout was cancelled. You can resume payment from your campaign when you are ready.
      </p>
    );
  }

  if (state.status === 'failed') {
    return (
      <p className='rounded-3xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100'>
        {state.message}
      </p>
    );
  }

  if (state.status === 'pending') {
    return (
      <p className='rounded-3xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100'>
        Confirming your payment with Payfast… This usually takes a few seconds.
      </p>
    );
  }

  const packageLabel = state.packageName ? ` (${state.packageName} package)` : '';
  const actionLabel =
    state.kind === 'topup' ? 'Impression top-up confirmed' : `Campaign package confirmed${packageLabel}`;

  return (
    <div className='rounded-3xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'>
      <p className='font-semibold'>{actionLabel}</p>
      <p className='mt-1 opacity-90'>
        Your purchase is saved. View campaign details or submit for review when you are ready.
      </p>
      <Link
        href={`/dashboard/campaigns/${state.campaignId}`}
        className='focus-ring mt-3 inline-flex rounded-full border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-white'
      >
        Open campaign
      </Link>
    </div>
  );
}
