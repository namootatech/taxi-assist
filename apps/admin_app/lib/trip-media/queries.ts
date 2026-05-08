import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export interface TripMediaOverview {
  pendingCreativesCount: number;
  flaggedCreativesCount: number;
  activeCampaignsCount: number;
  pendingCampaignsCount: number;
  activePartnersCount: number;
  viewsLast24h: number;
  completionRateLast24hPct: number;
  rewardSpendLast24h: number;
  openFraudSignalsCount: number;
  highPriorityFraudCount: number;
}

const emptyOverview: TripMediaOverview = {
  pendingCreativesCount: 0,
  flaggedCreativesCount: 0,
  activeCampaignsCount: 0,
  pendingCampaignsCount: 0,
  activePartnersCount: 0,
  viewsLast24h: 0,
  completionRateLast24hPct: 0,
  rewardSpendLast24h: 0,
  openFraudSignalsCount: 0,
  highPriorityFraudCount: 0,
};

interface OverviewRow {
  pending_creatives_count: number | null;
  flagged_creatives_count: number | null;
  active_campaigns_count: number | null;
  pending_campaigns_count: number | null;
  active_partners_count: number | null;
  views_last_24h: number | null;
  completion_rate_last_24h_pct: number | null;
  reward_spend_last_24h: number | string | null;
  open_fraud_signals_count: number | null;
  high_priority_fraud_count: number | null;
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export async function loadTripMediaOverview(): Promise<TripMediaOverview> {
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase
    .from('vw_trip_media_overview')
    .select('*')
    .limit(1)
    .maybeSingle<OverviewRow>();

  if (error || !data) return emptyOverview;

  return {
    pendingCreativesCount: toNumber(data.pending_creatives_count),
    flaggedCreativesCount: toNumber(data.flagged_creatives_count),
    activeCampaignsCount: toNumber(data.active_campaigns_count),
    pendingCampaignsCount: toNumber(data.pending_campaigns_count),
    activePartnersCount: toNumber(data.active_partners_count),
    viewsLast24h: toNumber(data.views_last_24h),
    completionRateLast24hPct: toNumber(data.completion_rate_last_24h_pct),
    rewardSpendLast24h: toNumber(data.reward_spend_last_24h),
    openFraudSignalsCount: toNumber(data.open_fraud_signals_count),
    highPriorityFraudCount: toNumber(data.high_priority_fraud_count),
  };
}

export interface TopCampaignRow {
  campaignId: string;
  advertiser: string;
  status: string;
  views: number;
  maxViews: number | null;
  rewardPerView: number;
  partnerName: string | null;
}

export async function loadTopCampaigns(
  limit = 10,
): Promise<Array<TopCampaignRow>> {
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from('ad_campaigns')
    .select(
      'campaign_id, advertiser, status, current_views, max_views, reward_per_view, media_partners:partner_id(name)',
    )
    .order('current_views', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const partner = Array.isArray(row.media_partners)
      ? row.media_partners[0]
      : row.media_partners;
    return {
      campaignId: row.campaign_id as string,
      advertiser: row.advertiser as string,
      status: row.status as string,
      views: Number(row.current_views ?? 0),
      maxViews: row.max_views as number | null,
      rewardPerView: toNumber(row.reward_per_view as number | string | null),
      partnerName: (partner?.name as string | null) ?? null,
    };
  });
}

export interface RecentAdminAction {
  id: number;
  action: string;
  actorRole: string | null;
  entityType: string | null;
  reason: string | null;
  createdAt: string;
}

export async function loadRecentTripMediaActions(
  limit = 8,
): Promise<Array<RecentAdminAction>> {
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('audit_id, action, actor_role, entity_type, reason, created_at')
    .or(
      [
        'action.like.creative.%',
        'action.like.campaign.%',
        'action.like.reward.%',
        'action.like.fraud.%',
        'action.like.partner.%',
        'action.like.report.%',
      ].join(','),
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.audit_id as number,
    action: row.action as string,
    actorRole: row.actor_role as string | null,
    entityType: row.entity_type as string | null,
    reason: row.reason as string | null,
    createdAt: row.created_at as string,
  }));
}
