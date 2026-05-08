import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface PartnerListRow {
  id: string;
  name: string;
  legalName: string | null;
  status: string;
  billingCountry: string;
  billingCurrency: string;
  promotionalCreditsBalance: number;
  trialEndsAt: string | null;
  createdAt: string;
  memberCount: number;
  campaignCount: number;
}

export async function loadPartnerList(filters: {
  status?: string;
  query?: string;
}): Promise<Array<PartnerListRow>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('media_partners')
    .select(
      'id, name, legal_name, status, billing_country, billing_currency, promotional_credits_balance, trial_ends_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all')
    query = query.eq('status', filters.status);
  if (filters.query?.trim())
    query = query.ilike('name', `%${filters.query.trim()}%`);

  const { data } = await query;
  if (!data) return [];

  const ids = data.map((p) => p.id as string);
  const memberCountMap = new Map<string, number>();
  const campaignCountMap = new Map<string, number>();

  if (ids.length > 0) {
    const [{ data: members }, { data: campaigns }] = await Promise.all([
      supabase
        .from('partner_members')
        .select('partner_id')
        .in('partner_id', ids),
      supabase.from('ad_campaigns').select('partner_id').in('partner_id', ids),
    ]);
    for (const row of members ?? []) {
      const id = row.partner_id as string;
      memberCountMap.set(id, (memberCountMap.get(id) ?? 0) + 1);
    }
    for (const row of campaigns ?? []) {
      const id = row.partner_id as string;
      campaignCountMap.set(id, (campaignCountMap.get(id) ?? 0) + 1);
    }
  }

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    legalName: (row.legal_name as string | null) ?? null,
    status: row.status as string,
    billingCountry: row.billing_country as string,
    billingCurrency: row.billing_currency as string,
    promotionalCreditsBalance: Number(row.promotional_credits_balance ?? 0),
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    createdAt: row.created_at as string,
    memberCount: memberCountMap.get(row.id as string) ?? 0,
    campaignCount: campaignCountMap.get(row.id as string) ?? 0,
  }));
}

export interface PartnerOverview {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  status: string;
  billingCountry: string;
  billingCurrency: string;
  billingProvider: string | null;
  promotionalCreditsBalance: number;
  trialEndsAt: string | null;
  createdAt: string;
}

export async function loadPartnerOverview(
  partnerId: string,
): Promise<PartnerOverview | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('media_partners')
    .select(
      'id, name, legal_name, registration_number, status, billing_country, billing_currency, billing_provider, promotional_credits_balance, trial_ends_at, created_at',
    )
    .eq('id', partnerId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    legalName: (data.legal_name as string | null) ?? null,
    registrationNumber: (data.registration_number as string | null) ?? null,
    status: data.status as string,
    billingCountry: data.billing_country as string,
    billingCurrency: data.billing_currency as string,
    billingProvider: (data.billing_provider as string | null) ?? null,
    promotionalCreditsBalance: Number(data.promotional_credits_balance ?? 0),
    trialEndsAt: (data.trial_ends_at as string | null) ?? null,
    createdAt: data.created_at as string,
  };
}

export interface PartnerMember {
  id: string;
  email: string | null;
  role: string;
  invitedAt: string;
  joinedAt: string | null;
  userId: string | null;
}

export async function loadPartnerMembers(
  partnerId: string,
): Promise<Array<PartnerMember>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('partner_members')
    .select('id, email, role, invited_at, joined_at, user_id')
    .eq('partner_id', partnerId)
    .order('invited_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: (row.email as string | null) ?? null,
    role: row.role as string,
    invitedAt: row.invited_at as string,
    joinedAt: (row.joined_at as string | null) ?? null,
    userId: (row.user_id as string | null) ?? null,
  }));
}

export interface PartnerSubscription {
  id: string;
  status: string;
  provider: string;
  providerSubscriptionId: string | null;
  packageName: string | null;
  packageSlug: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function loadPartnerSubscriptions(
  partnerId: string,
): Promise<Array<PartnerSubscription>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('partner_subscriptions')
    .select(
      'id, status, provider, provider_subscription_id, current_period_start, current_period_end, cancel_at_period_end, ad_packages:package_id(name, slug)',
    )
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => {
    const pkg = Array.isArray(row.ad_packages)
      ? row.ad_packages[0]
      : row.ad_packages;
    return {
      id: row.id as string,
      status: row.status as string,
      provider: row.provider as string,
      providerSubscriptionId:
        (row.provider_subscription_id as string | null) ?? null,
      packageName: (pkg?.name as string | null) ?? null,
      packageSlug: (pkg?.slug as string | null) ?? null,
      currentPeriodStart: (row.current_period_start as string | null) ?? null,
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    };
  });
}

export interface PartnerBillingEvent {
  id: string;
  type: string;
  provider: string;
  processedAt: string;
}

export async function loadPartnerBillingEvents(
  partnerId: string,
): Promise<Array<PartnerBillingEvent>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('partner_billing_events')
    .select('id, type, provider, processed_at')
    .eq('partner_id', partnerId)
    .order('processed_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as string,
    provider: row.provider as string,
    processedAt: row.processed_at as string,
  }));
}

export interface PartnerCreativeRow {
  id: string;
  title: string;
  status: string;
  category: string | null;
  createdAt: string;
}

export async function loadPartnerCreatives(
  partnerId: string,
): Promise<Array<PartnerCreativeRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ad_creatives')
    .select('id, title, status, category, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    status: row.status as string,
    category: (row.category as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export interface PartnerAuditEntry {
  id: number;
  action: string;
  reason: string | null;
  actorRole: string | null;
  createdAt: string;
}

export async function loadPartnerAuditTail(
  partnerId: string,
): Promise<Array<PartnerAuditEntry>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('audit_id, action, reason, actor_role, created_at, metadata')
    .or(`entity_id.eq.${partnerId},metadata->>partner_id.eq.${partnerId}`)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    id: row.audit_id as number,
    action: row.action as string,
    reason: (row.reason as string | null) ?? null,
    actorRole: (row.actor_role as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
