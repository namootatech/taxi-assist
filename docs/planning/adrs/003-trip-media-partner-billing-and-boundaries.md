# ADR 003 — Trip Media partner surface, billing providers, and admin boundary

**Status:** Accepted (planning)  
**Date:** 2026-05-08  
**Context:** The platform needs a **self-serve Trip Media Web App** so advertising partners upload creatives and buy recurring packages. Billing may use **Paystack** and/or **Payfast**. Today, **admin** is described as owning Taxi Assist Media campaign CRUD; partners introduce a new actor.

## Decision

1. **Partner-owned campaigns (self-serve)**  
   Partners create and manage their own campaigns and creatives within package limits. **Admin** retains moderation, fraud review, emergency takedown, and policy enforcement—not day-to-day CRUD for every partner campaign.

2. **Single data plane**  
   Partner identity, subscriptions, and campaigns live in **Supabase** alongside existing planned `ad_campaigns` / `ad_views`. Extend `ad_campaigns` (or equivalent) with `partner_id` and link creatives via normalized tables.

3. **Billing orchestration**  
   Use **Supabase Edge Functions** (or one dedicated backend) to:
   - create checkout / subscription on the chosen provider,
   - handle **webhooks** (idempotent, signed),
   - update `partner_subscriptions` and **grant or refresh** package entitlements.

4. **Provider strategy (South Africa first)**  
   - **Primary:** **Payfast** for ZAR recurring subscriptions and local payment methods.  
   - **Secondary / optional:** **Paystack** where products expand outside ZA or product requires it.  
   - Store `billing_provider` on the partner or subscription row; do not run two active subscriptions for the same logical package without an explicit migration path.

5. **Free trial and promotional credits**  
   - **Trial:** time-limited entitlement (e.g. 14 days) with impression/view caps aligned to a “starter” tier; enforced in DB + Edge, not only in UI.  
   - **Credits:** optional balance (e.g. welcome impression credits) decremented when campaigns **reserve** or **deliver** impressions—exact mechanics set in `trip_media_web` data model when migrations are written.  
   - Trials and paid tiers **must** be mutually understood in reporting (analytics separate `trial` vs `paid`).

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
