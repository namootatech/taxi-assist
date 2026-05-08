# Technical implementation — Rider app

**Sources:** `docs/planning/drivers/planning/technical-implementation.md` (patterns), platform `technical-foundation.md`, `schema-gap-analysis.md`.

## Recommended stack (implementation direction)

| Layer | Choice | Confidence |
|-------|--------|------------|
| UI | **Flutter** (match `apps/driver_app` for shared tooling/lore) | **High** (team consistency) |
| Backend | **Supabase** (Auth, Postgres, Realtime, Storage) | **High** |
| State | **Riverpod** (match driver) | **High** |
| Maps | Google Maps Flutter + Geolocator (or product-selected SDK) | **Medium** |
| Push | FCM or Supabase-triggered push (TBD) | **Medium** |

> **Alternative:** React Native / Expo + Supabase is valid if product mandates; require **ADR** before diverging from Flutter.

## Architecture notes

- **Client-heavy:** Rider actions via Supabase client with **RLS**; no duplicate BFF unless needed for PCI or ad serving.
- **Realtime:** Subscribe to `trips` row for active ride; driver location from `trip_locations` or broadcast channel (align with driver implementation).
- **Payments:** Card tokenization via provider; app wallet via ledger RPCs once platform tables exist.
- **Ads:** Full-screen or dedicated surface; **must** sync completion rules with backend (`ad_views` state machine) to prevent client-side fraud.

## Auth

- Supabase Auth; phone OTP via Edge Function + SMS provider (same pattern as driver spec).
- Email confirmation for activation.
- Custom claims or `profiles` row to distinguish **RIDER** vs **DRIVER** for same email policy (usually **separate accounts** per role — confirm product).

## Key integrations

- Maps (pickup/dropoff, live tracking).
- SMS for OTP and invite links.
- Optional: deep links from ad web view back to app.

## Testing hooks

- Widget tests for booking wizard; integration tests against Supabase local; golden tests for ad completion UI.

**Confidence:** **High** for Supabase + Flutter alignment; **Low** for payment provider choice until finance ADR exists.
