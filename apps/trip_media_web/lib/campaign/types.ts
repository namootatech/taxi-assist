export interface PartnerPackage {
  id: string
  slug: string
  name: string
  description: string
  base_price_cents: number
  min_impressions: number
  max_duration_seconds: number
  skip_after_seconds: number
  allows_website: boolean
  allows_whatsapp: boolean
}

export interface CampaignPricing {
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  bonus_impressions: number
  cost_per_impression_cents: number
}

export const ACCEPTED_CREATIVE_TYPES = [
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
] as const

export const MAX_CREATIVE_BYTES = 300 * 1024 * 1024
export const PORTRAIT_WIDTH = 1080
export const PORTRAIT_HEIGHT = 1920

export function formatZarFromCents(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function computeLocalPrice(
  basePriceCents: number,
  minImpressions: number,
  impressions: number,
  discountPct = 0,
): CampaignPricing {
  const subtotal_cents = Math.round((basePriceCents * impressions) / minImpressions)
  const discount_cents = Math.round(subtotal_cents * (discountPct / 100))
  const total_cents = subtotal_cents - discount_cents
  return {
    subtotal_cents,
    discount_cents,
    total_cents,
    bonus_impressions: 0,
    cost_per_impression_cents: Math.round(basePriceCents / minImpressions),
  }
}
