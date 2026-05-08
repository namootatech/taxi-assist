import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export type FraudLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudStatus =
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'dismissed'
  | 'escalated';

export interface FraudSignalRow {
  id: string;
  riderId: string | null;
  tripId: string | null;
  adViewId: string | null;
  campaignId: string | null;
  partnerId: string | null;
  kind: string;
  level: FraudLevel;
  status: FraudStatus;
  summary: string;
  evidence: Record<string, unknown>;
  resolutionNote: string | null;
  ownerAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface FraudCounts {
  total: number;
  open: number;
  investigating: number;
  highOrCritical: number;
}

export async function loadFraudSignals(filters: {
  status?: FraudStatus | 'all';
  level?: FraudLevel | 'all';
  partnerId?: string;
  campaignId?: string;
  limit?: number;
}): Promise<Array<FraudSignalRow>> {
  const supabase = await createClerkSupabaseServerClient();
  let query = supabase
    .from('ad_fraud_signals')
    .select(
      'id, rider_id, trip_id, ad_view_id, campaign_id, partner_id, kind, level, status, summary, evidence, resolution_note, owner_admin_id, created_at, updated_at, resolved_at',
    )
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status && filters.status !== 'all')
    query = query.eq('status', filters.status);
  if (filters.level && filters.level !== 'all')
    query = query.eq('level', filters.level);
  if (filters.partnerId) query = query.eq('partner_id', filters.partnerId);
  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    riderId: (row.rider_id as string | null) ?? null,
    tripId: (row.trip_id as string | null) ?? null,
    adViewId: (row.ad_view_id as string | null) ?? null,
    campaignId: (row.campaign_id as string | null) ?? null,
    partnerId: (row.partner_id as string | null) ?? null,
    kind: row.kind as string,
    level: row.level as FraudLevel,
    status: row.status as FraudStatus,
    summary: row.summary as string,
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    resolutionNote: (row.resolution_note as string | null) ?? null,
    ownerAdminId: (row.owner_admin_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  }));
}

export async function loadFraudCounts(): Promise<FraudCounts> {
  const supabase = await createClerkSupabaseServerClient();
  const [
    { count: total },
    { count: open },
    { count: investigating },
    { count: highOrCritical },
  ] = await Promise.all([
    supabase
      .from('ad_fraud_signals')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('ad_fraud_signals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('ad_fraud_signals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'investigating'),
    supabase
      .from('ad_fraud_signals')
      .select('id', { count: 'exact', head: true })
      .in('level', ['high', 'critical'])
      .in('status', ['open', 'investigating']),
  ]);
  return {
    total: total ?? 0,
    open: open ?? 0,
    investigating: investigating ?? 0,
    highOrCritical: highOrCritical ?? 0,
  };
}

export interface FraudCandidateRow {
  riderId: string;
  viewsLastHour: number;
  rejectedLast24h: number;
  creditedLast24h: number;
  lastViewAt: string;
}

export async function loadFraudCandidates(
  limit = 25,
): Promise<Array<FraudCandidateRow>> {
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from('vw_fraud_candidates')
    .select(
      'rider_id, views_last_hour, rejected_last_24h, credited_last_24h, last_view_at',
    )
    .order('views_last_hour', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    riderId: row.rider_id as string,
    viewsLastHour: Number(row.views_last_hour ?? 0),
    rejectedLast24h: Number(row.rejected_last_24h ?? 0),
    creditedLast24h: Number(row.credited_last_24h ?? 0),
    lastViewAt: row.last_view_at as string,
  }));
}
