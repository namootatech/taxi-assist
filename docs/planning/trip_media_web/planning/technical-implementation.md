# Trip Media Web App — Technical implementation

**Stack (implemented):** Next.js App Router, TypeScript, Tailwind CSS, Supabase JS v2 (`@supabase/ssr` for cookies), Sentry, GA hook, and Payfast-first billing scaffolding.

**Source:** codebase scan 2026-05-08 (`apps/trip_media_web`, `supabase/migrations/20260508073600_trip_media_partner_core.sql`, `supabase/migrations/20260508073700_trip_media_partner_policies.sql`, `supabase/functions/payfast-webhook/index.ts`).

## Architecture

- **Frontend:** `apps/trip_media_web`.
- **Backend:** Supabase Postgres + Auth + Storage; **Edge Functions** for:
  - `create-payfast-checkout` placeholder,
  - `payfast-webhook`,
  - `paystack-webhook` placeholder,
  - optional `sync-subscription` cron.
- **Next.js route handler:** `apps/trip_media_web/app/api/payfast-webhook/route.ts` handles Payfast ITN callbacks for Vercel-style deployment.

## Auth

- Email/password or magic link; enforce email verification before campaign activation.
- Session via SSR-safe Supabase client; no separate auth vendor.
- Signup creates a `media_partners` row, owner `partner_members` row, and starter trial subscription when service-role env vars are configured.

## Storage

- Bucket `partner-ad-creatives` is created private in migration.
- Partner-prefixed storage select/insert policies exist.
- Current UI captures creative metadata; signed upload byte transfer and preview URL flow still need end-to-end validation.

## Billing

- **Never** trust client for subscription state; webhooks update `partner_subscriptions`.
- Store webhook ids in `partner_billing_events`; return 200 after idempotent processing.
- **Secrets:** provider keys only in Edge env, not client.
- Payfast checkout URLs are generated server-side from package and partner state.
- Payfast ITN signature verification uses sorted fields, optional passphrase, and MD5, with idempotency through `partner_billing_events`.
- Paystack remains a secondary-provider placeholder per Payfast-first implementation scope.

## Realtime (optional MVP)

- Subscribe to campaign status or processing jobs for “creative approved” updates.

## Observability

- Structured logs on Edge; alert on webhook failures and duplicate subscription drift.

## Security

- RLS: partner_membership drives access.
- Rate-limit public signup and upload endpoints (Edge or platform WAF).
- Sanitize CTA URLs; block known-malicious patterns.
- Partner membership helpers live in private schema `trip_private`.
- No separate auth or JWT user-metadata authorization system is introduced.

## External services

- GA4 property created in `bqwabi`: `properties/536741693`.
- Web stream / measurement ID still needs to be created and added to `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- Sentry project exists: `trip-media-web` under `namoota`.
- Vercel personal team was discovered, but project creation/deployment was not available through exposed MCP tools.

## Monorepo

- Shared types package optional for `ad_campaigns` enums used by admin later.

## References

- `docs/planning/technical-foundation.md`
- ADR 003
