import { redirect } from 'next/navigation';
import { Activity, BarChart3, Clock4, FileVideo } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

const SCHEDULE_LABEL: Record<string, string> = {
  peak: 'Peak hours',
  off_peak: 'Off-peak',
  all_day: 'All day',
  night: 'Night',
  all: 'Any time',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ENDED: 'Ended',
  REJECTED: 'Rejected',
};

interface CreativeStat {
  id: string;
  title: string;
  delivered: number;
  campaignCount: number;
}

interface ScheduleStat {
  band: string;
  delivered: number;
  campaigns: number;
}

export default async function AnalyticsPage() {
  const context = await getPartnerContext();
  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/analytics');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: campaigns }, { data: creatives }] = await Promise.all([
    supabase
      .from('ad_campaigns')
      .select(
        'campaign_id, advertiser, status, current_views, max_views, schedule_band, start_date, end_date, creative_id',
      )
      .eq('partner_id', context.partner.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ad_creatives')
      .select('id, title, status')
      .eq('partner_id', context.partner.id),
  ]);

  const totalDelivered = (campaigns ?? []).reduce(
    (acc, c) => acc + (c.current_views ?? 0),
    0,
  );
  const totalCap = (campaigns ?? []).reduce(
    (acc, c) => acc + (c.max_views ?? 0),
    0,
  );
  const overallCompletion =
    totalCap > 0 ? Math.min(1, totalDelivered / totalCap) : 0;

  const creativeStats: Map<string, CreativeStat> = new Map();
  for (const creative of creatives ?? []) {
    creativeStats.set(creative.id, {
      id: creative.id,
      title: creative.title,
      delivered: 0,
      campaignCount: 0,
    });
  }

  const scheduleStats: Map<string, ScheduleStat> = new Map();
  for (const campaign of campaigns ?? []) {
    if (campaign.creative_id && creativeStats.has(campaign.creative_id)) {
      const stat = creativeStats.get(campaign.creative_id)!;
      stat.delivered += campaign.current_views ?? 0;
      stat.campaignCount += 1;
    }
    const band = campaign.schedule_band ?? 'all';
    const existing = scheduleStats.get(band) ?? {
      band,
      delivered: 0,
      campaigns: 0,
    };
    existing.delivered += campaign.current_views ?? 0;
    existing.campaigns += 1;
    scheduleStats.set(band, existing);
  }

  const sortedCreatives = Array.from(creativeStats.values()).sort(
    (a, b) => b.delivered - a.delivered,
  );
  const sortedSchedules = Array.from(scheduleStats.values()).sort(
    (a, b) => b.delivered - a.delivered,
  );

  return (
    <div className='space-y-8'>
      <header>
        <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
          Analytics
        </p>
        <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
          Performance
        </h1>
        <p className='mt-2 max-w-2xl text-sm muted'>
          We surface the metrics we trust today: delivered views per campaign,
          creative coverage, and schedule mix. Detailed engagement (rating,
          completion seconds, geo-lift) becomes available once rider impression
          events flow through this workspace.
        </p>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        <Stat
          icon={<Activity className='size-5 text-red-200' aria-hidden />}
          label='Views delivered'
          value={NUM.format(totalDelivered)}
          hint={
            totalCap > 0
              ? `${(overallCompletion * 100).toFixed(0)}% of plan`
              : 'No cap configured'
          }
        />
        <Stat
          icon={<BarChart3 className='size-5 text-red-200' aria-hidden />}
          label='Campaigns running'
          value={NUM.format(
            (campaigns ?? []).filter((c) => c.status === 'ACTIVE').length,
          )}
          hint={`${campaigns?.length ?? 0} total campaigns`}
        />
        <Stat
          icon={<Clock4 className='size-5 text-red-200' aria-hidden />}
          label='Schedule bands used'
          value={NUM.format(sortedSchedules.length)}
          hint={
            sortedSchedules[0]
              ? `Top: ${SCHEDULE_LABEL[sortedSchedules[0].band] ?? sortedSchedules[0].band}`
              : '—'
          }
        />
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <BarChart3 className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Campaign performance
          </h2>
        </div>
        <div className='mt-4 overflow-hidden rounded-2xl border border-[var(--border)]'>
          <table className='w-full min-w-[40rem] text-left text-sm'>
            <thead className='bg-white/8 text-xs uppercase tracking-[0.18em] muted'>
              <tr>
                <th className='px-4 py-3'>Campaign</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>Delivered</th>
                <th className='px-4 py-3'>Plan</th>
                <th className='px-4 py-3'>Completion</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-4 py-6 text-center text-sm muted'
                  >
                    No campaigns yet — performance will populate once you start
                    running ads.
                  </td>
                </tr>
              ) : (
                (campaigns ?? []).map((campaign) => {
                  const cap = campaign.max_views ?? 0;
                  const delivered = campaign.current_views ?? 0;
                  const pct = cap > 0 ? Math.min(1, delivered / cap) : 0;
                  return (
                    <tr
                      key={campaign.campaign_id}
                      className='border-t border-[var(--border)]'
                    >
                      <td className='px-4 py-3'>
                        <p className='font-semibold'>{campaign.advertiser}</p>
                        <p className='text-xs muted'>
                          {SCHEDULE_LABEL[campaign.schedule_band ?? 'all'] ??
                            campaign.schedule_band}
                        </p>
                      </td>
                      <td className='px-4 py-3'>
                        {STATUS_LABEL[campaign.status] ?? campaign.status}
                      </td>
                      <td className='px-4 py-3'>{NUM.format(delivered)}</td>
                      <td className='px-4 py-3'>
                        {cap > 0 ? NUM.format(cap) : '∞'}
                      </td>
                      <td className='px-4 py-3'>
                        {cap > 0 ? `${(pct * 100).toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <FileVideo className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Creative coverage
          </h2>
        </div>
        <div className='mt-4 overflow-hidden rounded-2xl border border-[var(--border)]'>
          <table className='w-full min-w-[36rem] text-left text-sm'>
            <thead className='bg-white/8 text-xs uppercase tracking-[0.18em] muted'>
              <tr>
                <th className='px-4 py-3'>Creative</th>
                <th className='px-4 py-3'>Linked campaigns</th>
                <th className='px-4 py-3'>Total delivered views</th>
              </tr>
            </thead>
            <tbody>
              {sortedCreatives.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className='px-4 py-6 text-center text-sm muted'
                  >
                    Upload a creative to see how it performs across your
                    campaigns.
                  </td>
                </tr>
              ) : (
                sortedCreatives.map((creative) => (
                  <tr
                    key={creative.id}
                    className='border-t border-[var(--border)]'
                  >
                    <td className='px-4 py-3 font-semibold'>
                      {creative.title}
                    </td>
                    <td className='px-4 py-3'>
                      {NUM.format(creative.campaignCount)}
                    </td>
                    <td className='px-4 py-3'>
                      {NUM.format(creative.delivered)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <Clock4 className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Delivery by schedule band
          </h2>
        </div>
        <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {sortedSchedules.length === 0 ? (
            <p className='text-sm muted'>
              Schedule mix will appear once campaigns deliver views.
            </p>
          ) : (
            sortedSchedules.map((stat) => (
              <article
                key={stat.band}
                className='rounded-2xl border border-[var(--border)] bg-white/4 p-4'
              >
                <p className='text-xs font-black uppercase tracking-[0.22em] muted'>
                  {SCHEDULE_LABEL[stat.band] ?? stat.band}
                </p>
                <p className='mt-2 text-2xl font-black'>
                  {NUM.format(stat.delivered)}
                </p>
                <p className='mt-1 text-xs muted'>
                  {stat.campaigns} campaign{stat.campaigns === 1 ? '' : 's'}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className='rounded-3xl border border-amber-300/30 bg-amber-300/8 p-6 text-sm text-amber-100'>
        <p className='font-bold'>Detailed engagement analytics arrive next.</p>
        <p className='mt-1 opacity-90'>
          Per-rider impressions, audio retention, and geo-lift land here once
          the rider app starts publishing impression events to Trip Media. Until
          then we keep these numbers honest and show only what we can prove.
        </p>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className='panel rounded-3xl p-5'>
      <div className='flex items-center gap-2'>
        {icon}
        <p className='text-xs font-black uppercase tracking-[0.22em] muted'>
          {label}
        </p>
      </div>
      <p className='mt-3 text-3xl font-black tracking-[-0.02em]'>{value}</p>
      <p className='mt-1 text-xs muted'>{hint}</p>
    </div>
  );
}
