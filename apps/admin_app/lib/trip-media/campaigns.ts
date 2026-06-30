import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ENDED'
  | 'REJECTED'
  | 'FORCE_STOPPED'
  | 'CANCELLED'
  | 'CANCELLATION_PENDING';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface CampaignRow {
  campaignId: string;
  advertiser: string;
  companyName: string | null;
  status: CampaignStatus;
  partnerId: string | null;
  partnerName: string | null;
  packageId: string | null;
  packageName: string | null;
  packageSlug: string | null;
  creativeId: string | null;
  creativeTitle: string | null;
  creativeMimeType: string | null;
  creativeStoragePath: string | null;
  creativeSignedUrl: string | null;
  impressionsPurchased: number | null;
  impressionsBonus: number;
  impressionsUsed: number;
  impressionsRemaining: number;
  maxViews: number | null;
  currentViews: number;
  rewardPerView: number;
  riderPayoutCents: number | null;
  paymentStatus: PaymentStatus;
  totalPaidCents: number;
  discountCents: number;
  escrowRiderCents: number;
  escrowTripCents: number;
  destinationType: string | null;
  destinationValue: string | null;
  campaignNotes: string | null;
  cancellationReason: string | null;
  reviewNote: string | null;
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
  company_name: string | null;
  status: string;
  partner_id: string | null;
  package_id: string | null;
  creative_id: string | null;
  impressions_purchased: number | null;
  impressions_bonus: number | null;
  impressions_used: number | null;
  max_views: number | null;
  current_views: number;
  reward_per_view: number | string;
  rider_payout_cents: number | null;
  payment_status: string;
  total_paid_cents: number | null;
  discount_cents: number | null;
  escrow_rider_cents: number | null;
  escrow_trip_cents: number | null;
  destination_type: string | null;
  destination_value: string | null;
  campaign_notes: string | null;
  cancellation_reason: string | null;
  review_note: string | null;
  schedule_band: string;
  start_date: string | null;
  end_date: string | null;
  force_stop_reason: string | null;
  force_stopped_at: string | null;
  last_admin_action_at: string | null;
  created_at: string;
  media_partners: { name: string } | Array<{ name: string }> | null;
  ad_packages:
    | { id: string; name: string; slug: string }
    | Array<{ id: string; name: string; slug: string }>
    | null;
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

const CAMPAIGN_SELECT = [
  'campaign_id',
  'advertiser',
  'company_name',
  'status',
  'partner_id',
  'package_id',
  'creative_id',
  'impressions_purchased',
  'impressions_bonus',
  'impressions_used',
  'max_views',
  'current_views',
  'reward_per_view',
  'rider_payout_cents',
  'payment_status',
  'total_paid_cents',
  'discount_cents',
  'escrow_rider_cents',
  'escrow_trip_cents',
  'destination_type',
  'destination_value',
  'campaign_notes',
  'cancellation_reason',
  'review_note',
  'schedule_band',
  'start_date',
  'end_date',
  'force_stop_reason',
  'force_stopped_at',
  'last_admin_action_at',
  'created_at',
  'media_partners:partner_id(name)',
  'ad_packages:package_id(id, name, slug)',
  'ad_creatives:creative_id(id, title, mime_type, storage_path)',
].join(', ');

export async function loadCampaigns(filters: {
  status?: CampaignStatus | 'ALL';
  partnerId?: string;
  limit?: number;
}): Promise<Array<CampaignRow>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('ad_campaigns')
    .select(CAMPAIGN_SELECT)
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
    const pkg = Array.isArray(row.ad_packages)
      ? row.ad_packages[0]
      : row.ad_packages;
    const creative = Array.isArray(row.ad_creatives)
      ? row.ad_creatives[0]
      : row.ad_creatives;

    const purchased = row.impressions_purchased ?? row.max_views ?? 0;
    const bonus = row.impressions_bonus ?? 0;
    const used = row.impressions_used ?? row.current_views ?? 0;
    const total = purchased + bonus;

    return {
      campaignId: row.campaign_id,
      advertiser: row.advertiser,
      companyName: row.company_name,
      status: row.status as CampaignStatus,
      partnerId: row.partner_id,
      partnerName: partner?.name ?? null,
      packageId: row.package_id,
      packageName: pkg?.name ?? null,
      packageSlug: pkg?.slug ?? null,
      creativeId: creative?.id ?? null,
      creativeTitle: creative?.title ?? null,
      creativeMimeType: creative?.mime_type ?? null,
      creativeStoragePath: creative?.storage_path ?? null,
      creativeSignedUrl: creative?.storage_path
        ? (signedByPath.get(creative.storage_path) ?? null)
        : null,
      impressionsPurchased: row.impressions_purchased ?? row.max_views,
      impressionsBonus: bonus,
      impressionsUsed: used,
      impressionsRemaining: Math.max(total - used, 0),
      maxViews: row.max_views,
      currentViews: row.current_views ?? 0,
      rewardPerView: toNumber(row.reward_per_view),
      riderPayoutCents: row.rider_payout_cents,
      paymentStatus: (row.payment_status ?? 'pending') as PaymentStatus,
      totalPaidCents: row.total_paid_cents ?? 0,
      discountCents: row.discount_cents ?? 0,
      escrowRiderCents: row.escrow_rider_cents ?? 0,
      escrowTripCents: row.escrow_trip_cents ?? 0,
      destinationType: row.destination_type,
      destinationValue: row.destination_value,
      campaignNotes: row.campaign_notes,
      cancellationReason: row.cancellation_reason,
      reviewNote: row.review_note,
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
  const supabase = await createSupabaseServerClient();
  const statuses: Array<CampaignStatus> = [
    'DRAFT',
    'PENDING_REVIEW',
    'CANCELLATION_PENDING',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ENDED',
    'REJECTED',
    'FORCE_STOPPED',
    'CANCELLED',
  ];
  const counts: Record<CampaignStatus | 'ALL', number> = {
    ALL: 0,
    DRAFT: 0,
    PENDING_REVIEW: 0,
    CANCELLATION_PENDING: 0,
    ACTIVE: 0,
    PAUSED: 0,
    COMPLETED: 0,
    ENDED: 0,
    REJECTED: 0,
    FORCE_STOPPED: 0,
    CANCELLED: 0,
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
