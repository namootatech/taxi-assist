import { redirect } from 'next/navigation';
import { Activity, BarChart3, MessageSquare, MousePointerClick } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

export default async function AnalyticsPage() {
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/analytics');

  const supabase = await createSupabaseServerClient();
  const campaignIds =
    (
      await supabase.from('ad_campaigns').select('campaign_id').eq('partner_id', context.partner.id)
    ).data?.map((c) => c.campaign_id) ?? [];

  const [{ data: campaigns }, { count: clickCount }, { data: ratedViews }] = await Promise.all([
    supabase
      .from('ad_campaigns')
      .select(
        'campaign_id, advertiser, status, impressions_purchased, impressions_bonus, impressions_used, current_views, max_views, package:ad_packages(name)',
      )
      .eq('partner_id', context.partner.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ad_click_events')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', context.partner.id),
    campaignIds.length
      ? supabase
          .from('ad_views')
          .select('rating, comment, campaign_id, created_at')
          .in('campaign_id', campaignIds)
          .not('rating', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Array<{ rating: number | null; comment: string | null; campaign_id: string; created_at: string }> }),
  ]);

  const rows = campaigns ?? [];
  const purchased = rows.reduce(
    (acc, c) => acc + (c.impressions_purchased ?? c.max_views ?? 0) + (c.impressions_bonus ?? 0),
    0,
  );
  const used = rows.reduce((acc, c) => acc + (c.impressions_used ?? c.current_views ?? 0), 0);
  const remaining = Math.max(purchased - used, 0);
  const completion = purchased > 0 ? Math.min(1, used / purchased) : 0;

  const ratings = (ratedViews ?? []).filter((v) => v.rating != null);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, v) => a + (v.rating ?? 0), 0) / ratings.length : null;

  return (
    <div className='space-y-8'>
      <header>
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-red)]'>Analytics</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight'>Campaign performance</h1>
        <p className='mt-2 max-w-2xl text-sm text-slate-300'>
          Impressions delivered in rider trips, engagement, and destination clicks.
        </p>
      </header>

      <section className='grid gap-4 md:grid-cols-4'>
        <Kpi icon={Activity} label='Impressions purchased' value={NUM.format(purchased)} />
        <Kpi icon={BarChart3} label='Impressions used' value={NUM.format(used)} />
        <Kpi icon={Activity} label='Remaining' value={NUM.format(remaining)} />
        <Kpi icon={MousePointerClick} label='Clicks' value={NUM.format(clickCount ?? 0)} />
      </section>

      <section className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-slate-400'>Delivery progress</span>
          <span className='font-semibold'>{Math.round(completion * 100)}%</span>
        </div>
        <div className='mt-2 h-2 overflow-hidden rounded-full bg-white/10'>
          <div className='h-full bg-[var(--brand-red)]' style={{ width: `${completion * 100}%` }} />
        </div>
        {avgRating != null ? (
          <p className='mt-4 text-sm text-slate-300'>Average rider rating: {avgRating.toFixed(1)} / 5</p>
        ) : null}
      </section>

      <section className='overflow-hidden rounded-2xl border border-[var(--border)]'>
        <table className='w-full text-sm'>
          <thead className='border-b border-[var(--border)] bg-white/5 text-left text-xs uppercase text-slate-400'>
            <tr>
              <th className='px-4 py-3'>Campaign</th>
              <th className='px-4 py-3'>Package</th>
              <th className='px-4 py-3'>Purchased</th>
              <th className='px-4 py-3'>Used</th>
              <th className='px-4 py-3'>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const pkg = Array.isArray(c.package) ? c.package[0] : c.package;
              const p = (c.impressions_purchased ?? c.max_views ?? 0) + (c.impressions_bonus ?? 0);
              const u = c.impressions_used ?? c.current_views ?? 0;
              return (
                <tr key={c.campaign_id} className='border-b border-[var(--border)]'>
                  <td className='px-4 py-3 font-semibold'>{c.advertiser}</td>
                  <td className='px-4 py-3 text-slate-400'>{pkg?.name ?? '—'}</td>
                  <td className='px-4 py-3'>{NUM.format(p)}</td>
                  <td className='px-4 py-3'>{NUM.format(u)}</td>
                  <td className='px-4 py-3'>{NUM.format(Math.max(p - u, 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {(ratedViews ?? []).some((v) => v.comment) ? (
        <section className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
          <div className='flex items-center gap-2'>
            <MessageSquare className='h-4 w-4' />
            <h2 className='text-lg font-bold'>Recent rider comments</h2>
          </div>
          <ul className='mt-4 space-y-3 text-sm'>
            {(ratedViews ?? [])
              .filter((v) => v.comment)
              .slice(0, 10)
              .map((v, i) => (
                <li key={i} className='rounded-xl border border-[var(--border)] bg-white/5 p-3'>
                  {v.rating ? <span className='font-semibold'>{v.rating}/5 · </span> : null}
                  {v.comment}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <article className='rounded-2xl border border-[var(--border)] bg-white/5 p-4'>
      <Icon className='h-5 w-5 text-[var(--brand-red)]' />
      <p className='mt-3 text-xs uppercase tracking-wide text-slate-400'>{label}</p>
      <p className='mt-1 text-2xl font-black'>{value}</p>
    </article>
  );
}
