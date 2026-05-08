import { redirect } from 'next/navigation';
import { CreditCard, History, PiggyBank, Sparkles } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canManageBilling } from '@/lib/permissions';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { createPayfastCheckout } from './actions';

export const dynamic = 'force-dynamic';

const ZAR = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  paused: 'Paused',
};

const STATUS_PALETTE: Record<string, string> = {
  trialing: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
  active: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
  past_due: 'border-red-300/40 bg-red-500/10 text-red-100',
  canceled: 'border-slate-300/40 bg-slate-300/10 text-slate-100',
  paused: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/billing');
  }

  const supabase = await createClerkSupabaseServerClient();
  const [{ data: packages }, { data: subscription }, { data: events }] =
    await Promise.all([
      supabase
        .from('ad_packages')
        .select(
          'id, slug, name, description, monthly_price_cents, impression_cap_monthly, max_concurrent_campaigns',
        )
        .eq('is_active', true)
        .order('monthly_price_cents'),
      supabase
        .from('partner_subscriptions')
        .select(
          'id, status, provider, current_period_start, current_period_end, cancel_at_period_end, package:ad_packages(id, slug, name, monthly_price_cents)',
        )
        .eq('partner_id', context.partner.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('partner_billing_events')
        .select('id, type, processed_at, payload_json')
        .eq('partner_id', context.partner.id)
        .order('processed_at', { ascending: false })
        .limit(20),
    ]);

  const subPackage = Array.isArray(subscription?.package)
    ? subscription?.package[0]
    : subscription?.package;
  const canManage = canManageBilling(context.member.role);
  const credits = context.partner.promotional_credits_balance;

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
            Billing
          </p>
          <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
            Wallet & billing
          </h1>
          <p className='mt-2 max-w-2xl text-sm muted'>
            Subscribe to a Trip Media package, monitor invoices, and keep an eye
            on your promotional credits. Payments use Payfast in South African
            Rand.
          </p>
        </div>
      </header>

      {subscription?.status === 'past_due' ? (
        <div className='rounded-3xl border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-100'>
          <p className='font-bold'>Subscription past due</p>
          <p className='mt-1'>
            Trip Media pauses campaign delivery while subscriptions are past
            due. Update your payment method or contact support to bring billing
            back online.
          </p>
        </div>
      ) : null}

      {params.error === 'payfast_not_ready' ? (
        <div className='rounded-3xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100'>
          Payfast is not fully configured yet. Reach out to support to enable
          checkout.
        </div>
      ) : null}
      {params.checkout === 'cancelled' ? (
        <div className='rounded-3xl border border-[var(--border)] bg-white/4 p-4 text-sm muted'>
          Checkout was cancelled. You can pick a package below when you’re
          ready.
        </div>
      ) : null}

      <section className='grid gap-4 lg:grid-cols-2'>
        <article className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <CreditCard className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black tracking-[-0.02em]'>
              Current subscription
            </h2>
            {subscription?.status ? (
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-[0.2em] ${STATUS_PALETTE[subscription.status] ?? 'border-[var(--border)] bg-white/4 text-white'}`}
              >
                {STATUS_LABEL[subscription.status] ?? subscription.status}
              </span>
            ) : null}
          </div>
          <p className='mt-3 text-2xl font-black tracking-[-0.02em]'>
            {subPackage?.name ?? 'Starter trial'}
          </p>
          <p className='mt-1 text-sm muted'>
            {subPackage?.monthly_price_cents
              ? `${ZAR.format(subPackage.monthly_price_cents / 100)} per month`
              : 'Trial workspace'}
          </p>
          <dl className='mt-4 grid gap-3 text-sm'>
            {subscription?.current_period_start ? (
              <div className='flex justify-between'>
                <dt className='muted'>Period start</dt>
                <dd>
                  {new Date(
                    subscription.current_period_start,
                  ).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
            {subscription?.current_period_end ? (
              <div className='flex justify-between'>
                <dt className='muted'>Renews</dt>
                <dd>
                  {new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
            {subscription ? (
              <div className='flex justify-between'>
                <dt className='muted'>Cancellation</dt>
                <dd>
                  {subscription.cancel_at_period_end
                    ? 'Cancels at period end'
                    : 'Auto-renews'}
                </dd>
              </div>
            ) : null}
            {context.partner.trial_ends_at ? (
              <div className='flex justify-between'>
                <dt className='muted'>Trial ends</dt>
                <dd>
                  {new Date(context.partner.trial_ends_at).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
          </dl>
        </article>

        <article className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <PiggyBank className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black tracking-[-0.02em]'>
              Promotional credits
            </h2>
          </div>
          <p className='mt-3 text-3xl font-black tracking-[-0.02em]'>
            {NUM.format(credits)} credits
          </p>
          <p className='mt-1 text-sm muted'>
            Credits unlock free in-trip impressions while you trial Trip Media.
            They burn down as campaigns deliver views.
          </p>
          <ul className='mt-4 space-y-2 text-sm'>
            <li className='rounded-xl border border-[var(--border)] bg-white/4 p-3'>
              1 credit = 1 completed view in a rider trip.
            </li>
            <li className='rounded-xl border border-[var(--border)] bg-white/4 p-3'>
              Subscriptions add their monthly impression cap on top of remaining
              credits.
            </li>
            <li className='rounded-xl border border-[var(--border)] bg-white/4 p-3'>
              Need a top-up? Contact support — wallet top-ups outside
              subscriptions arrive next.
            </li>
          </ul>
        </article>
      </section>

      <section>
        <div className='flex items-center gap-3'>
          <Sparkles className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Available packages
          </h2>
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          {(packages ?? []).map((pkg) => {
            const isCurrent = subPackage?.id === pkg.id;
            return (
              <article
                key={pkg.id}
                className={`panel rounded-3xl p-6 ${isCurrent ? 'border-emerald-300/50 bg-emerald-300/8' : ''}`}
              >
                <p className='text-xs font-black uppercase tracking-[0.22em] muted'>
                  {pkg.impression_cap_monthly
                    ? `${NUM.format(pkg.impression_cap_monthly)} impressions/month`
                    : 'Custom reach'}
                </p>
                <h3 className='mt-3 text-2xl font-black'>{pkg.name}</h3>
                <p className='mt-2 min-h-12 text-sm muted'>{pkg.description}</p>
                <p className='mt-4 text-3xl font-black'>
                  {ZAR.format(pkg.monthly_price_cents / 100)}
                </p>
                <p className='mt-1 text-xs muted'>
                  {pkg.max_concurrent_campaigns} concurrent campaigns
                </p>
                {canManage ? (
                  <form action={createPayfastCheckout} className='mt-5'>
                    <input type='hidden' name='packageId' value={pkg.id} />
                    <button
                      disabled={isCurrent}
                      className='focus-ring w-full rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60'
                    >
                      {isCurrent ? 'Current package' : 'Choose package'}
                    </button>
                  </form>
                ) : (
                  <p className='mt-5 rounded-2xl border border-[var(--border)] bg-white/4 p-3 text-xs muted'>
                    Ask an owner or admin to switch packages.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <History className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Recent billing events
          </h2>
        </div>
        {events?.length ? (
          <div className='mt-4 overflow-hidden rounded-2xl border border-[var(--border)]'>
            <table className='w-full min-w-[36rem] text-left text-sm'>
              <thead className='bg-white/8 text-xs uppercase tracking-[0.18em] muted'>
                <tr>
                  <th className='px-4 py-3'>Event</th>
                  <th className='px-4 py-3'>Processed at</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className='border-t border-[var(--border)]'
                  >
                    <td className='px-4 py-3 font-semibold'>{event.type}</td>
                    <td className='px-4 py-3 muted'>
                      {new Date(event.processed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='mt-4 rounded-2xl border border-[var(--border)] bg-white/4 p-4 text-sm muted'>
            No billing events yet. Successful checkouts and renewal
            notifications will land here.
          </p>
        )}
      </section>
    </div>
  );
}
