# Platform architecture & ecosystem

**Sources:** Admin PRD, driver PRD/tech spec, rider `planning/app-prd.md`, `supporting-documents/idea.md`, repo layout (`apps/admin_app`, `apps/driver_app`, `supabase/`)

## Applications

| Application | Stack | Responsibility |
|-------------|--------|----------------|
| **driver_app** | Flutter + Supabase | Driver/owner onboarding, documents, go-online, trip execution, earnings, support entry. |
| **admin_app** | Next.js 15 + Supabase | Internal RBAC console: verification, trips oversight, wallets/finance hooks, ads, tickets, audit. |
| **rider_app** | **Planned:** Flutter + Supabase (see `rider_app/planning/technical-implementation.md`) | Booking, in-trip ads (Taxi Assist Media), wallet, profile, payments, safety; **docs** at `docs/planning/rider_app/` — **no** `apps/rider_app` yet. |

## Shared platform

- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions as needed).
- **Data:** Single database; **RLS** as primary authorization; RPCs for sensitive transitions (e.g. driver trip transitions).
- **Integrations:** Maps (Google/Apple deep links), FCM or equivalent for push (per tech specs).

## Inter-app relationships

- Admin **mutates** verification state on entities drivers/riders create in client apps.
- Rider ↔ Driver matching and trip lifecycle live in **shared** `trips` / location tables (driver app implements driver side today).
- **Taxi Assist Media** campaigns and rewards touch rider experience primarily in MVP; admin manages inventory; schema gaps tracked in `schema-gap-analysis.md`.

## Confidence

| Decision | Level |
|----------|--------|
| Supabase as system of record | **High** (implemented migrations + apps) |
| Next.js admin + Flutter driver | **High** |
| Rider as Flutter app in monorepo | **Medium** (planning complete; implementation folder TBD) |
