# Trip Media Web App — Data model & entities

**Source:** codebase scan 2026-05-08.

Tables below have implementation anchors in `supabase/migrations/20260508073600_trip_media_partner_core.sql`, RLS/storage anchors in `supabase/migrations/20260508073700_trip_media_partner_policies.sql`, and invite/notification anchors in `supabase/migrations/20260508120000_trip_media_partner_invites.sql`. Production provider credentials and live subscription verification remain pending.

## Core entities

### `media_partners`

- `id` (uuid, PK)
- `name`, `legal_name` (optional), `registration_number` (optional)
- `billing_country`, `billing_currency` (default ZAR)
- `billing_provider` (`payfast` | `paystack` | null pre-checkout)
- `status` (`active` | `suspended` | `closed`)
- `trial_ends_at` (nullable), `promotional_credits_balance` (integer impression-credit unit)
- `created_at`, `updated_at`

### `partner_members`

- `id` (uuid, PK)
- `partner_id` → `media_partners`
- `user_id` → `auth.users`
- `role` (`owner` | `admin` | `operator` | `viewer`)
- `email` (nullable for invited members), `invited_at`, `joined_at`, unique (`partner_id`, `user_id`) and (`partner_id`, `email`)

### `ad_packages` (catalog)

- `id`, `slug`, `name`, `description`
- `monthly_price_cents`, `currency`
- `impression_cap_monthly` (nullable = unlimited tier)
- `max_concurrent_campaigns`, `payfast_plan_id`, `paystack_plan_id` (nullable strings)
- `trial_days_default`, `welcome_credits_default`
- `is_active`

### `partner_subscriptions`

- `id` (uuid, PK)
- `partner_id`, `package_id`
- `provider` (`payfast` | `paystack`)
- `provider_customer_id`, `provider_subscription_id` (strings)
- `status` (`trialing` | `active` | `past_due` | `canceled` | `paused`)
- `current_period_start`, `current_period_end`
- `cancel_at_period_end` (bool)
- `created_at`, `updated_at`

### `partner_billing_events` (idempotency & audit)

- `id` (uuid)
- `provider`, `event_id` (unique per provider), `type`, `partner_id`, `payload_json` (sanitized), `processed_at`, `created_at`

### `ad_creatives` (partner-owned assets)

- `id` (uuid), `partner_id`
- `storage_path`, `mime_type`, `duration_seconds` (nullable for image)
- `title`, `cta_url`, `status` (`draft` | `pending_review` | `approved` | `rejected`)
- `review_note`, `reviewed_by` (admin user id), `reviewed_at`

### Extensions to `ad_campaigns`

- `partner_id` (nullable: internal campaigns without partner in early phase)
- `creative_id` → `ad_creatives` (or join table if multi-creative rotation)
- `impression_cap`, `schedule_band` (enum matching product: peak, off_peak, all_day, night, all)
- `subscription_id` (optional FK for traceability)
- `start_date`, `end_date` (campaign window driven by partner-side scheduling)
- `submitted_at`, `activated_at` (lifecycle audit set by `submitCampaignForReview` / activation)
- `review_note` (admin moderation feedback surfaced to partner)
- `status` allowed values: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ENDED`, `REJECTED`

### `partner_invites` (link-shareable invites, no email delivery required)

- `id` (uuid, PK)
- `partner_id` → `media_partners`
- `email` (citext) — invitee address; matched against `auth.users.email` on accept
- `role` (`owner` | `admin` | `operator` | `viewer`) — owners cannot be invited; locked to non-owner roles in UI
- `token` (text, unique, not null) — opaque random token used in `?invite=<token>`
- `invited_by` → `auth.users`
- `expires_at` (timestamptz, default 7 days)
- `accepted_at`, `revoked_at` (nullable audit timestamps)
- `created_at`, `updated_at`
- Partial unique index on `(partner_id, lower(email))` where `accepted_at is null and revoked_at is null` (one live invite per email per partner).
- RLS: `select` where `is_partner_member(partner_id)`; insert/update where `partner_role(partner_id) in ('owner','admin')`.

### `partner_notifications`

- `id` (uuid, PK)
- `partner_id` → `media_partners`
- `kind` (`info` | `success` | `warning` | `error`)
- `title`, `body`, `link` (nullable)
- `read_at` (nullable), `created_at`
- RLS: `select` and `update` (mark read) where `is_partner_member(partner_id)`; insert is performed by service role or `SECURITY DEFINER` RPCs only.

### RPCs (in `public`, granted appropriately)

- `public.get_partner_invite_preview(p_token text)` — `SECURITY DEFINER`, granted to `anon, authenticated`. Returns `partner_name, role, email, is_expired, is_revoked, is_accepted` for the invite acceptance preview. Returns minimal data so an unauthenticated user can render the accept form.
- `public.accept_partner_invite(p_token text)` — `SECURITY DEFINER`, granted to `authenticated`. Validates the token, ensures invite email matches `auth.users.email` of `auth.uid()`, upserts the matching `partner_members` row to attach `user_id` and `joined_at`, and marks the invite accepted. Idempotent.

## Relationships

- One partner → many members, invites, creatives, campaigns, notifications, and one active subscription convention (enforce in app or partial unique index).
- `partner_invites` is the lifecycle source of truth for pending invites; `partner_members` rows are created at invite time without `user_id`/`joined_at` and are linked to a real `auth.users` id only when `accept_partner_invite` succeeds.
- Package catalog is seeded with `starter`, `growth`, and `network`.
- Partner signup creates a partner, owner membership, starter trial subscription, welcome credits, and a welcome `partner_notifications` row when service-role env vars are configured.

## CRUD rules

- Partners CRUD their creatives and campaigns subject to RLS + caps.
- Admin can update `ad_creatives.status` and force campaign `paused`.
- Ledger/credit decrement: prefer **RPC** or **Edge Function** to avoid race conditions.
- Invites are managed by `owner | admin` only; acceptance is performed via `public.accept_partner_invite` so RLS is satisfied by `SECURITY DEFINER`, not by exposing an INSERT path on `partner_members` to the invitee.
- Notifications are emitted by signup, server actions (e.g. campaign submit/activate/reject), and webhook handlers; UI can only flip `read_at`.

## Confidence

| Area | Level |
|------|--------|
| Partner/subscription split | **High** |
| Exact column list for `ad_campaigns` | **High** for MVP fields implemented in migration; future delivery/reporting fields remain **Medium** |
