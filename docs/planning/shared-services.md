# Shared services registry

Central systems **must not** be re-implemented per app. One implementation, many consumers.

| Service | Owner / source | Consumers | Status |
|---------|----------------|------------|--------|
| **Authentication** | Supabase Auth | driver_app, admin_app, rider_app (planned) | **Live** |
| **User profiles** | `public.profiles` (+ future rider-specific extensions) | all apps | **Live** (driver-focused fields today) |
| **Documents & storage** | `public.documents` + Storage buckets | driver onboarding, admin verification | **Live** (privacy hardening **planned**) |
| **Trips & locations** | `public.trips`, `public.trip_locations`, RPCs | driver_app, admin_app, rider_app (planned) | **Partial** (driver path strong; rider RLS/write paths TBD) |
| **Notifications** | FCM / Edge triggers (per specs) | driver, rider, admin | **Mixed / TBD** |
| **Wallet & ledger** | Planned `wallets` + `wallet_transactions` | rider, driver, admin | **Not implemented** (see schema gap) |
| **Ads / Taxi Assist Media** | Planned `ad_campaigns`, `ad_views` | rider (playback), admin (CRUD), analytics | **Not implemented** |
| **Support** | `public.support_tickets` | driver_app, admin_app, rider_app (planned) | **Partial** |
| **Payouts** | `public.payouts` | driver_app, admin_app | **Partial** |
| **Audit** | Planned `audit_logs` | admin_app only | **Not implemented** |

## Rules

- New paid, identity, or messaging subsystem → update **this file** + platform architecture + ADR if it changes boundaries.

**Sources:** Admin business/PRD entities, `schema-gap-analysis.md`
