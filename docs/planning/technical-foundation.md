# Technical foundation

**Sources:** Driver `technical-implementation.md`, admin `app-prd.md` / `technical-implementation.md`, `supabase/` layout, `apps/*/package.json` / `pubspec.yaml`

## Stack

| Layer | Choice | Confidence |
|-------|--------|------------|
| Mobile (driver) | Flutter 3.24+, Riverpod, Supabase Flutter, Maps + Geolocator | **High** |
| Admin web | Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Table/Query, RHF+Zod | **High** |
| Backend | Supabase Postgres + Auth + Storage + Realtime (+ Edge Functions where needed) | **High** |
| DB extensions | PostGIS (per driver tech spec) | **Medium** (confirm applied migrations) |
| Hosting | Vercel (admin), mobile stores / sideload for pilot (driver) | **Medium** |

## Authentication & authorization

- Supabase Auth (email/password; OTP patterns described for SA).
- **RLS** as primary enforcement; admin access via `admin_profiles` + helpers (**planned** per schema gap).
- JWT / session patterns per client SDK best practices.

## API / data access

- Client-heavy: direct Supabase from Flutter/Next with RLS.
- **RPCs** for sensitive transitions (driver trip transitions already pattern).

## CI/CD & environments

- Migrations in `supabase/migrations/`; apply to dev/staging/prod in order.
- Seed data documented in `docs/system/seed-data.md` (**migrated path**).

## Gaps (planning reference only)

See `docs/planning/schema-gap-analysis.md` for admin RBAC, wallets ledger, ads tables, audit logs, trip_events, storage hardening.

## Confidence summary

- **High:** Flutter + Supabase driver architecture; Next admin stack choice.
- **Medium:** FCM vs Supabase-only push; exact hosting for Supabase project.
- **Low:** Rider app framework if not Flutter; long-term analytics warehouse.
