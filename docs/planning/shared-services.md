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
| **Ads / Taxi Assist Media** | `public.ad_campaigns`, `public.ad_views` (+ partner extensions per `trip_media_web` data model) | rider (playback), **trip_media_web** (partner CRUD), admin (moderation/takedown/analytics) | **Partial / live for admin** (campaign/view tables exist; rider reward + partner entitlement flows still planned) |
| **Partner billing (subscriptions)** | Payfast / Paystack via Edge Functions + `partner_subscriptions` (planned) | trip_media_web | **Not implemented** |
| **Marketing leads (optional)** | Edge + `marketing_leads` or external CRM | trip_website | **Not implemented** |
| **Support** | `public.support_tickets` | driver_app, admin_app, rider_app (planned) | **Partial** |
| **Payouts** | `public.payouts` | driver_app, admin_app | **Partial** |
| **Audit** | `public.audit_logs`, `public.admin_audit_log(...)`, `public.trip_events` | admin_app only | **Partial / live** (admin audit + trip event stream exist; broaden trigger/RPC coverage as features mature) |

## Rules

- New paid, identity, or messaging subsystem → update **this file** + platform architecture + ADR if it changes boundaries.

**Sources:** Admin business/PRD entities, `schema-gap-analysis.md`, codebase scan 2026-05-08 (`supabase/migrations/20260507153000_admin_rbac_audit_and_admin_rls.sql`, `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`)
