# Shared services registry

Central systems **must not** be re-implemented per app. One implementation, many consumers.

| Service | Owner / source | Consumers | Status |
|---------|----------------|------------|--------|
| **Authentication** | Supabase Auth | driver_app, admin_app, rider_app (planned) | **Live** |
| **User profiles** | `public.profiles` (+ future rider-specific extensions) | all apps | **Live** (driver-focused fields today) |
| **Documents & storage** | `public.documents` + Storage buckets | driver onboarding, admin verification | **Live** (privacy hardening **planned**) |
| **Trips & locations** | `public.trips`, `public.trip_locations`, RPCs | driver_app, admin_app, rider_app (planned) | **Partial** (driver path strong; rider RLS/write paths TBD) |
| **Notifications** | FCM / Edge triggers (per specs) | driver, rider, admin | **Mixed / TBD** |
| **Wallet & ledger** | `public.wallets`, `public.wallet_transactions`, `public.admin_wallet_adjust(...)` | rider, driver, admin | **Partial / live for admin** (tables + admin adjustment RPC exist; rider/client flows still planned) |
| **Ads / Taxi Assist Media** | `public.ad_campaigns`, `public.ad_views`, `public.ad_creatives`, partner extensions | rider (playback), **trip_media_web** (partner CRUD), admin (moderation/takedown/analytics) | **Partial / live for admin + partner MVP** (campaign/view tables, partner creative metadata, partner campaign drafts, and RLS exist; rider reward flow and production delivery still planned) |
| **Partner billing (subscriptions)** | Payfast-first checkout/webhook + `partner_subscriptions`, `partner_billing_events`; Paystack placeholder | trip_media_web | **Partial / MVP** (schema, package catalog, checkout URL generation, Payfast webhook idempotency, and Edge Function scaffold exist; provider credentials/live sandbox smoke test pending) |
| **Marketing leads (optional)** | Server Action + `marketing_leads`; future CRM sync | trip_website | **Partial / MVP** (POPIA-aware public form and Supabase persistence exist; production Pipedrive/CRM sync pending) |
| **Support** | `public.support_tickets` | driver_app, admin_app, rider_app (planned) | **Partial** |
| **Payouts** | `public.payouts` | driver_app, admin_app | **Partial** |
| **Audit** | `public.audit_logs`, `public.admin_audit_log(...)`, `public.trip_events` | admin_app only | **Partial / live** (admin audit + trip event stream exist; broaden trigger/RPC coverage as features mature) |

## Rules

- New paid, identity, or messaging subsystem → update **this file** + platform architecture + ADR if it changes boundaries.

**Sources:** Admin business/PRD entities, `schema-gap-analysis.md`, codebase scan 2026-05-08 (`supabase/migrations/20260507153000_admin_rbac_audit_and_admin_rls.sql`, `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`, `20260508073500_trip_website_marketing_leads.sql`, `20260508073600_trip_media_partner_core.sql`, `20260508073700_trip_media_partner_policies.sql`)
