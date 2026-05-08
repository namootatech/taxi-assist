import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecentRewardRow {
  adViewId: string;
  campaignId: string;
  campaignAdvertiser: string | null;
  state: string;
  rating: number | null;
  comment: string | null;
  rewardPerView: number;
  riderId: string | null;
  watchedAt: string | null;
  createdAt: string;
}

const toNumber = (v: number | string | null | undefined) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

interface RawAdView {
  ad_view_id: string;
  campaign_id: string;
  state: string;
  rating: number | null;
  comment: string | null;
  rider_id: string | null;
  watched_at: string | null;
  created_at: string;
  ad_campaigns:
    | { advertiser: string; reward_per_view: number | string }
    | Array<{ advertiser: string; reward_per_view: number | string }>
    | null;
}

export async function loadRecentRewards(
  limit = 100,
): Promise<Array<RecentRewardRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ad_views')
    .select(
      'ad_view_id, campaign_id, state, rating, comment, rider_id, watched_at, created_at, ad_campaigns:campaign_id(advertiser, reward_per_view)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data as Array<RawAdView> | null) ?? []).map((row) => {
    const campaign = Array.isArray(row.ad_campaigns)
      ? row.ad_campaigns[0]
      : row.ad_campaigns;
    return {
      adViewId: row.ad_view_id,
      campaignId: row.campaign_id,
      campaignAdvertiser: campaign?.advertiser ?? null,
      state: row.state,
      rating: row.rating,
      comment: row.comment,
      rewardPerView: toNumber(campaign?.reward_per_view),
      riderId: row.rider_id,
      watchedAt: row.watched_at,
      createdAt: row.created_at,
    };
  });
}

export interface RewardHoldRow {
  id: string;
  adViewId: string | null;
  campaignId: string | null;
  riderId: string | null;
  amountCents: number;
  status: string;
  reason: string;
  createdAt: string;
  releasedAt: string | null;
  reversedAt: string | null;
  reverseTxId: string | null;
  fraudSignalId: string | null;
}

export async function loadRewardHolds(
  limit = 100,
): Promise<Array<RewardHoldRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ad_reward_holds')
    .select(
      'id, ad_view_id, campaign_id, rider_id, amount_cents, status, reason, created_at, released_at, reversed_at, reverse_tx_id, fraud_signal_id',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    adViewId: (row.ad_view_id as string | null) ?? null,
    campaignId: (row.campaign_id as string | null) ?? null,
    riderId: (row.rider_id as string | null) ?? null,
    amountCents: Number(row.amount_cents ?? 0),
    status: row.status as string,
    reason: row.reason as string,
    createdAt: row.created_at as string,
    releasedAt: (row.released_at as string | null) ?? null,
    reversedAt: (row.reversed_at as string | null) ?? null,
    reverseTxId: (row.reverse_tx_id as string | null) ?? null,
    fraudSignalId: (row.fraud_signal_id as string | null) ?? null,
  }));
}

export interface WalletTrailRow {
  txId: string;
  walletId: string;
  direction: string;
  amount: number;
  type: string;
  reference: string | null;
  createdAt: string;
}

export async function loadAdRewardWalletTrails(
  limit = 100,
): Promise<Array<WalletTrailRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wallet_transactions')
    .select('tx_id, wallet_id, direction, amount, type, reference, created_at')
    .in('type', ['AD_REWARD', 'AD_REWARD_REVERSAL'])
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    txId: row.tx_id as string,
    walletId: row.wallet_id as string,
    direction: row.direction as string,
    amount: toNumber(row.amount as number | string | null),
    type: row.type as string,
    reference: (row.reference as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
