# Project summary (AI bootstrap)

**Last APD-Resume run:** 2026-05-08 (rider app planning added)

## One-liner

**Trip / Taxi Assist** — South African ride-hailing + media credits platform: **Flutter driver app** and **Next.js admin** against **Supabase**; **rider** app fully specified under `docs/planning/rider_app/` (Flutter+Supabase default), **`apps/rider_app` not created yet**.

## Architecture snapshot

- **Data plane:** Single Supabase Postgres with RLS; RPCs for trip transitions; Realtime on key tables.
- **Clients:** `apps/driver_app` (Flutter), `apps/admin_app` (Next.js 15), **rider client TBD at `apps/rider_app`**.
- **Docs:** Canonical planning under `docs/planning/<app>/`; raw intake under `docs/planning/supporting-documents/`.

## Applications

| App | Repo path | Doc path | Status |
|-----|-----------|----------|--------|
| Driver | `apps/driver_app` | `docs/planning/drivers/` | In progress |
| Admin | `apps/admin_app` | `docs/planning/admin/` | Planning |
| Rider | *planned* `apps/rider_app` | `docs/planning/rider_app/` | **Planning (docs complete)** |

## Naming convention note

Global Cursor rules may reference **numbered** platform files (`01-product-vision.md`, …). This repository uses **kebab-case** names (`product-vision-and-concept.md`, …). Prefer **this repo’s filenames** when editing here; update rules or add symlinks if tooling requires numbers.

## Key constraints

- Compliance-first onboarding; document expiry; pilot corridors.
- No duplicate auth systems—Supabase Auth only.
- Schema gaps for admin wallets, ads, audit log, **rider trip request + rider trip_locations write**: see `docs/planning/schema-gap-analysis.md`.

## Seed & test users

See `docs/system/seed-data.md`.

## Open questions

- Create `apps/rider_app` when executing `docs/planning/rider_app/prompts/01-foundation-setup.md`.
- Payment provider and in-app messaging transport.
- Final push provider and storage privacy rollout order.
