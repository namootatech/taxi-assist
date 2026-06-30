# ADR 003 — Trip Media partner surface, billing providers, and admin boundary

**Status:** Accepted (updated 2026-06-30)  
**Date:** 2026-05-08  
**Context:** The platform needs a **self-serve Trip Media Web App** so advertising partners upload creatives and buy **per-campaign advertising packages** (Basic, Essential, Premium). Billing uses **Payfast** for one-time campaign checkout. **Admin** retains moderation, fraud review, emergency takedown, and policy enforcement.

## Decision

1. **Partner-owned campaigns (self-serve)**  
   Partners create and manage their own campaigns and creatives. **Admin** retains moderation, fraud review, emergency takedown, and policy enforcement—not day-to-day CRUD for every partner campaign.

2. **Single data plane**  
   Partner identity, campaign payments, and campaigns live in **Supabase** alongside `ad_campaigns` / `ad_views`. Partner campaigns link to `ad_packages` (campaign packages, not subscriptions) via `package_id`.

3. **Billing orchestration (per-campaign, not subscription)**  
   Use **Next.js server actions** + **Payfast** to:
   - create one-time checkout per campaign (or impression top-up),
   - handle **webhooks** (idempotent, signed),
   - set `payment_status=paid` before admin review,
   - reserve escrow (rider payout pool vs Trip revenue) on campaign activation.

4. **Provider strategy (South Africa first)**  
   - **Primary:** **Payfast** for ZAR one-time campaign payments.  
   - **Secondary / optional:** **Paystack** where products expand outside ZA.  
   - Store `billing_provider` on the partner row.

5. **Prelaunch promotions and impression credits**  
   - **Prelaunch:** configurable window with automatic 50% discount and 1,000 bonus impressions once per partner (Trip covers rider payout on bonus impressions).  
   - **Carry-over credits:** unused impressions from cancelled campaigns move to `partner_impression_credits` for future campaigns (minimum 1,000 to go live).

6. **Integration with rider experience**  
   Rider app playback, completion rules (watch + rate + comment), and wallet credits remain per `business-rules-and-platform-logic.md` and `schema-gap-analysis.md`. Partner app does not bypass those rules.

## Consequences

- New tables and RLS for partners, subscriptions, webhooks, and optional credit ledger (see `schema-gap-analysis.md`).  
- Admin app may need read-only partner views + moderation queues; not a full replacement for partner portal.  
- `shared-services.md` gains explicit **Partner billing** and **Partner media** entries.

## Confidence

| Area            | Level   |
|-----------------|---------|
| Architectural split (partner vs admin) | **High** |
| Payfast-first for ZAR        | **High** |
| Exact Paystack vs Payfast SKU mapping | **Low** until commercial packages are fixed |
