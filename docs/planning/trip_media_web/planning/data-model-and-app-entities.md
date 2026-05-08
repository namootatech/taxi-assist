# Trip Media Web App — Data model & entities

**Note:** Tables below are **planning targets** until migrations exist. Align with `ad_campaigns` / `ad_views` in `schema-gap-analysis.md`.

## Core entities

### `media_partners`

- `id` (uuid, PK)
- `name`, `legal_name` (optional), `registration_number` (optional)
- `billing_country`, `billing_currency` (default ZAR)
- `billing_provider` (`payfast` | `paystack` | null pre-checkout)
- `status` (`active` | `suspended` | `closed`)
- `trial_ends_at` (nullable), `promotional_credits_balance` (numeric or bigint impressions—choose one unit)
- `created_at`, `updated_at`

### `partner_members`

- `id` (uuid, PK)
- `partner_id` → `media_partners`
- `user_id` → `auth.users`
- `role` (`owner` | `admin` | `operator` | `viewer`)
- `invited_at`, `joined_at`, unique (`partner_id`, `user_id`)

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
- `provider`, `event_id` (unique per provider), `type`, `payload_json` (sanitized), `processed_at`

### `ad_creatives` (partner-owned assets)

- `id` (uuid), `partner_id`
- `storage_path`, `mime_type`, `duration_seconds` (nullable for image)
- `title`, `cta_url`, `status` (`draft` | `pending_review` | `approved` | `rejected`)
- `review_note`, `reviewed_by` (admin user id), `reviewed_at`

### Extensions to `ad_campaigns` (planned)

- `partner_id` (nullable: internal campaigns without partner in early phase)
- `creative_id` → `ad_creatives` (or join table if multi-creative rotation)
- `impression_cap`, `schedule_band` (enum matching product: peak, off_peak, all_day, night, all)
- `subscription_id` (optional FK for traceability)

## Relationships

- One partner → many members, creatives, campaigns, one active subscription convention (enforce in app or partial unique index).

## CRUD rules

- Partners CRUD their creatives and campaigns subject to RLS + caps.
- Admin can update `ad_creatives.status` and force campaign `paused`.
- Ledger/credit decrement: prefer **RPC** or **Edge Function** to avoid race conditions.

## Confidence

| Area | Level |
|------|--------|
| Partner/subscription split | **High** |
| Exact column list for `ad_campaigns` | **Medium** until admin schema merged |
