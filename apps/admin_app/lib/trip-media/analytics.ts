import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface DailyTrendRow {
  day: string;
  views: number;
  credited: number;
  rejected: number;
  rewardSpend: number;
}

export interface HourlyRow {
  hour: number;
  views: number;
}

export interface CampaignSpendRow {
  campaignId: string;
  advertiser: string;
  partnerName: string | null;
  views: number;
  rewardSpend: number;
}

export interface CompletionDistributionRow {
  state: string;
  count: number;
}

export interface AnalyticsBundle {
  dailyTrends: Array<DailyTrendRow>;
  peakHours: Array<HourlyRow>;
  topCampaigns: Array<CampaignSpendRow>;
  completionDistribution: Array<CompletionDistributionRow>;
  averageRewardCost: number;
}

interface AdViewRow {
  state: string | null;
  created_at: string;
  campaign_id: string;
  ad_campaigns:
    | {
        advertiser: string | null;
        reward_per_view: number | string | null;
        partner_id: string | null;
        media_partners: { name: string } | Array<{ name: string }> | null;
      }
    | Array<{
        advertiser: string | null;
        reward_per_view: number | string | null;
        partner_id: string | null;
        media_partners: { name: string } | Array<{ name: string }> | null;
      }>
    | null;
}

const toNumber = (v: number | string | null | undefined) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toDayKey = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export async function loadAnalyticsBundle(
  daysWindow = 14,
): Promise<AnalyticsBundle> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(
    Date.now() - daysWindow * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from('ad_views')
    .select(
      'state, created_at, campaign_id, ad_campaigns:campaign_id(advertiser, reward_per_view, partner_id, media_partners:partner_id(name))',
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  const rows = (data as Array<AdViewRow> | null) ?? [];

  const trendsMap = new Map<string, DailyTrendRow>();
  const hourMap = new Map<number, number>();
  const completionMap = new Map<string, number>();
  const campaignMap = new Map<string, CampaignSpendRow>();
  let totalCredited = 0;
  let totalRewardSpend = 0;

  for (const row of rows) {
    const day = toDayKey(row.created_at);
    if (!day) continue;

    const campaign = Array.isArray(row.ad_campaigns)
      ? row.ad_campaigns[0]
      : row.ad_campaigns;
    const partner = campaign
      ? Array.isArray(campaign.media_partners)
        ? campaign.media_partners[0]
        : campaign.media_partners
      : null;
    const reward = toNumber(campaign?.reward_per_view ?? null);

    const trend = trendsMap.get(day) ?? {
      day,
      views: 0,
      credited: 0,
      rejected: 0,
      rewardSpend: 0,
    };
    trend.views += 1;
    if (row.state === 'CREDITED') {
      trend.credited += 1;
      trend.rewardSpend += reward;
      totalCredited += 1;
      totalRewardSpend += reward;
    } else if (row.state === 'REJECTED') {
      trend.rejected += 1;
    }
    trendsMap.set(day, trend);

    const hour = new Date(row.created_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);

    const stateKey = row.state ?? 'UNKNOWN';
    completionMap.set(stateKey, (completionMap.get(stateKey) ?? 0) + 1);

    const campaignAggKey = row.campaign_id;
    const campaignAgg =
      campaignMap.get(campaignAggKey) ??
      ({
        campaignId: row.campaign_id,
        advertiser: campaign?.advertiser ?? '—',
        partnerName: partner?.name ?? null,
        views: 0,
        rewardSpend: 0,
      } as CampaignSpendRow);
    campaignAgg.views += 1;
    if (row.state === 'CREDITED') campaignAgg.rewardSpend += reward;
    campaignMap.set(campaignAggKey, campaignAgg);
  }

  const dailyTrends = Array.from(trendsMap.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );
  const peakHours: Array<HourlyRow> = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    views: hourMap.get(hour) ?? 0,
  }));
  const completionDistribution: Array<CompletionDistributionRow> = Array.from(
    completionMap.entries(),
  )
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);
  const topCampaigns: Array<CampaignSpendRow> = Array.from(campaignMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const averageRewardCost =
    totalCredited > 0 ? totalRewardSpend / totalCredited : 0;

  return {
    dailyTrends,
    peakHours,
    topCampaigns,
    completionDistribution,
    averageRewardCost,
  };
}
