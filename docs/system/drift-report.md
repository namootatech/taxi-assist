# Drift report — 2026-05-08

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Implemented apps | 4 | `apps/driver_app`, `apps/admin_app`, `apps/trip_media_web`, `apps/trip_website` |
| Planned apps with no code folder | 1 | `rider_app` |
| Shared-service docs corrected this run | 5 | Wallet/ledger, ads, audit, partner billing, and marketing leads now reflect migration reality |
| Remaining high-priority schema/API gaps | 3 | Rider write paths, storage privacy hardening, deeper admin intervention/payout flows |

## Auth integration drift (Clerk + Supabase)

- **Admin + Trip Media Web:** Removed legacy Supabase session exchange/logout routes and now rely on **Clerk JWT as bearer** for Supabase RLS. Trip Media legacy email/password Supabase Auth actions/forms were removed.
- **Driver App:** Still uses Supabase Auth (`signInWithOtp` / OTP). A future task should migrate Flutter auth to Clerk or explicitly document why it remains on Supabase Auth.
- **New user sync:** Added `supabase/functions/clerk-webhook` + migration `supabase/migrations/20260508192911_clerk_profiles.sql` to sync Clerk users into `public.clerk_profiles` keyed by `auth.jwt() ->> 'sub'`.

## App map

| App | Code path | Doc path | Status | Match |
|-----|-----------|----------|--------|-------|
| `driver_app` | `apps/driver_app` | `docs/planning/drivers` | `in-progress` | Code substantially implements auth, onboarding, documents, home/go-online, trip lifecycle, support, profile, and earnings. Still not full launch-ready testing/deployment. |
| `admin_app` | `apps/admin_app` | `docs/planning/admin` | `in-progress` | Trip Media admin buildout 2026-05-08 lifted the console to ~90% of `docs/planning/trip_media_web/about.md` admin sections: new `Trip Media` sidebar group with `/trip-media/{overview,advertisers,rider-rewards,fraud,analytics,reports,settings}` alongside existing `/creatives` and `/ads`, `fraud_analyst` role and full capability matrix in `lib/permissions.ts`, route gates in `proxy.ts`, migration `supabase/migrations/20260508140000_trip_media_admin_oversight.sql` (extends `ad_creatives` + `ad_campaigns`, adds `ad_fraud_signals`, `ad_reward_holds`, `creative_categories`, `trip_media_settings` (seeded), `admin_report_runs`, views `vw_trip_media_overview` + `vw_fraud_candidates`, plus 12 `SECURITY DEFINER` RPCs), creative review with signed-URL preview and full action set, campaign drawer with Pause/Resume/Force-stop/Adjust delivery, advertiser detail tabs, rider reward freeze/reverse, fraud triage console, 14-day analytics bundle, four streamed CSV reports (audited via `admin_record_report_run`), and Trip Media settings forms. Forms standardised on `react-hook-form + zod + sonner`; `window.prompt` replaced with `components/trip-media/PromptDialog.tsx`. Verification, entity browsing, trips, wallets, support, audit, and admin pages were already in place. Analytics/payments/settings outside Trip Media still need expansion. |
| `rider_app` | Missing | `docs/planning/rider_app` | `planning` | Docs complete; app scaffold and rider trip/wallet/ad write paths are missing. |
| `trip_media_web` | `apps/trip_media_web` | `docs/planning/trip_media_web` | `core-complete` | Portal buildout 2026-05-08 lifted the app to ~90% of `docs/planning/trip_media_web/about.md`: AppShell + sidebar, live dashboard, full team flow with link-shareable invites (no email delivery; `partner_invites` + `public.get_partner_invite_preview` / `public.accept_partner_invite`), role explainers + `lib/permissions.ts` gating, drag-and-drop creative upload to `partner-ad-creatives` with signed-URL preview, campaign `DRAFT/PENDING_REVIEW/ACTIVE/PAUSED/COMPLETED/REJECTED` lifecycle with start/end dates, settings (org/account/danger-zone), notifications inbox + welcome seed, honest analytics, richer billing with billing events + past-due banner, forms migrated to `react-hook-form + zod + sonner`. Production provider credentials, live subscription verification, and rider impression analytics remain external follow-ups. |
| `trip_website` | `apps/trip_website` | `docs/planning/trip_website` | `in-progress` | Prompts 01-05 are implemented to MVP depth: public route coverage, metadata, lead capture, `marketing_leads` migration, sitemap/robots, GA/Sentry env wiring, APD-Market copy, design polish, and README updates. Production CRM sync and GA4 web stream IDs remain external setup items. |

