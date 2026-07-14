# Rider profile photo + phone required; driver phone after en-route

## Goal

Riders must upload a **profile picture** and keep a valid **cellphone** before they can book. Driver cellphone is shown to the rider **only after** the trip is `EN_ROUTE_PICKUP` (or later).

## Context

- Optional verification docs remain optional.
- Booking was gated only on non-blocked status.
- Driver card RPC returned cellphone regardless of trip status.

## Scope

- In: profile selfie upload/edit phone, `canBook` + `rider_request_trip` gates, `rider_get_trip_driver` phone visibility, active-trip UI.
- Out: changing OTP auth, driver-side contact rules.

## Implementation

1. Migration: require non-empty `cellphone` + `selfie_url` in `rider_request_trip`; omit `cellphone` from driver payload until `EN_ROUTE_PICKUP`+.
2. `RiderProfile`: `selfieUrl`, `hasCellphone`, `hasProfilePhoto`, `canBook`, `bookingBlockedReason`.
3. Profile screen: photo upload + phone edit.
4. Home booking toast with reason; navigate to Profile when blocked.
5. Active trip: call/display phone only when API returns it.

## Acceptance

- Book without photo or phone → blocked client + server.
- With both → book succeeds.
- Driver phone hidden in `REQUESTED`; visible from `EN_ROUTE_PICKUP` onward.
