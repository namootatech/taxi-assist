# Partner campaign packages & pricing

**Date:** 2026-06-30  
**Status:** In progress  
**Prompt:** [docs/prompts/2026-06-30-partner-campaign-packages-prompt.md](../prompts/2026-06-30-partner-campaign-packages-prompt.md)

## Summary

Pivot Trip Media from monthly subscriptions to per-campaign packages (Basic R5,500 / Essential R6,500 / Premium R7,500 for 1,000 impressions minimum). Full-stack across Supabase, `trip_media_web`, and `admin_app`.

## Package catalog

| Package | Slug | Base price | Min impressions | Max duration | Skip after | Rider payout (hidden) |
|---------|------|------------|-----------------|--------------|------------|----------------------|
| Basic | `basic` | R5,500 | 1,000 | 20s | 5s | R0.35 |
| Essential | `essential` | R6,500 | 1,000 | 30s | 10s | R0.50 |
| Premium | `premium` | R7,500 | 1,000 | 60s | 20s | R0.75 |

**Pricing:** `(base_price / 1000) × impressions_purchased`, with 50% prelaunch discount when active.

## Phases

1. Schema migration + RPCs
2. Partner portal (wizard, billing, analytics)
3. Admin moderation + internal Trip ads
4. Payfast one-time + subscription cleanup

## ADR

Updated: [docs/planning/adrs/003-trip-media-partner-billing-and-boundaries.md](../planning/adrs/003-trip-media-partner-billing-and-boundaries.md)