## Undocumented code / doc lag

- `supabase/migrations/20260508073500_trip_website_marketing_leads.sql` implements `marketing_leads`; `docs/planning/trip_website/planning/data-model-and-app-entities.md`, `technical-implementation.md`, and `shared-services.md` were updated this run.
- `supabase/migrations/20260508073600_trip_media_partner_core.sql` and `20260508073700_trip_media_partner_policies.sql` implement Trip Media partner tables/RLS/storage; `docs/planning/trip_media_web/planning/data-model-and-app-entities.md`, `technical-implementation.md`, `schema-gap-analysis.md`, and `shared-services.md` were updated this run.
- `apps/trip_media_web/app/api/payfast-webhook/route.ts` and `supabase/functions/payfast-webhook/index.ts` implement Payfast-first webhook scaffolding; Trip Media technical docs now reflect the Payfast-first/Paystack-placeholder boundary.
- `supabase/migrations/20260508120000_trip_media_partner_invites.sql` implements `public.partner_invites`, `public.partner_notifications`, and the `public.get_partner_invite_preview` / `public.accept_partner_invite` RPCs, plus the extended `ad_campaigns` columns (`start_date`, `end_date`, `submitted_at`, `activated_at`, `review_note`) and status values (`PENDING_REVIEW`, `COMPLETED`, `ENDED`, `REJECTED`). `docs/planning/trip_media_web/planning/data-model-and-app-entities.md` and `user-flows-and-ux-logic.md` were updated this run; `apps/trip_media_web/README.md` documents the link-shareable invite UX.
- `supabase/migrations/20260508140000_trip_media_admin_oversight.sql` extends admin oversight surface — `ad_creatives` and `ad_campaigns` enums + columns, plus new tables (`creative_categories`, `ad_fraud_signals`, `ad_reward_holds`, `trip_media_settings`, `admin_report_runs`), views (`vw_trip_media_overview`, `vw_fraud_candidates`), and `SECURITY DEFINER` RPCs (`admin_set_creative_status`, `admin_set_campaign_status`, `admin_adjust_campaign_delivery`, `admin_freeze_reward`, `admin_reverse_reward`, `admin_log_fraud_signal`, `admin_set_fraud_signal_status`, `admin_set_fraud_signal_level`, `admin_set_partner_status`, `admin_adjust_partner_credits`, `admin_set_trip_media_setting`, `admin_record_report_run`). Storage policy on `partner-ad-creatives` extended so admins can read for signed-URL preview. `docs/planning/admin/planning/{user-roles-and-permissions.md, data-model-and-app-entities.md §11, user-flows-and-ux-logic.md, technical-implementation.md §10, app-prd.md}` and `docs/system/admin_app/README.md` were updated this run.

## Missing in code

- `apps/rider_app` does not exist yet, despite complete planning docs and prompt chain.
- Production Pipedrive CRM sync for Trip Website lead capture is not present; lead persistence now exists via `marketing_leads`.
- Trip Media Payfast provider credentials, dashboard callback URLs, and live/sandbox subscription verification are not configured in this repo.
- Rider app execution paths remain missing: rider trip request RPC/RLS, rider `trip_locations` write policies, wallet spend flows, and ad reward credit flow.
- Admin top-level `analytics`, `payments`, and (non Trip Media) `settings` routes are still scaffolding. Trip Media analytics, reports, and settings now ship as full surfaces under `/trip-media/*`.
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
6. Expand admin top-level `analytics`, `payments`, and `settings` from scaffolding into role-gated operational surfaces (Trip Media equivalents already shipped).
7. Replace driver placeholder smoke test with real widget/provider tests for go-online and cancellation reason behavior.
8. Deploy `supabase/functions/clerk-webhook` and set `CLERK_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in Supabase Function env vars.

