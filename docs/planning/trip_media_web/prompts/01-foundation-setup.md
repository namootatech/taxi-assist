# 01 — Foundation setup (Trip Media Web)

**Goal:** Scaffold `apps/trip_media_web` as Next.js 15 + Supabase SSR auth shell.

## Deliverables

1. Next.js App Router project with Tailwind; env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Middleware + session refresh pattern consistent with `apps/admin_app` (or official `@supabase/ssr` cookie pattern).
3. Routes: `/login`, `/signup` stubs, `/dashboard` protected layout placeholder.
4. `README.md` linking to `docs/planning/trip_media_web/planning/`.

## Acceptance

- `pnpm dev` / `npm run dev` shows login shell; unauthenticated users redirect from `/dashboard`.

**Depends on:** `technical-implementation.md`, ADR 003 (auth only—no billing yet).

**Do not implement:** Payfast/Paystack, webhooks, or campaign CRUD.
