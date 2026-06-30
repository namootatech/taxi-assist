import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface PlatformPromotionRow {
  id: string;
  slug: string;
  name: string;
  startAt: string;
  endAt: string;
  discountPct: number;
  bonusImpressions: number;
  isActive: boolean;
}

interface RawPromotion {
  id: string;
  slug: string;
  name: string;
  start_at: string;
  end_at: string;
  discount_pct: number | string;
  bonus_impressions: number;
  is_active: boolean;
}

const toNumber = (v: number | string) => {
  if (typeof v === 'number') return v;
  const parsed = Number.parseFloat(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function loadPlatformPromotions(): Promise<Array<PlatformPromotionRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('platform_promotions')
    .select('id, slug, name, start_at, end_at, discount_pct, bonus_impressions, is_active')
    .order('start_at', { ascending: false });

  return ((data as Array<RawPromotion> | null) ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    startAt: row.start_at,
    endAt: row.end_at,
    discountPct: toNumber(row.discount_pct),
    bonusImpressions: row.bonus_impressions,
    isActive: row.is_active,
  }));
}
