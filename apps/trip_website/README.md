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

Copy `.env.example` to `.env.local` and set the required values below.

| Variable | Required | Purpose |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key used to invoke the `send-email` Edge Function |
| `SUPABASE_URL` | Recommended | Server-side fallback URL for Supabase calls |
| `SUPABASE_ANON_KEY` | Recommended | Server-side fallback anon key for function calls |
| `EMAIL_INTERNAL_SECRET` | Yes | Shared secret sent to the `send-email` Edge Function |

Supabase function secrets for email delivery are documented in `supabase/functions/send-email/README.md`.

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
