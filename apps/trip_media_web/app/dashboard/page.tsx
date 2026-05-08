import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock,
  CreditCard,
  FileVideo,
  PiggyBank,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import {
  canInviteMembers,
  canManageBilling,
  canManageCampaigns,
  canManageCreatives,
} from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ZAR = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

interface CampaignRow {
  campaign_id: string;
  advertiser: string;
  status: string;
  current_views: number | null;
  max_views: number | null;
  schedule_band: string | null;
  start_date: string | null;
  end_date: string | null;
}

const ACTIVE_STATUSES = ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DRAFT'];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard');
  }

  const supabase = await createSupabaseServerClient();

  const [campaignsResult, creativesResult, subscriptionResult] =
    await Promise.all([
      supabase
        .from('ad_campaigns')
        .select(
          'campaign_id, advertiser, status, current_views, max_views, schedule_band, start_date, end_date, created_at',
        )
        .eq('partner_id', context.partner.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ad_creatives')
        .select('id, status, title')
        .eq('partner_id', context.partner.id),
      supabase
        .from('partner_subscriptions')
        .select(
          'status, current_period_end, cancel_at_period_end, package:ad_packages(name, monthly_price_cents)',
        )
        .eq('partner_id', context.partner.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const campaigns: Array<CampaignRow> = campaignsResult.data ?? [];
  const creatives = creativesResult.data ?? [];
  const subscription = subscriptionResult.data;
  const subPackage = Array.isArray(subscription?.package)
    ? subscription?.package[0]
    : subscription?.package;

  const activeCampaigns = campaigns.filter((c) =>
    ACTIVE_STATUSES.includes(c.status),
  );
  const totalDelivered = campaigns.reduce(
    (acc, c) => acc + (c.current_views ?? 0),
    0,
  );
  const totalCap = campaigns.reduce((acc, c) => acc + (c.max_views ?? 0), 0);
  const completionRate =
    totalCap > 0 ? Math.min(1, totalDelivered / totalCap) : 0;
  const monthlyPrice = subPackage?.monthly_price_cents ?? 0;
  const pendingReviews = creatives.filter(
    (c) => c.status === 'pending_review',
  ).length;
  const rejectedCreatives = creatives.filter((c) => c.status === 'rejected');
  const credits = context.partner.promotional_credits_balance;

  const trialEndDays = context.partner.trial_ends_at
    ? Math.ceil(
        (new Date(context.partner.trial_ends_at).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  const alerts: Array<{
    kind: 'warning' | 'info' | 'error';
    title: string;
    body: string;
    href?: string;
  }> = [];
  if (subscription?.status === 'past_due') {
    alerts.push({
      kind: 'error',
      title: 'Subscription past due',
      body: 'Your payment is overdue. Campaigns will auto-pause until billing is up to date.',
      href: '/dashboard/billing',
    });
  }
  if (
    trialEndDays !== null &&
    trialEndDays <= 3 &&
    trialEndDays >= 0 &&
    (subscription?.status === 'trialing' || !subscription)
  ) {
    alerts.push({
      kind: 'warning',
      title: `Trial ends in ${trialEndDays} ${trialEndDays === 1 ? 'day' : 'days'}`,
      body: 'Choose a package to keep campaigns running once the trial ends.',
      href: '/dashboard/billing',
    });
  }
  if (credits > 0 && credits < 500) {
    alerts.push({
      kind: 'warning',
      title: 'Promotional credits running low',
      body: `Only ${NUM.format(credits)} credits remain. Add a package to keep campaigns delivering.`,
      href: '/dashboard/billing',
    });
  }
  if (rejectedCreatives.length > 0) {
    alerts.push({
      kind: 'warning',
      title: `${rejectedCreatives.length} creative${rejectedCreatives.length === 1 ? '' : 's'} need attention`,
      body: 'A reviewer flagged changes. Replace the asset and resubmit.',
      href: '/dashboard/creatives',
    });
  }
  if (pendingReviews > 0) {
    alerts.push({
      kind: 'info',
      title: `${pendingReviews} creative${pendingReviews === 1 ? '' : 's'} in review`,
      body: "We'll notify you here when the reviewer approves them.",
      href: '/dashboard/creatives',
    });
  }

  const role = context.member.role;
  const quickActions = [
    canManageCreatives(role) && {
      href: '/dashboard/creatives',
      icon: FileVideo,
      title: 'Upload creative',
      body: 'Add a video or image and submit it for review.',
    },
    canManageCampaigns(role) && {
      href: '/dashboard/campaigns',
      icon: BarChart3,
      title: 'Plan a campaign',
      body: 'Pick a creative, schedule, and reach.',
    },
    canManageBilling(role) && {
      href: '/dashboard/billing',
      icon: CreditCard,
      title: 'Manage billing',
      body: 'Pick a package or top up your credits.',
    },
    canInviteMembers(role) && {
      href: '/dashboard/team',
      icon: Users,
      title: 'Invite the team',
      body: 'Share access by role with shareable links.',
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof BarChart3;
    title: string;
    body: string;
  }>;

  return (
    <div className='space-y-8'>
      {welcome ? (
        <div className='rounded-3xl border border-emerald-300/40 bg-emerald-300/10 p-4 text-sm text-emerald-100'>
          {welcome === 'invite'
            ? 'You’re in. Welcome to the workspace.'
            : 'Workspace ready. Add creatives, choose a package, and prepare your first campaign.'}
        </div>
      ) : null}

      <header className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
            Dashboard
          </p>
          <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
            {context.partner.name}
          </h1>
          <p className='mt-2 text-sm muted'>
            {subPackage?.name ? `${subPackage.name} package` : 'Starter trial'}{' '}
            · subscription{' '}
            <span className='font-semibold text-white/90'>
              {subscription?.status ?? 'trialing'}
            </span>
          </p>
        </div>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <Stat
          icon={<TrendingUp className='size-5 text-red-200' aria-hidden />}
          label='Completed views'
          value={NUM.format(totalDelivered)}
          hint={
            totalCap > 0
              ? `${(completionRate * 100).toFixed(0)}% of plan`
              : 'No cap configured'
          }
        />
        <Stat
          icon={<BarChart3 className='size-5 text-red-200' aria-hidden />}
          label='Active campaigns'
          value={NUM.format(activeCampaigns.length)}
          hint={
            campaigns.length === activeCampaigns.length
              ? 'All in flight'
              : `${campaigns.length} total`
          }
        />
        <Stat
          icon={<CreditCard className='size-5 text-red-200' aria-hidden />}
          label='Monthly spend'
          value={ZAR.format(monthlyPrice / 100)}
          hint={
            subscription
              ? `Renews ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'n/a'}`
              : 'Trial'
          }
        />
        <Stat
          icon={<PiggyBank className='size-5 text-red-200' aria-hidden />}
          label='Promotional credits'
          value={NUM.format(credits)}
          hint='Burns down as ads complete.'
        />
      </section>

      {alerts.length > 0 ? (
        <section className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <AlertCircle className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black tracking-[-0.02em]'>Alerts</h2>
          </div>
          <ul className='mt-4 space-y-3'>
            {alerts.map((alert, index) => {
              const palette =
                alert.kind === 'error'
                  ? 'border-red-400/40 bg-red-500/10 text-red-100'
                  : alert.kind === 'warning'
                    ? 'border-amber-400/40 bg-amber-300/10 text-amber-100'
                    : 'border-sky-400/40 bg-sky-300/10 text-sky-100';
              return (
                <li
                  key={`${alert.title}-${index}`}
                  className={`flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${palette}`}
                >
                  <div>
                    <p className='font-bold'>{alert.title}</p>
                    <p className='mt-1 text-sm opacity-90'>{alert.body}</p>
                  </div>
                  {alert.href ? (
                    <Link
                      href={alert.href}
                      className='focus-ring inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-xs font-bold'
                    >
                      Go <ArrowRight className='size-3' aria-hidden />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <Clock className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Live campaign activity
          </h2>
        </div>
        {activeCampaigns.length > 0 ? (
          <ul className='mt-4 grid gap-3'>
            {activeCampaigns.slice(0, 5).map((campaign) => {
              const cap = campaign.max_views ?? 0;
              const delivered = campaign.current_views ?? 0;
              const pct = cap > 0 ? Math.min(1, delivered / cap) : 0;
              return (
                <li
                  key={campaign.campaign_id}
                  className='rounded-2xl border border-[var(--border)] bg-white/4 p-4'
                >
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-xs font-black uppercase tracking-[0.22em] muted'>
                        {campaign.schedule_band ?? 'all'}
                      </p>
                      <p className='mt-1 text-base font-bold'>
                        {campaign.advertiser}
                      </p>
                    </div>
                    <span className='rounded-full border border-[var(--border)] bg-white/8 px-3 py-1 text-xs font-bold'>
                      {campaign.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                  <div className='mt-3 h-2 overflow-hidden rounded-full bg-white/10'>
                    <div
                      className='h-full rounded-full bg-[var(--brand-red)]'
                      style={{ width: `${(pct * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className='mt-2 text-xs muted'>
                    {NUM.format(delivered)} of {cap > 0 ? NUM.format(cap) : '∞'}{' '}
                    views
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className='mt-4 rounded-2xl border border-[var(--border)] bg-white/4 p-4 text-sm muted'>
            No campaigns are running yet. Plan one in the Campaigns tab.
          </p>
        )}
      </section>

      {quickActions.length > 0 ? (
        <section>
          <h2 className='text-sm font-black uppercase tracking-[0.22em] muted'>
            Quick actions
          </h2>
          <div className='mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className='group focus-ring flex min-h-32 flex-col justify-between rounded-3xl border border-red-300/40 bg-[var(--brand-red)] p-5 text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5'
                >
                  <span className='grid size-10 place-items-center rounded-2xl bg-white text-[var(--brand-red)]'>
                    <Icon className='size-5' aria-hidden />
                  </span>
                  <span>
                    <span className='block text-lg font-black tracking-[-0.02em]'>
                      {action.title}
                    </span>
                    <span className='mt-1 block text-sm opacity-90'>
                      {action.body}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
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
