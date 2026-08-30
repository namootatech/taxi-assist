import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CampaignPackageRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  packageKind: 'campaign' | 'subscription';
  basePriceCents: number;
  monthlyPriceCents: number | null;
  minImpressions: number;
  maxDurationSeconds: number | null;
  skipAfterSeconds: number | null;
  dailyImpressionCap: number | null;
  billingIntervalDays: number | null;
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
  package_kind: 'campaign' | 'subscription';
  base_price_cents: number | null;
  monthly_price_cents: number | null;
  min_impressions: number;
  max_duration_seconds: number | null;
  skip_after_seconds: number | null;
  daily_impression_cap: number | null;
  billing_interval_days: number | null;
  rider_payout_cents: number | null;
  allows_website: boolean;
  allows_whatsapp: boolean;
  is_active: boolean;
}

function mapPackage(row: RawPackage): CampaignPackageRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    packageKind: row.package_kind,
    basePriceCents: row.base_price_cents ?? 0,
    monthlyPriceCents: row.monthly_price_cents,
    minImpressions: row.min_impressions,
    maxDurationSeconds: row.max_duration_seconds,
    skipAfterSeconds: row.skip_after_seconds,
    dailyImpressionCap: row.daily_impression_cap,
    billingIntervalDays: row.billing_interval_days,
    riderPayoutCents: row.rider_payout_cents,
    allowsWebsite: row.allows_website,
    allowsWhatsapp: row.allows_whatsapp,
    isActive: row.is_active,
  };
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
        'package_kind',
        'base_price_cents',
        'monthly_price_cents',
        'min_impressions',
        'max_duration_seconds',
        'skip_after_seconds',
        'daily_impression_cap',
        'billing_interval_days',
        'rider_payout_cents',
        'allows_website',
        'allows_whatsapp',
        'is_active',
      ].join(', '),
    )
    .in('package_kind', ['campaign', 'subscription'])
    .order('base_price_cents');

  return ((data as Array<RawPackage> | null) ?? []).map(mapPackage);
}

export async function loadSubscriptionPackages(): Promise<Array<CampaignPackageRow>> {
  const packages = await loadCampaignPackages();
  return packages.filter((pkg) => pkg.packageKind === 'subscription');
}
