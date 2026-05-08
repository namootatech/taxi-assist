# Trip Media Web App — PRD

**Sources:** `docs/planning/supporting-documents/idea.md` (Trip Media), `docs/planning/adrs/003-trip-media-partner-billing-and-boundaries.md`, platform ads gaps in `schema-gap-analysis.md`

## Problem

Advertising partners need a **web** surface to join Trip / Taxi Assist Media, upload and configure advertising creatives, choose **subscription packages**, and pay via **recurring billing**—without performing day-to-day operations in the internal admin console.

## Goals

- Self-serve **partner accounts** (org + invited users).
- **Creative management:** upload video/image assets, metadata, optional landing URLs, scheduling hints (peak/off-peak/all-day—aligned with platform targeting).
- **packages:** tiered plans (impression caps, geo/time slots, number of concurrent campaigns) sold as **subscriptions** with **free trial** and/or **free promotional credits**.
- **Payments:** Payfast (primary ZA) and/or Paystack (optional) per ADR 003.
- **Transparency:** usage vs package limits, billing history, subscription status.

## Non-goals (MVP)

- Replacing admin fraud tools or manual compliance reviews.
- Direct rider PII access.
- Building a full DSP/RTB; delivery uses platform `ad_campaigns` / rider surfaces.

## Personas

- **Partner admin** — signs up, adds billing, invites team, approves creatives for submit.
- **Partner operator** — uploads creatives, creates campaigns, monitors performance.
- **Finance contact** — same user or separate; manages payment method and invoices (provider-dependent).

## Functional requirements

1. **Auth:** Supabase Auth (email/phone per technical doc); role within partner org.
2. **Onboarding:** company profile, billing country/currency, accept partner terms (content + payment policy).
3. **Trial / credits:** On signup, assign **trial window** and/or **starter credits** per platform config; show countdown and remaining credits.
4. **Packages:** Display catalog; subscribe or upgrade; webhook-driven status sync.
5. **Campaigns:** CRUD campaigns linked to creatives; caps enforced against subscription + credits.
6. **Delivery alignment:** Targeting fields compatible with admin/rider ad pipeline (time bands, zones when schema supports it).
7. **Notifications:** email (and later push) for payment failures, trial ending, campaign paused for cap.

## Success metrics

- Partners can complete first paid (or trial) campaign without admin intervention.
- Webhook-driven subscription state matches provider within acceptable delay.
- Zero bypass of rider **ad completion** rules for wallet rewards.

## Dependencies

- Planned `ad_campaigns`, storage buckets for creatives, RLS for partner scope.
- Edge Functions for checkout + webhooks.

## Open questions

- Default trial length and credit amounts (product decision).
- Whether first-line creative moderation is automated, manual queue, or hybrid.
- Paystack vs Payfast per merchant account setup.
