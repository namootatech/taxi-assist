import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canManageCampaigns } from '@/lib/permissions';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { CampaignActions } from './CampaignActions';
import { CampaignForm } from './CampaignForm';

export const dynamic = 'force-dynamic';

const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ENDED: 'Ended',
  REJECTED: 'Rejected',
};

const STATUS_PALETTE: Record<string, string> = {
  DRAFT: 'border-slate-300/40 bg-slate-300/10 text-slate-100',
  PENDING_REVIEW: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  ACTIVE: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
  PAUSED: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
  COMPLETED: 'border-purple-300/40 bg-purple-300/10 text-purple-100',
  ENDED: 'border-purple-300/40 bg-purple-300/10 text-purple-100',
  REJECTED: 'border-red-300/40 bg-red-500/10 text-red-100',
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/campaigns');
  }

  const supabase = await createClerkSupabaseServerClient();
  const [{ data: creatives }, { data: campaigns }] = await Promise.all([
    supabase
      .from('ad_creatives')
      .select('id, title, status')
      .eq('partner_id', context.partner.id)
      .in('status', ['draft', 'pending_review', 'approved'])
      .order('created_at', { ascending: false }),
    supabase
      .from('ad_campaigns')
      .select(
        'campaign_id, advertiser, status, max_views, current_views, schedule_band, start_date, end_date, created_at, review_note, creative:ad_creatives!ad_campaigns_creative_id_fkey(title, status)',
      )
      .eq('partner_id', context.partner.id)
      .order('created_at', { ascending: false }),
  ]);

  const filtered = filterStatus
    ? (campaigns ?? []).filter((c) => c.status === filterStatus)
    : (campaigns ?? []);

  const canManage = canManageCampaigns(context.member.role);
  const approvedCreatives = (creatives ?? []).filter(
    (c) => c.status === 'approved',
  );

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
            Campaigns
          </p>
          <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
            Campaign planning
          </h1>
          <p className='mt-2 max-w-2xl text-sm muted'>
            Drafts begin as DRAFT. Submit for review once your creative is
            approved. Reviewers move campaigns to ACTIVE, and you can pause,
            resume, or end them any time.
          </p>
        </div>
      </header>

      <section className='grid gap-6 lg:grid-cols-[0.85fr_1.15fr]'>
        <div className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <BarChart3 className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black tracking-[-0.02em]'>
              New campaign draft
            </h2>
          </div>
          {canManage ? (
            <div className='mt-4'>
              <CampaignForm
                creatives={
                  approvedCreatives.length > 0
                    ? approvedCreatives
                    : (creatives ?? [])
                }
              />
              {approvedCreatives.length === 0 &&
              (creatives ?? []).length > 0 ? (
                <p className='mt-3 text-xs muted'>
                  Drafts can only be submitted for review once a creative is
                  approved. Submit a creative for review first.
                </p>
              ) : null}
            </div>
          ) : (
            <p className='mt-4 rounded-2xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100'>
              Viewers cannot create campaigns. Ask an owner, admin, or operator
              on your team.
            </p>
          )}
        </div>

        <div className='space-y-4'>
          {filtered.length === 0 ? (
            <div className='panel rounded-3xl p-6'>
              <h2 className='text-2xl font-black'>
                {filterStatus
                  ? `No campaigns in ${STATUS_LABEL[filterStatus] ?? filterStatus}`
                  : 'No campaigns yet'}
              </h2>
              <p className='mt-2 text-sm muted'>
                {filterStatus
                  ? 'Try a different filter.'
                  : 'Plan your first campaign once a creative is uploaded.'}
              </p>
            </div>
          ) : (
            filtered.map((campaign) => {
              const cap = campaign.max_views ?? 0;
              const delivered = campaign.current_views ?? 0;
              const pct = cap > 0 ? Math.min(1, delivered / cap) : 0;
              const creative = Array.isArray(campaign.creative)
                ? campaign.creative[0]
                : campaign.creative;
              return (
                <article
                  key={campaign.campaign_id}
                  className='panel rounded-2xl p-5'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${STATUS_PALETTE[campaign.status] ?? 'border-[var(--border)] bg-white/4 text-white'}`}
                        >
                          {STATUS_LABEL[campaign.status] ?? campaign.status}
                        </span>
                        <span className='rounded-full border border-[var(--border)] bg-white/4 px-2 py-0.5 text-[11px] font-semibold capitalize text-white/85'>
                          {campaign.schedule_band?.replace('_', ' ') ?? 'all'}
                        </span>
                      </div>
                      <h3 className='mt-3 text-xl font-black tracking-[-0.02em]'>
                        {campaign.advertiser}
                      </h3>
                      <p className='mt-1 text-xs muted'>
                        Creative: {creative?.title ?? 'Removed'} (
                        {creative?.status ?? 'unknown'})
                      </p>
                      <p className='mt-1 text-xs muted'>
                        {campaign.start_date
                          ? `Starts ${campaign.start_date}`
                          : 'Open-ended'}{' '}
                        ·{' '}
                        {campaign.end_date
                          ? `Ends ${campaign.end_date}`
                          : 'No end date'}
                      </p>
                      {campaign.review_note ? (
                        <p className='mt-3 rounded-xl border border-red-300/40 bg-red-500/10 p-3 text-xs text-red-100'>
                          {campaign.review_note}
                        </p>
                      ) : null}
                    </div>
                    <CampaignActions
                      campaignId={campaign.campaign_id}
                      status={campaign.status}
                      canManage={canManage}
                    />
                  </div>

                  <div className='mt-4'>
                    <div className='h-2 overflow-hidden rounded-full bg-white/10'>
                      <div
                        className='h-full rounded-full bg-[var(--brand-red)]'
                        style={{ width: `${(pct * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <p className='mt-2 text-xs muted'>
                      {NUM.format(delivered)} of{' '}
                      {cap > 0 ? NUM.format(cap) : '∞'} views
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
