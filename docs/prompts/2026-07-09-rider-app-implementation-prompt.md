# Rider app implementation prompt (2026-07-09)

## Goal

Ship the **Taxi Assist Rider** Flutter client (`apps/rider_app`) on the shared Supabase project: email/password auth, RIDER profiles, booking and live trip tracking, post-trip rating/tip, wallet and Taxi Assist Media, and safety shell pages — mirroring `apps/driver_app` patterns with rider-specific RPCs and RLS.

## Context

**Exists**

- Planning six-pack under `docs/planning/rider_app/`
- Driver app reference implementation (`apps/driver_app`)
- Shared trips, wallets, ads, documents schema (partial rider coverage)
- Prompts 01–05 in `docs/planning/rider_app/prompts/`

**Missing (this build)**

- `apps/rider_app` scaffold and features
- `supabase/migrations/20260709120000_rider_app_core.sql`
- Rider RPCs: `rider_request_trip`, `rider_cancel_trip`, `rider_rate_completed_trip`
- `emergency_contacts`, `payment_methods`, rider SELECT policies
- `docs/system/rider_app/` API, deployment, UX checklist

## Scope

| In scope | Out of scope |
|----------|----------------|
| `apps/rider_app` Flutter + Riverpod | Production store release |
| `supabase/migrations/` only (shared DB) | Firebase |
| Email/password auth (MVP) | Phone OTP (documented, deferred) |
| Booking, tracking, rating, wallet, ads UI | Matching algorithm, surge pricing |
| Widget tests + deployment docs | Rewriting driver RPCs |

## Plan link

- [Rider app build plan](/Users/nonwork/.cursor/plans/rider_app_build_01bc282f.plan.md)
- Planning: `docs/planning/rider_app/`

## Implementation instructions

1. **Housekeeping** — this prompt, `docs/prompts/README.md` row, `project-state.json` → `rider_app: in-progress`.
2. **Migration** — apply `20260709120000_rider_app_core.sql`; update `schema-gap-analysis.md`; add `docs/system/rider_app/api.md`.
3. **Scaffold** — `flutter create` + mirror driver deps, env sync, folder layout, MainShell drawer.
4. **Design system** — run ui-ux-pro-max `--persist`; wire tokens in `app_theme.dart`.
5. **Auth** — register/login/forgot-password; `RiderProfile`; PENDING/APPROVED gate; document upload.
6. **Core** — booking wizard, `TripService` (Realtime `rider_id`), active/post-trip, shell pages.
7. **UI/UX** — maps, trip banners, ad playback via `record_ad_view_event`, wallet/media screens, `ux-checklist.md`.
8. **Tests** — widget tests; `deployment.md`; optional CI `flutter test`.

## Acceptance

- `cd apps/rider_app && flutter analyze` clean (or documented exceptions)
- `flutter test` passes locally
- New rider signup creates `profiles` row with `profile_type = RIDER`
- `rider_request_trip` returns trip row against dev Supabase
- `ux-checklist.md` MVP items checked
