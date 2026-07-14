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
- Booking gate: cellphone + profile photo required; blocked statuses denied
- Fare estimate (client): **R25 base + R10/km**, min R35, display cap R500
- Own rating (profile): `rider_get_my_rating_summary()` → `{ ok, avg_rating, total_ratings }` only (no comments/raters)

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
**Errors:** `Not authenticated`, `Profile not found`, `Rider profile required`, `Account is not active`, `Cellphone required`, `Profile photo required`, `Active trip already exists`

Wallet payment: after a successful request with `payment_method = WALLET`, the app calls `rider_debit_wallet_for_trip(trip_id, estimated_fare)`.

Booking prerequisites: non-empty `profiles.cellphone` (≥9 chars) and `profiles.selfie_url`.

### `rider_get_trip_driver`

```sql
rider_get_trip_driver(p_trip_id uuid) → jsonb
```

Rider-only card for the assigned driver on an owned trip:

**Success (assigned):**
```json
{
  "ok": true,
  "assigned": true,
  "driver": {
    "id": "uuid",
    "full_name": "…",
    "cellphone": "…",              // null until EN_ROUTE_PICKUP+
    "cellphone_visible": true,
    "selfie_url": "…",
    "avg_rating": 4.8,
    "total_ratings": 12,
    "vehicle": {
      "vehicle_id": "uuid",
      "make": "Toyota",
      "model": "Corolla",
      "colour": "White",
      "registration_number": "CA123456",
      "category": "SEDAN"
    }
  }
}
```

**Success (unassigned):** `{ "ok": true, "assigned": false, "driver": null }`  
**Errors:** `Not authenticated`, `Trip not found`, `Not your trip`, `Driver not found`

Booking/`accept` stamp `trips.vehicle_id` from `profiles.current_vehicle_id` when available.

### `rider_debit_wallet_for_trip`

```sql
rider_debit_wallet_for_trip(p_trip_id uuid, p_amount numeric) → jsonb
```

Debits RIDER wallet (`TRIP_FARE`) when balance allows.

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
  p_comment text,           -- optional
  p_tip_amount numeric      -- optional, max R500, debits RIDER wallet
) → jsonb
```

Inserts `driver_ratings`; optional wallet tip. After completion, the rider app surfaces the trip until rated (or skipped for the session).

## Realtime

- Channel: `trips` filtered `rider_id = auth.uid()`
- `trip_locations` SELECT when rider on active trip

## Wallet & ads

| RPC / table | Purpose |
|-------------|---------|
| `wallets` (`wallet_type = RIDER`) | Balance read |
| `wallet_transactions` | Ledger read (incl. `AD_REWARD`, `TRIP_FARE`, `TIP`) |
| `get_next_ads_for_trip` | Next campaign creative for an active trip |
| `record_ad_view_event` | Ad lifecycle |
| `finalize_trip_ad_rewards` | Credit wallet for WATCHED/RATED views |
| `rider_debit_wallet_for_trip` | Spend credits on trip fare |
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
