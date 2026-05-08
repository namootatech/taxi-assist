# Project summary (AI bootstrap)

**Last APD-State Engine run:** 2026-05-08 (code/docs/state reconciliation)

## One-liner

**Trip / Taxi Assist** — South African ride-hailing + media credits platform: **Flutter driver app**, **Next.js admin**, **Trip Website**, and **Trip Media Web** against **Supabase**. Driver/admin are substantial in-progress apps; Trip Website and Trip Media Web now have foundation scaffolds. **Rider** is fully planned but has no app folder yet.

## Architecture snapshot

- **Data plane:** Single Supabase Postgres with RLS; RPCs for trip transitions; Realtime on key tables; admin RBAC/audit, wallets, ads, trip events, and expiry automation now have migrations.
- **Clients:** `apps/driver_app` (Flutter), `apps/admin_app` (Next.js 15), `apps/trip_media_web` (Next.js partner portal foundation), `apps/trip_website` (Next.js marketing foundation), **rider** TBD `apps/rider_app`.
- **Docs:** Canonical planning under `docs/planning/<app>/`; raw intake under `docs/planning/supporting-documents/`.

## Applications

| App | Repo path | Doc path | Status |
|-----|-----------|----------|--------|
| Driver | `apps/driver_app` | `docs/planning/drivers/` | In progress |
| Admin | `apps/admin_app` | `docs/planning/admin/` | In progress |
| Rider | *planned* `apps/rider_app` | `docs/planning/rider_app/` | **Planning (docs complete)** |
| Trip Media Web | `apps/trip_media_web` | `docs/planning/trip_media_web/` | In progress (foundation scaffold) |
| Trip Website | `apps/trip_website` | `docs/planning/trip_website/` | In progress (foundation scaffold) |

## Naming convention note

Global Cursor rules may reference **numbered** platform files (`01-product-vision.md`, …). This repository uses **kebab-case** names (`product-vision-and-concept.md`, …). Prefer **this repo’s filenames** when editing here; update rules or add symlinks if tooling requires numbers.

## Key constraints

- Compliance-first onboarding; document expiry; pilot corridors.
- No duplicate auth systems—Supabase Auth only.
- Remaining schema/product gaps: partner orgs/subscriptions/creatives + billing webhooks, Trip Website lead capture/CRM sync, storage privacy hardening, **rider trip request + rider trip_locations write**, and deeper admin operations flows. See `docs/planning/schema-gap-analysis.md` and `docs/system/drift-report.md`.

## Seed & test users

See `docs/system/seed-data.md`.

## Open questions

- Current drift report: `docs/system/drift-report.md` (6 recommended next actions).
- Create `apps/rider_app` when executing `docs/planning/rider_app/prompts/01-foundation-setup.md`.
- Select GA4 and Vercel accounts before provisioning measurement IDs and deployments for `apps/trip_media_web` and `apps/trip_website`.
- Partner packages: default trial length and welcome credit amounts; creative moderation SLA.
- Payment provider nuance: Payfast vs Paystack SKUs for same tiers (ADR 003).
- In-app messaging transport; final push provider; storage privacy rollout order.
