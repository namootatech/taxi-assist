# Rider theme parity + marketing landing

## Goal

Bring the Taxi Assist Rider Flutter app onto the same Trip brand theme, styling, and signed-out landing experience as the Driver app so both portals feel like one product.

## Context

- Already exists: driver `AppTheme` (red `#FE0000`, navy `#244065`, cream / portal dark), driver marketing `LandingScreen`, rider feature surface (home, booking, wallet).
- Missing / was weak: rider still used an older Lexend blue/orange system and a skeletal signed-out home; no driver-style hero landing.

## Scope

- In scope: `apps/rider_app` theme, landing, signed-out routing, design-system rider MASTER notes.
- Out of scope: new booking flows, driver app changes, web admin theming.

## Plan link

Inline implementation (parity with driver apps); no separate plan file.

## Implementation instructions

1. Align `lib/core/theme/app_theme.dart` with driver Trip tokens (light cream + dark portal).
2. Default theme mode to dark (driver / portal).
3. Add `lib/features/marketing/landing_screen.dart` (hero photo, TA mark, pills, glass card, Start riding / Sign in).
4. Wire `_SignedOutHome` in `lib/app.dart` to `LandingScreen`; keep global theme toggle overlay like driver.
5. Update `design-system/taxi-assist-rider/MASTER.md` to document Trip brand.
6. Drop unused `google_fonts` once Lexend is gone.
7. Hot **restart** the rider app (theme + new route are not enough via hot reload alone).

## Acceptance

- Signed-out riders see a full-bleed Trip landing with Start riding / Sign in.
- Light and dark schemes use Trip red / navy / cream / portal (not blue/orange Lexend).
- `dart analyze lib` clean in `apps/rider_app`.
- Visual parity with driver landing structure (brand row, hero lines, CTAs).
