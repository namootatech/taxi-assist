# Drift report — 2026-05-08

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Implemented apps | 4 | `apps/driver_app`, `apps/admin_app`, `apps/trip_media_web`, `apps/trip_website` |
| Planned apps with no code folder | 1 | `rider_app` |
| Shared-service docs corrected this run | 5 | Wallet/ledger, ads, audit, partner billing, and marketing leads now reflect migration reality |
| Remaining high-priority schema/API gaps | 3 | Rider write paths, storage privacy hardening, deeper admin intervention/payout flows |

## App map

| App | Code path | Doc path | Status | Match |
|-----|-----------|----------|--------|-------|
| `driver_app` | `apps/driver_app` | `docs/planning/drivers` | `in-progress` | Code substantially implements auth, onboarding, documents, home/go-online, trip lifecycle, support, profile, and earnings. Still not full launch-ready testing/deployment. |
| `admin_app` | `apps/admin_app` | `docs/planning/admin` | `in-progress` | Code substantially implements auth/RBAC, dashboard shell, verification, entity browsing, trips, wallets, ads, support, audit, and admin pages. Analytics/payments/settings remain scaffolding. |
| `rider_app` | Missing | `docs/planning/rider_app` | `planning` | Docs complete; app scaffold and rider trip/wallet/ad write paths are missing. |
| `trip_media_web` | `apps/trip_media_web` | `docs/planning/trip_media_web` | `in-progress` | Prompts 01-05 are implemented to MVP depth: Supabase SSR auth, partner schema/RLS/storage migrations, package seeds, signup-created partner workspaces, dashboard org context, creative/campaign/billing/team pages, Payfast-first checkout/webhook handling, Paystack placeholder hooks, GA/Sentry env wiring, and README updates. Production provider credentials, live subscription verification, and creative file upload bytes still need environment-specific validation. |
| `trip_website` | `apps/trip_website` | `docs/planning/trip_website` | `in-progress` | Prompts 01-05 are implemented to MVP depth: public route coverage, metadata, lead capture, `marketing_leads` migration, sitemap/robots, GA/Sentry env wiring, APD-Market copy, design polish, and README updates. Production CRM sync and GA4 web stream IDs remain external setup items. |

## Undocumented code / doc lag

- `supabase/migrations/20260508073500_trip_website_marketing_leads.sql` implements `marketing_leads`; `docs/planning/trip_website/planning/data-model-and-app-entities.md`, `technical-implementation.md`, and `shared-services.md` were updated this run.
- `supabase/migrations/20260508073600_trip_media_partner_core.sql` and `20260508073700_trip_media_partner_policies.sql` implement Trip Media partner tables/RLS/storage; `docs/planning/trip_media_web/planning/data-model-and-app-entities.md`, `technical-implementation.md`, `schema-gap-analysis.md`, and `shared-services.md` were updated this run.
- `apps/trip_media_web/app/api/payfast-webhook/route.ts` and `supabase/functions/payfast-webhook/index.ts` implement Payfast-first webhook scaffolding; Trip Media technical docs now reflect the Payfast-first/Paystack-placeholder boundary.

## Missing in code

- `apps/rider_app` does not exist yet, despite complete planning docs and prompt chain.
- Production Pipedrive CRM sync for Trip Website lead capture is not present; lead persistence now exists via `marketing_leads`.
- Trip Media Payfast provider credentials, dashboard callback URLs, and live/sandbox subscription verification are not configured in this repo.
- Rider app execution paths remain missing: rider trip request RPC/RLS, rider `trip_locations` write policies, wallet spend flows, and ad reward credit flow.
- Admin `analytics`, `payments`, and `settings` routes are implemented as scaffolding, not final operational modules.
- Driver test coverage is still thin; `apps/driver_app/test/smoke_test.dart` is a placeholder.

## Schema / API drift

- **Resolved in docs this run:** shared-services status for wallet/ledger, ads, and audit now matches migrations.
- **Resolved in docs this run:** schema gap analysis no longer lists admin RBAC, audit, wallet, ads, trip events, and document expiry automation as fully missing.
- **Remaining:** Storage buckets are created as public in the original storage migration, while admin verification uses signed URLs and planning calls for POPIA-oriented private buckets.
- **Remaining:** `driver_transition_trip(...)` signature changed to include `p_cancel_reason`; clients updated in `driver_app`, but any external callers must use the new signature.
- **Remaining:** Next.js build warns that `middleware.ts` convention is deprecated in favor of `proxy`; this is not yet reflected as an implementation ticket outside this report.
- **Resolved / pending external follow-up:** GA4 properties were created in account `bqwabi`: `Trip Website` = `properties/536792786`, `Trip Media Web` = `properties/536741693`. Measurement IDs still require web streams.
- **Remaining:** Vercel personal team was selected and projects were listed, but the available MCP tools do not expose project creation; deployment remains prepared but not live.
- **Remaining:** Pipedrive internal test/config lead setup is blocked because the Pipedream action requires final runnable action/person-organization selection.

## Recommended next actions

1. Harden Supabase Storage privacy for `driver-documents` and `vehicle-photos`, then update signed URL/admin/driver access docs.
2. Replace or migrate `apps/admin_app/middleware.ts` to the Next.js `proxy` convention when prioritizing deployment polish.
3. Execute rider prompt `01-foundation-setup.md` only after confirming rider trip request RLS/RPC design.
4. Configure GA4 web streams and place the resulting measurement IDs in the web app environments.
5. Configure Payfast sandbox/live credentials and callback URLs, then run a real ITN/subscription smoke test.
6. Expand admin `analytics`, `payments`, and `settings` from scaffolding into role-gated operational surfaces.
7. Replace driver placeholder smoke test with real widget/provider tests for go-online and cancellation reason behavior.

