import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canManageCampaigns } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CampaignActions } from './CampaignActions';

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
  CANCELLED: 'Cancelled',
  CANCELLATION_PENDING: 'Cancellation pending',
};

const STATUS_PALETTE: Record<string, string> = {
  DRAFT: 'border-slate-300/40 bg-slate-300/10 text-slate-100',
  PENDING_REVIEW: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  ACTIVE: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
  PAUSED: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
  COMPLETED: 'border-purple-300/40 bg-purple-300/10 text-purple-100',
  ENDED: 'border-purple-300/40 bg-purple-300/10 text-purple-100',
  REJECTED: 'border-red-300/40 bg-red-500/10 text-red-100',
  CANCELLED: 'border-red-300/40 bg-red-500/10 text-red-100',
  CANCELLATION_PENDING: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
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

  const supabase = await createSupabaseServerClient();
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select(
      'campaign_id, advertiser, status, impressions_purchased, impressions_bonus, impressions_used, max_views, current_views, payment_status, start_date, end_date, created_at, review_note, package:ad_packages(name, slug)',
    )
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false });

  const filtered = filterStatus
    ? (campaigns ?? []).filter((c) => c.status === filterStatus)
    : campaigns ?? [];

  const canManage = canManageCampaigns(context.member.role);

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-red)]'>
            Campaigns
          </p>
          <h1 className='mt-2 text-3xl font-black tracking-tight'>Your campaigns</h1>
          <p className='mt-2 max-w-2xl text-sm text-slate-300'>
            Create a campaign, pay for impressions, and submit for Trip review before go-live.
          </p>
        </div>
        {canManage ? (
          <Link
            href='/dashboard/campaigns/new'
            className='focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white'
          >
            <Plus className='h-4 w-4' /> New campaign
          </Link>
        ) : null}
      </header>

      <div className='overflow-hidden rounded-2xl border border-[var(--border)]'>
        <table className='w-full text-sm'>
          <thead className='border-b border-[var(--border)] bg-white/5 text-left'>
            <tr>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400'>Campaign</th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400'>Status</th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400'>Impressions</th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400'>Payment</th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((campaign) => {
              const purchased =
                (campaign.impressions_purchased ?? campaign.max_views ?? 0) +
                (campaign.impressions_bonus ?? 0);
              const used = campaign.impressions_used ?? campaign.current_views ?? 0;
              const pkg = Array.isArray(campaign.package) ? campaign.package[0] : campaign.package;
              const palette = STATUS_PALETTE[campaign.status] ?? STATUS_PALETTE.DRAFT;
              return (
                <tr key={campaign.campaign_id} className='border-b border-[var(--border)] hover:bg-white/5'>
                  <td className='px-4 py-4 align-top'>
                    <Link href={`/dashboard/campaigns/${campaign.campaign_id}`} className='font-semibold hover:text-[var(--brand-red)]'>
                      {campaign.advertiser}
                    </Link>
                    <div className='mt-1 text-xs text-slate-400'>{pkg?.name ?? '—'}</div>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${palette}`}>
                      {STATUS_LABEL[campaign.status] ?? campaign.status}
                    </span>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    {NUM.format(used)} / {NUM.format(purchased)}
                    <div className='mt-1 text-xs text-slate-400'>{NUM.format(Math.max(purchased - used, 0))} remaining</div>
                  </td>
                  <td className='px-4 py-4 align-top capitalize'>{campaign.payment_status ?? 'pending'}</td>
                  <td className='px-4 py-4 align-top'>
                    {canManage ? (
                      <CampaignActions campaignId={campaign.campaign_id} status={campaign.status} paymentStatus={campaign.payment_status ?? 'pending'} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className='px-4 py-12 text-center text-sm text-slate-400'>
                  No campaigns yet. Create your first campaign to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
