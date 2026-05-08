# Trip Media Web App — Technical implementation

**Stack (proposed):** Next.js 15 (App Router), TypeScript, Tailwind, Supabase JS v2 (`@supabase/ssr` for cookies), aligned with `apps/admin_app` patterns.

## Architecture

- **Frontend:** `apps/trip_media_web` (path TBD—create when executing prompts).
- **Backend:** Supabase Postgres + Auth + Storage; **Edge Functions** for:
  - `create-partner-checkout` (provider-specific),
  - `billing-webhook-payfast`, `billing-webhook-paystack` (separate endpoints or unified with `provider` header),
  - optional `sync-subscription` cron.

## Auth

- Email/password or magic link; enforce email verification before campaign activation.
- Session via SSR-safe Supabase client; no separate auth vendor.

## Storage

- Bucket e.g. `partner-ad-creatives` (private); signed URLs for preview; MIME and size limits at upload.

## Billing

- **Never** trust client for subscription state; webhooks update `partner_subscriptions`.
- Store webhook ids in `partner_billing_events`; return 200 after idempotent processing.
- **Secrets:** provider keys only in Edge env, not client.

## Realtime (optional MVP)

- Subscribe to campaign status or processing jobs for “creative approved” updates.

## Observability

- Structured logs on Edge; alert on webhook failures and duplicate subscription drift.

## Security

- RLS: partner_membership drives access.
- Rate-limit public signup and upload endpoints (Edge or platform WAF).
- Sanitize CTA URLs; block known-malicious patterns.

## Monorepo

- Shared types package optional for `ad_campaigns` enums used by admin later.

## References

- `docs/planning/technical-foundation.md`
- ADR 003
