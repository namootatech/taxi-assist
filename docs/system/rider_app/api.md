# Taxi Assist Rider — API contract

Shared Supabase project (same URL/anon key as driver/admin). All mobile calls use the **anon** key with RLS; RPCs are `SECURITY DEFINER` where noted.

## Auth (MVP)

| Method | Client API | Notes |
|--------|------------|-------|
| Sign up | `supabase.auth.signUp(email, password)` + `profiles` upsert | Set `profile_type: RIDER` |
| Sign in | `supabase.auth.signInWithPassword` | PKCE flow |
| Reset | `supabase.auth.resetPasswordForEmail` | Deep link handled by Supabase |
| Sign out | `supabase.auth.signOut` | |

## Profiles

- Table: `public.profiles`
- Rider fields: `full_name`, `cellphone`, `email`, `residential_address`, `address_type`, `unit_number`, `complex_name`, `referral_code`, `status` (`PENDING` \| `APPROVED`), `profile_type` = `RIDER`
- Booking gate: `status = APPROVED`

## Trip RPCs

### `rider_request_trip`

```sql
rider_request_trip(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_pickup_address text default null,
  p_dropoff_address text default null,
  p_payment_method text default 'CASH',
  p_estimated_fare numeric default null,
  p_estimated_duration_sec integer default null
) → jsonb
```

**Success:** `{ "ok": true, "trip": { ... } }`  
**Errors:** `Not authenticated`, `Profile not approved for booking`, `Active trip already exists`

### `rider_cancel_trip`

```sql
rider_cancel_trip(p_trip_id uuid, p_reason text default null) → jsonb
```

Cancellable states: `REQUESTED`, `EN_ROUTE_PICKUP`, `ARRIVED_PICKUP`.

### `rider_rate_completed_trip`

```sql
rider_rate_completed_trip(
  p_trip_id uuid,
  p_rating smallint,        -- 1–5, required
  p_comment text,           -- required (non-empty)
  p_tip_amount numeric      -- optional, max R500, debits RIDER wallet
) → jsonb
```

Inserts `driver_ratings`; optional wallet tip.

## Realtime

- Channel: `trips` filtered `rider_id = auth.uid()`
- `trip_locations` SELECT when rider on active trip

## Wallet & ads

| RPC / table | Purpose |
|-------------|---------|
| `wallets` (`wallet_type = RIDER`) | Balance read |
| `wallet_transactions` | Ledger read |
| `record_ad_view_event` | Ad lifecycle (see below) |
| `ad_views` | Rider SELECT own |

### `record_ad_view_event`

```sql
record_ad_view_event(
  p_trip_id uuid,
  p_rider_id uuid,
  p_campaign_id uuid,
  p_event text,              -- STARTED | COMPLETED | SKIPPED | ABANDONED
  p_watched_seconds integer,
  p_rating smallint,
  p_comment text
) → jsonb
```

Client flow: `STARTED` on open → `COMPLETED` or `SKIPPED` after watch gate → rating+comment before credit. `ABANDONED` = no credit.

## Emergency contacts

- Table: `emergency_contacts` — max **5** per rider (enforced by RLS)
- CRUD via direct table access (own `rider_id`)

## Payment methods

- Table: `payment_methods` — `provider`, `token_ref`, `last4`, `is_default` (no PAN storage)

## Documents

- `entity_type = RIDER`, `entity_id = auth.uid()`
- Storage bucket: `driver-documents` with `{auth.uid()}/` prefix (shared bucket MVP)

## Phone OTP (deferred — mock contract)

Edge Function: `rider-send-otp` (not deployed in MVP)

**Request**

```json
POST /functions/v1/rider-send-otp
{ "phone": "+27...", "purpose": "signup" | "login" }
```

**Response**

```json
{ "ok": true, "expires_in": 300 }
```

**Verify:** `rider-verify-otp` with `{ "phone", "code" }` → session or signup token.

MVP uses email/password only; UI may show phone field on profile without blocking login.
