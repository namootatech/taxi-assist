# Rider sees assigned driver details during trip

## Goal

During an active trip, the rider always sees the assigned driver’s **full name**, **profile picture**, **rating**, and **vehicle details** (make, model, colour, plate).

## Context

- Already: `ActiveTripScreen` tries `profiles` select via `fetchDriverProfile`; UI is a thin ListTile with placeholder avatar.
- Blocked: RLS only allows riders to read **own** profile / **own** vehicle; no RPC for the trip driver card.
- Data: `profiles.full_name`, `profiles.selfie_url`, `vehicles` (make/model/`colour`/`registration_number`), `driver_rating_summary` (`avg_rating`, `total_ratings`).

## Scope

- In scope: new Supabase RPC, rider `TripService` + `ActiveTripScreen`, stamp `vehicle_id` on request/accept, API docs + prompt.
- Out of scope: driver app UI, changing rating algorithms, chat.

## Plan link

Inline (this prompt).

## Implementation instructions

1. Migration `rider_get_trip_driver(p_trip_id uuid)` — SECURITY DEFINER; assert `trips.rider_id = auth.uid()`; return whitelisted JSON.
2. Update `rider_request_trip` / accept path to set `vehicle_id` from driver’s `current_vehicle_id`.
3. Client calls RPC by trip id; resolve `selfie_url` to a public storage URL when it is a path.
4. Render a persistent driver card on the active trip sheet (waiting state until assigned).

## Acceptance

- With an assigned driver, rider sees name, photo (or fallback icon), avg rating + count, and car line (colour · make model · plate).
- Before assignment: clear “Looking for a driver” state.
- RLS still prevents arbitrary profile reads outside this RPC.
