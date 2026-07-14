# Driver photo/phone gate + rider details on request

## Goal

Drivers must keep a **profile photo** (`profiles.selfie_url`) and a valid **cellphone** before they can go online or accept trips. On a ride request, drivers see the requesting rider’s **name, photo, verified flag, and average rating**. Rider **cellphone** is only visible **after accept** (`EN_ROUTE_PICKUP`+).

## Context

- Selfie exists in onboarding / SELFIE docs; profile screen had no photo upload.
- `driver_precheck_go_online` did not check `selfie_url` / cellphone.
- Ride request UI showed name + verified only; no rider ratings table.
- Drivers already rate completed trips via `driver_rate_completed_trip` → `trips.driver_rating`.

## Scope

- In: migration (precheck, accept gate, `rider_ratings`, `driver_get_trip_rider`), driver profile photo/phone UX + client flags, ride-request (and active-trip) rider card.
- Out: onboarding rewrite, admin ratings UI, Play Store signing.

## Plan link

Inline (Cursor plan: Driver photo phone rider card).

## Implementation instructions

1. Migration `20260714230000_driver_photo_phone_rider_card.sql`:
   - Extend `driver_precheck_go_online` with cellphone (≥9) + non-empty `selfie_url`.
   - Same checks on `driver_transition_trip` action `accept`.
   - Create `rider_ratings` + `rider_rating_summary`; upsert from `driver_rate_completed_trip`; backfill from `trips.driver_rating`.
   - Add `driver_get_trip_rider(p_trip_id)` — phone only when status is `EN_ROUTE_PICKUP` or later.
2. `DriverProfile`: `hasCellphone`, `hasProfilePhoto`, `canTakeTrips` / `tripsBlockedReason` (photo+phone only; server still owns full go-online rules).
3. Profile screen: avatar upload to `driver-documents`, phone validation; banner when incomplete.
4. Go-online: show server reasons (includes new ones); toast already present.
5. Ride request / active trip: call `driver_get_trip_rider`; render card; call affordance when `cellphone_visible`.

## Acceptance

- Go online / accept without photo or phone → blocked (client messaging + server).
- With both → go online and accept succeed.
- Ride request shows rider **full name**, **profile photo**, **avg rating + count**, **verified / not verified**, and **member tenure** (hours → days → months → years and months); phone hidden until accept.
- Rating a completed trip updates rider average for future requests.
