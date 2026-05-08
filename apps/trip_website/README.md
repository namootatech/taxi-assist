# Trip Website

Public marketing site for Trip / Taxi Assist.

## Planning

- `docs/planning/trip_website/planning/app-prd.md`
- `docs/planning/trip_website/planning/user-flows-and-ux-logic.md`
- `docs/planning/trip_website/planning/technical-implementation.md`
- `docs/planning/trip_website/prompts/01-foundation-setup.md`

## Local development

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill in public URLs when the app store, partner portal, analytics, and Sentry resources are ready.

## Observability and deployment

- Sentry project: `trip-website` in the `namoota` organization.
- Google Analytics: `NEXT_PUBLIC_GA_MEASUREMENT_ID` is wired, but GA4 property creation is pending account selection.
- Vercel: app is deploy-ready as a standalone Next.js app; select the intended Vercel team before project creation/deployment.
- Pipedrive: production lead capture is deferred. Pipedream setup reached the point of needing a runnable organization/lead action.

## Imagery

Hero image selected through Pipedream Unsplash MCP:

- Source: https://unsplash.com/photos/people-crossing-a-busy-road-with-cars-driving-uMaxlNR6NyI
- Photographer: proudlyswazi

## Current scope

Implemented public routes:

- `/`
- `/about`
- `/riders`
- `/drivers`
- `/advertise`
- `/contact`
- `/legal/privacy`
- `/legal/terms`

Lead capture writes to `marketing_leads` when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Without those values, the form still returns a friendly confirmation for preview environments.

CRM sync remains deferred until the production Pipedrive workflow is confirmed.
