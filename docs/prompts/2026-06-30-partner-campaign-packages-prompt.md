# Partner campaign packages — implementation prompt

**Date:** 2026-06-30  
**Plan:** [docs/plans/2026-06-30-partner-campaign-packages.md](../plans/2026-06-30-partner-campaign-packages.md)

## Goal

Replace Trip Media's monthly subscription model with per-campaign advertising packages (Basic, Essential, Premium). Partners pay at checkout via Payfast, submit campaigns for admin approval, and track impressions purchased, used, and remaining. Admin moderates campaigns, manages internal Trip ads, and configures prelaunch discounts and rider payout rates.

## Context

**Exists:**
- Partner portal (`apps/trip_media_web`) with creatives, campaign drafts, subscription billing scaffold
- Admin Trip Media console (`apps/admin_app`) with creative/campaign moderation
- Supabase tables: `media_partners`, `ad_packages`, `ad_campaigns`, `ad_views`, `wallets`

**Missing:**
- Campaign-package pricing (Basic/Essential/Premium) instead of subscription tiers
- Payment-gated campaign submit, escrow, impression ledger
- Prelaunch 50% discount + 1,000 bonus impressions (once per partner)
- Delivery RPCs for valid impressions and trip-end wallet credit
- Internal Trip ads rotation (admin-only)
- Partner analytics: ratings, comments, clicks

## Scope

| In scope | Out of scope |
|----------|--------------|
| `supabase/migrations` | Geo/time targeting |
| `apps/trip_media_web` | Rider mobile UI |
| `apps/admin_app` Trip Media | Paystack live integration |
| Delivery RPCs (rider app consumes later) | Promo codes |

## Implementation steps

1. Migration: repurpose `ad_packages`, extend `ad_campaigns`, add payments/escrow/click/internal-ads tables
2. RPCs: partner draft/payment/submit, admin approve/reject/cancel, impression recording, trip-end wallet credit
3. `trip_media_web`: campaign wizard, creative validation, payment-gated submit, analytics
4. `admin_app`: campaign moderation, internal Trip ads, platform settings
5. Payfast one-time checkout + webhook; remove subscription UI

## Acceptance

1. Partner creates draft, selects package, buys 1,000+ impressions, pays, submits for review
2. Prelaunch discount and bonus impressions apply automatically once per partner
3. Admin approve/reject/pause/cancel with reasons; partner sees feedback
4. Dashboard shows impressions purchased/used/remaining, ratings, comments, clicks
5. Rider payout hidden from partners
6. Valid impression rules enforced; invalid impressions do not debit
7. Escrow splits rider vs Trip revenue; bonus payouts from Trip share
8. Extra impressions on live campaigns (no minimum on extras)
9. Internal Trip ads rotate after every 2 paid ads
10. Cancelled campaigns credit remaining impressions for future use
