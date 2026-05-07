# Seed data (test fixtures)

This document lists the **test data that was seeded via Supabase MCP** on **2026-05-07**.

## Supabase project

- **Project id**: `twemeqotfdbgfbrrztcd`
- **Region**: `eu-north-1`

## Auth users (logins)

All passwords are intentionally short (**6–7 chars**) for local testing only.


| Purpose | Email               | Password  | Notes                                                                |
| ------- | ------------------- | --------- | -------------------------------------------------------------------- |
| Admin   | `admin@trip.test`   | `admin12` | Has a row in `public.admin_profiles` with role `superadmin`          |
| Driver  | `driver1@trip.test` | `driver1` | Has approved driver profile + linked vehicle + sample completed trip |
| Driver  | `driver2@trip.test` | `driver2` | Has approved driver profile + linked vehicle                         |
| Rider   | `rider1@trip.test`  | `rider01` | Has rider profile + wallet balance preloaded                         |


## Seeded rows by table

### `public.profiles` (4 rows)

Created profiles for all 4 users.

- **Drivers** (`driver1@trip.test`, `driver2@trip.test`)
  - `profile_type`: `DRIVER`
  - `status`: `APPROVED`
  - `training_completed`: `true`
  - `registration_submitted`: `true`
  - `current_vehicle_id`: set to their seeded vehicle
- **Rider** (`rider1@trip.test`)
  - `profile_type`: `RIDER`
  - `status`: `PENDING`
  - `training_completed`: `true`
  - `registration_submitted`: `true`
- **Admin** (`admin@trip.test`)
  - `profile_type`: `DRIVER` (current schema only supports `DRIVER` / `RIDER`)
  - `status`: `PENDING`

### `public.admin_profiles` (1 row)

- `user_id`: `admin@trip.test` user id
- `role`: `superadmin`

### `public.vehicles` (2 rows)

Seeded and linked to drivers:

- `driver1@trip.test`
  - `registration_number`: `TEST-001`
  - `make/model`: `Toyota Corolla`
  - `category`: `SEDAN`
  - `status`: `APPROVED`
- `driver2@trip.test`
  - `registration_number`: `TEST-002`
  - `make/model`: `Toyota Yaris`
  - `category`: `SEDAN`
  - `status`: `APPROVED`

### `public.wallets` (4 rows)

Created a wallet for each profile:

- `wallet_type`: `DRIVER` for driver/admin profiles; `RIDER` for rider profile
- `currency`: `ZAR`
- `balance`:
  - `rider1@trip.test`: `250`
  - others: `0`

### `public.trips` (1 row)

One completed trip for `driver1@trip.test` (with `rider1@trip.test` as rider):

- `status`: `COMPLETED`
- `payment_method`: `CASH`
- `estimated_fare`: `85`
- `final_fare`: `92`
- `pickup_address`: `Johannesburg CBD (Test Pickup)`
- `dropoff_address`: `Sandton City (Test Dropoff)`

### `public.trip_events` (1 row)

One event tied to the seeded trip:

- `event_type`: `TRIP_COMPLETED`
- `actor_kind`: `DRIVER`
- `metadata.seed`: `true`

## Quick reference (what to test)

- **Admin app sign-in**: log in as `admin@trip.test` to pass `admin_profiles` middleware gate.
- **Driver app sign-in**: log in as `driver1@trip.test` or `driver2@trip.test` for approved driver flows.
- **Trips dashboard**: `driver1@trip.test` has 1 completed trip seeded.

