# Trip Website — Technical implementation

**Stack (implemented):** Next.js App Router, TypeScript, Tailwind CSS, Sentry for observability, GA hook, and Supabase service-role persistence for lead capture.

**Source:** codebase scan 2026-05-08 (`apps/trip_website`, `supabase/migrations/20260508073500_trip_website_marketing_leads.sql`).

## Host

- Prepared for Vercel. Vercel personal team was discovered through MCP, but project creation/deployment was not available through the exposed tools during the latest run.

## Content

- **Phase 1:** TSX pages for `/`, `/about`, `/riders`, `/drivers`, `/advertise`, `/contact`, `/legal/privacy`, `/legal/terms`.
- **Phase 2:** Headless CMS if non-dev edits needed frequently.

## Forms

- Server Action in `apps/trip_website/app/contact/actions.ts`.
- Validates with Zod, uses a honeypot, captures UTM metadata, and writes to `marketing_leads` when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Production Pipedrive/CRM sync remains pending.

## Performance

- Image optimization for Unsplash-sourced hero.
- `robots.ts` and `sitemap.ts` are implemented.
- Lighthouse targets ≥ 90 performance on home (best effort).

## Environment

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TRIP_MEDIA_WEB_URL`
- `NEXT_PUBLIC_RIDER_APP_STORE_URL`
- `NEXT_PUBLIC_DRIVER_APP_STORE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Sentry env vars from `.env.example`

## External services

- GA4 property created in `bqwabi`: `properties/536792786`.
- Web stream / measurement ID still needs to be created and added to `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

## References

- `docs/planning/technical-foundation.md`
