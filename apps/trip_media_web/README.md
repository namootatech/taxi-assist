# Trip Media Web

Partner-facing portal for Taxi Assist Media.

## Planning

- `docs/planning/trip_media_web/planning/app-prd.md`
- `docs/planning/trip_media_web/planning/user-flows-and-ux-logic.md`
- `docs/planning/trip_media_web/planning/technical-implementation.md`
- `docs/planning/trip_media_web/prompts/01-foundation-setup.md`

## Local development

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase, analytics, and Sentry values.

## Observability and deployment

- Sentry project: `trip-media-web` in the `namoota` organization.
- Google Analytics: `NEXT_PUBLIC_GA_MEASUREMENT_ID` is wired, but GA4 property creation is pending account selection.
- Vercel: app is deploy-ready as a standalone Next.js app; select the intended Vercel team before project creation/deployment.

## Current scope

This is the foundation prompt only: Next.js app shell, Supabase SSR clients, login/signup routes, protected dashboard placeholder, environment example, and README.

Payfast/Paystack, webhooks, package billing, creative upload, and campaign CRUD are intentionally deferred to later prompts.
