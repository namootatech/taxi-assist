import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CampaignPackageRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePriceCents: number;
  minImpressions: number;
  maxDurationSeconds: number | null;
  skipAfterSeconds: number | null;
  riderPayoutCents: number | null;
  allowsWebsite: boolean;
  allowsWhatsapp: boolean;
  isActive: boolean;
}

interface RawPackage {
  id: string;
  slug: string;
  name: string;
  description: string;
  base_price_cents: number | null;
  min_impressions: number;
  max_duration_seconds: number | null;
  skip_after_seconds: number | null;
  rider_payout_cents: number | null;
  allows_website: boolean;
  allows_whatsapp: boolean;
  is_active: boolean;
}

export async function loadCampaignPackages(): Promise<Array<CampaignPackageRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ad_packages')
    .select(
      [
        'id',
        'slug',
        'name',
        'description',
        'base_price_cents',
        'min_impressions',
        'max_duration_seconds',
        'skip_after_seconds',
        'rider_payout_cents',
        'allows_website',
        'allows_whatsapp',
        'is_active',
      ].join(', '),
    )
    .eq('package_kind', 'campaign')
    .order('base_price_cents');

  return ((data as Array<RawPackage> | null) ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    basePriceCents: row.base_price_cents ?? 0,
    minImpressions: row.min_impressions,
    maxDurationSeconds: row.max_duration_seconds,
    skipAfterSeconds: row.skip_after_seconds,
    riderPayoutCents: row.rider_payout_cents,
    allowsWebsite: row.allows_website,
    allowsWhatsapp: row.allows_whatsapp,
    isActive: row.is_active,
  }));
}
