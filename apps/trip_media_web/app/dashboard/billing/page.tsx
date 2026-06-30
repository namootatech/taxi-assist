import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreditCard, History, PiggyBank } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { formatZarFromCents } from '@/lib/campaign/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/billing');

  const supabase = await createSupabaseServerClient();
  const [{ data: payments }, { data: events }, { data: promo }] = await Promise.all([
    supabase
      .from('campaign_payments')
      .select('id, amount_cents, status, payment_kind, confirmed_at, created_at, campaign:ad_campaigns(advertiser)')
      .eq('partner_id', context.partner.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('partner_billing_events')
      .select('id, type, processed_at')
      .eq('partner_id', context.partner.id)
      .order('processed_at', { ascending: false })
      .limit(20),
    supabase
      .from('platform_promotions')
      .select('discount_pct, bonus_impressions, start_at, end_at')
      .eq('slug', 'prelaunch_gauteng')
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const now = Date.now();
  const prelaunchActive =
    promo &&
    new Date(promo.start_at).getTime() <= now &&
    new Date(promo.end_at).getTime() > now;

  const credits = context.partner.impression_credits_balance ?? 0;

  return (
    <div className='space-y-8'>
      <header>
        <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>Billing</p>
        <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>Payments & credits</h1>
        <p className='mt-2 max-w-2xl text-sm text-slate-300'>
          Campaign payments are collected at checkout when you create or top up a campaign. Payfast handles all transactions in ZAR.
        </p>
      </header>

      {prelaunchActive ? (
        <div className='rounded-3xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm text-emerald-100'>
          Prelaunch offer: {promo.discount_pct}% off campaign packages
          {!context.partner.prelaunch_bonus_claimed
            ? ` plus ${promo.bonus_impressions.toLocaleString()} bonus impressions on your first paid campaign`
            : ''}.
        </div>
      ) : null}

      <section className='grid gap-4 lg:grid-cols-2'>
        <article className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <PiggyBank className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black'>Impression credits</h2>
          </div>
          <p className='mt-3 text-3xl font-black'>{credits.toLocaleString()}</p>
          <p className='mt-1 text-sm text-slate-400'>
            Carry-over impressions from cancelled campaigns. Use them on your next campaign (minimum 1,000 impressions to go live).
          </p>
        </article>

        <article className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <CreditCard className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black'>Pay for campaigns</h2>
          </div>
          <p className='mt-3 text-sm text-slate-300'>
            Choose Basic, Essential, or Premium when creating a campaign. Payment happens before admin review.
          </p>
          <Link
            href='/dashboard/campaigns/new'
            className='focus-ring mt-4 inline-flex rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white'
          >
            Create campaign
          </Link>
        </article>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <History className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black'>Campaign payments</h2>
        </div>
        {(payments ?? []).length ? (
          <table className='mt-4 w-full text-sm'>
            <thead>
              <tr className='border-b border-[var(--border)] text-left text-xs uppercase text-slate-400'>
                <th className='py-3'>Campaign</th>
                <th className='py-3'>Type</th>
                <th className='py-3'>Amount</th>
                <th className='py-3'>Status</th>
                <th className='py-3'>Date</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => {
                const campaign = Array.isArray(p.campaign) ? p.campaign[0] : p.campaign;
                return (
                  <tr key={p.id} className='border-b border-[var(--border)]'>
                    <td className='py-3'>{campaign?.advertiser ?? '—'}</td>
                    <td className='py-3 capitalize'>{p.payment_kind}</td>
                    <td className='py-3'>{formatZarFromCents(p.amount_cents)}</td>
                    <td className='py-3 capitalize'>{p.status}</td>
                    <td className='py-3 text-slate-400'>
                      {new Date(p.confirmed_at ?? p.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className='mt-4 text-sm text-slate-400'>No campaign payments yet.</p>
        )}
      </section>

      {(events ?? []).length ? (
        <section className='panel rounded-3xl p-6'>
          <h2 className='text-lg font-black'>Payfast events</h2>
          <ul className='mt-4 space-y-2 text-sm'>
            {(events ?? []).map((e) => (
              <li key={e.id} className='flex justify-between border-b border-[var(--border)] py-2'>
                <span>{e.type}</span>
                <span className='text-slate-400'>{new Date(e.processed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
