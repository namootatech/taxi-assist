import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ENDED'
  | 'REJECTED'
  | 'FORCE_STOPPED';

export interface CampaignRow {
  campaignId: string;
  advertiser: string;
  status: CampaignStatus;
  partnerId: string | null;
  partnerName: string | null;
  creativeId: string | null;
  creativeTitle: string | null;
  creativeMimeType: string | null;
  creativeStoragePath: string | null;
  creativeSignedUrl: string | null;
  maxViews: number | null;
  currentViews: number;
  rewardPerView: number;
  scheduleBand: string;
  startDate: string | null;
  endDate: string | null;
  forceStopReason: string | null;
  forceStoppedAt: string | null;
  lastAdminActionAt: string | null;
  createdAt: string;
}

interface RawCampaign {
  campaign_id: string;
  advertiser: string;
  status: string;
  partner_id: string | null;
  creative_id: string | null;
  max_views: number | null;
  current_views: number;
  reward_per_view: number | string;
  schedule_band: string;
  start_date: string | null;
  end_date: string | null;
  force_stop_reason: string | null;
  force_stopped_at: string | null;
  last_admin_action_at: string | null;
  created_at: string;
  media_partners: { name: string } | Array<{ name: string }> | null;
  ad_creatives:
    | {
        id: string;
        title: string;
        mime_type: string | null;
        storage_path: string | null;
      }
    | Array<{
        id: string;
        title: string;
        mime_type: string | null;
        storage_path: string | null;
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

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function loadCampaigns(filters: {
  status?: CampaignStatus | 'ALL';
  partnerId?: string;
  limit?: number;
}): Promise<Array<CampaignRow>> {
  const supabase = await createClerkSupabaseServerClient();

  let query = supabase
    .from('ad_campaigns')
    .select(
      [
        'campaign_id',
        'advertiser',
        'status',
        'partner_id',
        'creative_id',
        'max_views',
        'current_views',
        'reward_per_view',
        'schedule_band',
        'start_date',
        'end_date',
        'force_stop_reason',
        'force_stopped_at',
        'last_admin_action_at',
        'created_at',
        'media_partners:partner_id(name)',
        'ad_creatives:creative_id(id, title, mime_type, storage_path)',
      ].join(', '),
    )
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }
  if (filters.partnerId) {
    query = query.eq('partner_id', filters.partnerId);
  }

  const { data } = await query;
  const rows = (data as Array<RawCampaign> | null) ?? [];
  if (rows.length === 0) return [];

  const paths = rows
    .map((row) => {
      const creative = Array.isArray(row.ad_creatives)
        ? row.ad_creatives[0]
        : row.ad_creatives;
      return creative?.storage_path ?? null;
    })
    .filter((p): p is string => Boolean(p));

  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('partner-ad-creatives')
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signed) {
      for (const item of signed) {
        if (item.path && item.signedUrl)
          signedByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return rows.map((row) => {
    const partner = Array.isArray(row.media_partners)
      ? row.media_partners[0]
      : row.media_partners;
    const creative = Array.isArray(row.ad_creatives)
      ? row.ad_creatives[0]
      : row.ad_creatives;
    return {
      campaignId: row.campaign_id,
      advertiser: row.advertiser,
      status: row.status as CampaignStatus,
      partnerId: row.partner_id,
      partnerName: partner?.name ?? null,
      creativeId: creative?.id ?? null,
      creativeTitle: creative?.title ?? null,
      creativeMimeType: creative?.mime_type ?? null,
      creativeStoragePath: creative?.storage_path ?? null,
      creativeSignedUrl: creative?.storage_path
        ? (signedByPath.get(creative.storage_path) ?? null)
        : null,
      maxViews: row.max_views,
      currentViews: row.current_views ?? 0,
      rewardPerView: toNumber(row.reward_per_view),
      scheduleBand: row.schedule_band,
      startDate: row.start_date,
      endDate: row.end_date,
      forceStopReason: row.force_stop_reason,
      forceStoppedAt: row.force_stopped_at,
      lastAdminActionAt: row.last_admin_action_at,
      createdAt: row.created_at,
    };
  });
}

export async function loadCampaignCounts(): Promise<
  Record<CampaignStatus | 'ALL', number>
> {
  const supabase = await createClerkSupabaseServerClient();
  const statuses: Array<CampaignStatus> = [
    'DRAFT',
    'PENDING_REVIEW',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ENDED',
    'REJECTED',
    'FORCE_STOPPED',
  ];
  const counts: Record<CampaignStatus | 'ALL', number> = {
    ALL: 0,
    DRAFT: 0,
    PENDING_REVIEW: 0,
    ACTIVE: 0,
    PAUSED: 0,
    COMPLETED: 0,
    ENDED: 0,
    REJECTED: 0,
    FORCE_STOPPED: 0,
  };

  const { count: total } = await supabase
    .from('ad_campaigns')
    .select('campaign_id', { count: 'exact', head: true });
  counts.ALL = total ?? 0;

  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('ad_campaigns')
        .select('campaign_id', { count: 'exact', head: true })
        .eq('status', s);
      counts[s] = count ?? 0;
    }),
  );

  return counts;
}
