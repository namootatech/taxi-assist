import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPartnerContext } from '@/lib/partner';
import { formatZarFromCents } from '@/lib/campaign/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CampaignActions } from '../CampaignActions';
import { CampaignTopupForm } from '../CampaignTopupForm';

export const dynamic = 'force-dynamic';

const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/campaigns/' + id);

  const supabase = await createSupabaseServerClient();
  const [{ data: campaign }, { data: payments }, { count: clickCount }, { data: views }] =
    await Promise.all([
      supabase
        .from('ad_campaigns')
        .select(
          '*, package:ad_packages(name, slug, base_price_cents, min_impressions), creative:ad_creatives(title, status)',
        )
        .eq('campaign_id', id)
        .eq('partner_id', context.partner.id)
        .maybeSingle(),
      supabase
        .from('campaign_payments')
        .select('id, amount_cents, status, payment_kind, confirmed_at, created_at')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('ad_click_events').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
      supabase
        .from('ad_views')
        .select('rating, comment, state, created_at')
        .eq('campaign_id', id)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  if (!campaign) redirect('/dashboard/campaigns');

  if (query.checkout === 'return' || query.checkout === 'topup_return') {
    const latestPayment = (payments ?? []).find((p) =>
      query.checkout === 'topup_return' ? p.payment_kind === 'topup' : p.payment_kind === 'initial',
    );
    if (latestPayment) {
      redirect(
        `/dashboard/billing?checkout=${query.checkout}&campaign=${id}&payment=${latestPayment.id}`,
      );
    }
  }

  const purchased =
    (campaign.impressions_purchased ?? campaign.max_views ?? 0) + (campaign.impressions_bonus ?? 0);
  const used = campaign.impressions_used ?? campaign.current_views ?? 0;
  const pkg = Array.isArray(campaign.package) ? campaign.package[0] : campaign.package;
  const creative = Array.isArray(campaign.creative) ? campaign.creative[0] : campaign.creative;
  const ratings = (views ?? []).filter((v) => v.rating != null);
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((acc, v) => acc + (v.rating ?? 0), 0) / ratings.length
      : null;

  return (
    <div className='mx-auto max-w-4xl space-y-8'>
      <header className='space-y-2'>
        <Link href='/dashboard/campaigns' className='text-sm text-slate-400 hover:text-white'>
          ← Back to campaigns
        </Link>
        <h1 className='text-3xl font-black tracking-tight'>{campaign.advertiser}</h1>
        <p className='text-sm text-slate-300'>
          {pkg?.name ?? '—'} · {campaign.status.replace(/_/g, ' ').toLowerCase()}
        </p>
        {query.checkout === 'cancelled' ? (
          <p className='rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100'>
            Checkout was cancelled. You can try payment again when you are ready.
          </p>
        ) : null}
        {query.error ? (
          <p className='rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-100'>
            {query.error.replace(/_/g, ' ')}
          </p>
        ) : null}
        {campaign.review_note ? (
          <p className='rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100'>
            {campaign.review_note}
          </p>
        ) : null}
      </header>

      <section className='grid gap-4 md:grid-cols-3'>
        <Stat label='Impressions purchased' value={NUM.format(purchased)} />
        <Stat label='Impressions used' value={NUM.format(used)} />
        <Stat label='Remaining' value={NUM.format(Math.max(purchased - used, 0))} />
      </section>

      <section className='grid gap-4 md:grid-cols-2'>
        <Stat label='Average rating' value={avgRating ? avgRating.toFixed(1) : '—'} />
        <Stat label='Clicks' value={String(clickCount ?? 0)} />
      </section>

      <section className='rounded-2xl border border-[var(--border)] bg-white/5 p-4 text-sm'>
        <h2 className='text-lg font-bold'>Campaign details</h2>
        <dl className='mt-4 grid gap-2'>
          <Detail label='Company' value={campaign.company_name ?? '—'} />
          <Detail label='Creative' value={creative?.title ?? '—'} />
          <Detail label='Start date' value={campaign.start_date ?? '—'} />
          <Detail label='End date' value={campaign.end_date ?? '—'} />
          <Detail label='Destination' value={campaign.destination_value ?? '—'} />
          <Detail label='Total paid' value={formatZarFromCents(campaign.total_paid_cents ?? 0)} />
          <Detail label='Payment status' value={campaign.payment_status ?? 'pending'} />
        </dl>
      </section>

      {campaign.status === 'ACTIVE' && pkg ? (
        <CampaignTopupForm campaignId={id} costPerThousand={pkg.base_price_cents} />
      ) : null}

      {(views ?? []).length > 0 ? (
        <section className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
          <h2 className='text-lg font-bold'>Recent comments</h2>
          <ul className='mt-4 space-y-3'>
            {(views ?? []).map((v, i) => (
              <li key={i} className='rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm'>
                {v.rating ? <span className='font-semibold'>{v.rating}/5 · </span> : null}
                {v.comment}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(payments ?? []).length > 0 ? (
        <section className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
          <h2 className='text-lg font-bold'>Payment history</h2>
          <ul className='mt-4 space-y-2 text-sm'>
            {(payments ?? []).map((p) => (
              <li key={p.id} className='flex justify-between border-b border-[var(--border)] py-2'>
                <span>{p.payment_kind === 'topup' ? 'Impression top-up' : 'Campaign payment'}</span>
                <span>
                  {formatZarFromCents(p.amount_cents)} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CampaignActions
        campaignId={id}
        status={campaign.status}
        paymentStatus={campaign.payment_status ?? 'pending'}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
      <p className='text-xs uppercase tracking-wide text-slate-400'>{label}</p>
      <p className='mt-2 text-2xl font-black'>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex justify-between gap-4'>
      <dt className='text-slate-400'>{label}</dt>
      <dd className='font-semibold text-right'>{value}</dd>
    </div>
  );
}
