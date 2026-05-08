# Project summary (AI bootstrap)

**Last APD-Resume run:** 2026-05-08 (rider app + Trip Media Web + Trip Website planning)

## One-liner

**Trip / Taxi Assist** — South African ride-hailing + media credits platform: **Flutter driver app** and **Next.js admin** against **Supabase**; **rider** app specified under `docs/planning/rider_app/`. **Trip Media Web** (partner self-serve ads + Payfast/Paystack subscriptions, trials/credits) and **Trip Website** (marketing, leads, downloads) are fully **planned**; app folders **not created yet**. See ADR 003 for partner vs admin boundary.

## Architecture snapshot

- **Data plane:** Single Supabase Postgres with RLS; RPCs for trip transitions; Realtime on key tables.
- **Clients:** `apps/driver_app` (Flutter), `apps/admin_app` (Next.js 15), **rider** TBD `apps/rider_app`, **partner portal** TBD `apps/trip_media_web`, **marketing** TBD `apps/trip_website`.
- **Docs:** Canonical planning under `docs/planning/<app>/`; raw intake under `docs/planning/supporting-documents/`.

## Applications

| App | Repo path | Doc path | Status |
|-----|-----------|----------|--------|
| Driver | `apps/driver_app` | `docs/planning/drivers/` | In progress |
| Admin | `apps/admin_app` | `docs/planning/admin/` | Planning |
| Rider | *planned* `apps/rider_app` | `docs/planning/rider_app/` | **Planning (docs complete)** |
| Trip Media Web | *planned* `apps/trip_media_web` | `docs/planning/trip_media_web/` | **Planning (docs complete)** |
| Trip Website | *planned* `apps/trip_website` | `docs/planning/trip_website/` | **Planning (docs complete)** |

## Naming convention note

Global Cursor rules may reference **numbered** platform files (`01-product-vision.md`, …). This repository uses **kebab-case** names (`product-vision-and-concept.md`, …). Prefer **this repo’s filenames** when editing here; update rules or add symlinks if tooling requires numbers.

## Key constraints

- Compliance-first onboarding; document expiry; pilot corridors.
- No duplicate auth systems—Supabase Auth only.
- Schema gaps for admin wallets, ads, partner orgs/subscriptions/creatives, audit log, **rider trip request + rider trip_locations write**: see `docs/planning/schema-gap-analysis.md`.

## Seed & test users

See `docs/system/seed-data.md`.

## Open questions

- Create `apps/rider_app` when executing `docs/planning/rider_app/prompts/01-foundation-setup.md`.
- Create `apps/trip_media_web` and `apps/trip_website` from their `prompts/01-foundation-setup.md`.
- Partner packages: default trial length and welcome credit amounts; creative moderation SLA.
- Payment provider nuance: Payfast vs Paystack SKUs for same tiers (ADR 003).
- In-app messaging transport; final push provider; storage privacy rollout order.
