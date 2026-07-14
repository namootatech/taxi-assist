# Rider maps, fares, ads wallet (2026-07-14)

## Goal

Make `apps/rider_app` functionally usable on Android emulator: real Google Maps + Places autocomplete, GPS with clear failure UX, distance-based fare (**R25 base + R10/km**), wire ad-watch credits into the RIDER wallet and allow spending them, and upgrade home/booking/active-trip UI so it feels less like a skeleton.

## Context

**Exists**

- Scaffolded rider Flutter app with auth, booking wizard, wallet/media shells
- SQL for ads: `get_next_ads_for_trip`, `record_ad_view_event`, `finalize_trip_ad_rewards`
- Optional verification (pending riders can use the app)

**Missing**

- Native Maps key injection; UI still uses `MapPlaceholder`
- Places autocomplete; dropoff lat/lng hardcoded
- Real fare engine + breakdown UI
- Ad → wallet credit wiring in the client
- Wallet debit for trip payment

## Scope

| In scope | Out of scope |
|----------|----------------|
| `apps/rider_app` Flutter | iOS Maps key beyond stub |
| Android `GOOGLE_MAPS_API_KEY` plumbing | Directions/traffic ETAs |
| Places autocomplete + Geolocator UX | Phone OTP, surge, matching |
| Fare helper + booking breakdown | Full Paystack/Payfast card capture |
| Ad earn + wallet spend RPCs/UI | Rewriting driver app |

## Plan link

- Cursor plan: rider app usability (maps, fares, ads wallet, premium booking UX)

## Implementation instructions

1. Prompt archive + README index (this file).
2. Sync env → Android Manifest Maps meta-data; Places HTTP client.
3. `RiderMap` widget; replace placeholders on home/booking/active trip.
4. Address typeahead + robust location helper.
5. Fare: base R25 + R10/km, min R35, display max R500.
6. Wire ads RPCs; finalize rewards; ledger UI.
7. Wallet balance check + debit on `WALLET` trip request.
8. Premium home sheet / booking-over-map / active trip polish.

## Acceptance

- Real map + GPS on emulator (with mocked location)
- Places suggestions set real coords
- Fare breakdown uses R10/km + base
- Ad watch credits wallet; WALLET payment usable
- `flutter analyze` clean; targeted tests pass
