# Drift report — 2026-05-08

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Implemented apps | 4 | `apps/driver_app`, `apps/admin_app`, `apps/trip_media_web`, `apps/trip_website` |
| Planned apps with no code folder | 1 | `rider_app` |
| Shared-service docs corrected this run | 3 | Wallet/ledger, ads, audit now reflect migration reality |
| Remaining high-priority schema/API gaps | 4 | Rider write paths, partner billing tables/webhooks, storage privacy hardening, deeper admin intervention/payout flows |

## App map

| App | Code path | Doc path | Status | Match |
|-----|-----------|----------|--------|-------|
| `driver_app` | `apps/driver_app` | `docs/planning/drivers` | `in-progress` | Code substantially implements auth, onboarding, documents, home/go-online, trip lifecycle, support, profile, and earnings. Still not full launch-ready testing/deployment. |
| `admin_app` | `apps/admin_app` | `docs/planning/admin` | `in-progress` | Code substantially implements auth/RBAC, dashboard shell, verification, entity browsing, trips, wallets, ads, support, audit, and admin pages. Analytics/payments/settings remain scaffolding. |
| `rider_app` | Missing | `docs/planning/rider_app` | `planning` | Docs complete; app scaffold and rider trip/wallet/ad write paths are missing. |
| `trip_media_web` | `apps/trip_media_web` | `docs/planning/trip_media_web` | `in-progress` | Foundation app exists with Next.js, Supabase SSR auth shell, proxy-protected dashboard placeholder, Sentry config, GA hook, env example, and README. Partner billing migrations, payment webhooks, package CRUD, creative uploads, and campaign CRUD remain deferred. |
| `trip_website` | `apps/trip_website` | `docs/planning/trip_website` | `in-progress` | Foundation marketing app exists with Next.js public shell, APD-Market-aligned copy, Unsplash MCP-sourced hero metadata, Sentry config, GA hook, env example, and README. Lead capture backend and CRM sync remain deferred. |

## Undocumented code / doc lag

- `supabase/migrations/20260507153000_admin_rbac_audit_and_admin_rls.sql` implements admin RBAC, admin RLS, and audit helpers that were still described as missing in `docs/planning/schema-gap-analysis.md`. Updated this run.
- `supabase/migrations/20260507160000_admin_wallets_ads_trip_events_and_expiry.sql` implements wallets, wallet transactions, admin wallet adjustment, ad campaigns, ad views, trip events, and document expiry automation that were still described as missing in `docs/planning/shared-services.md` and `docs/planning/schema-gap-analysis.md`. Updated this run.
- `supabase/migrations/20260508052000_driver_cancel_reason_required.sql` extends `driver_transition_trip(...)` to require a reason for driver pre-pickup cancellation and write `trip_events`. This is now reflected in `schema-gap-analysis.md`.

## Missing in code

- `apps/rider_app` does not exist yet, despite complete planning docs and prompt chain.
- Trip Media partner billing tables and Edge/webhook handlers are not present: `media_partners`, `partner_members`, `ad_packages`, `partner_subscriptions`, `partner_billing_events`, `ad_creatives`, plus Payfast/Paystack webhook handling.
- Trip Website lead capture backend, `marketing_leads`, and production Pipedrive sync are not present; prompt 01 defers this work.
- Rider app execution paths remain missing: rider trip request RPC/RLS, rider `trip_locations` write policies, wallet spend flows, and ad reward credit flow.
- Admin `analytics`, `payments`, and `settings` routes are implemented as scaffolding, not final operational modules.
- Driver test coverage is still thin; `apps/driver_app/test/smoke_test.dart` is a placeholder.

## Schema / API drift

- **Resolved in docs this run:** shared-services status for wallet/ledger, ads, and audit now matches migrations.
- **Resolved in docs this run:** schema gap analysis no longer lists admin RBAC, audit, wallet, ads, trip events, and document expiry automation as fully missing.
- **Remaining:** Storage buckets are created as public in the original storage migration, while admin verification uses signed URLs and planning calls for POPIA-oriented private buckets.
- **Remaining:** `driver_transition_trip(...)` signature changed to include `p_cancel_reason`; clients updated in `driver_app`, but any external callers must use the new signature.
- **Remaining:** Next.js build warns that `middleware.ts` convention is deprecated in favor of `proxy`; this is not yet reflected as an implementation ticket outside this report.
- **Remaining:** GA4 property creation is blocked by multiple available Google Analytics accounts (`Simply Analytics`, `bqwabi`, `zamobomi`, `Midas Touch`, `Clinicplus`); choose one before provisioning.
- **Remaining:** Vercel deployment/project creation is blocked by multiple teams/projects; choose the target Vercel team before deployment.
- **Remaining:** Pipedrive internal test/config lead setup is blocked because the Pipedream action requires final runnable action/person-organization selection.

## Recommended next actions

1. Harden Supabase Storage privacy for `driver-documents` and `vehicle-photos`, then update signed URL/admin/driver access docs.
2. Replace or migrate `apps/admin_app/middleware.ts` to the Next.js `proxy` convention when prioritizing deployment polish.
3. Execute rider prompt `01-foundation-setup.md` only after confirming rider trip request RLS/RPC design.
4. Build Trip Media partner billing schema and webhook handlers before creating partner portal CRUD flows.
5. Expand admin `analytics`, `payments`, and `settings` from scaffolding into role-gated operational surfaces.
6. Replace driver placeholder smoke test with real widget/provider tests for go-online and cancellation reason behavior.
7. Select GA4 and Vercel accounts, then provision measurement IDs and deployments for `trip_website` and `trip_media_web`.

