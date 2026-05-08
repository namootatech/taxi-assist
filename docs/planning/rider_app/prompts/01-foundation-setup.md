# 01 — Foundation setup (rider app)

**Goal:** Create `apps/rider_app` (or agreed package path) as Flutter + Supabase + Riverpod, mirroring patterns from `apps/driver_app`.

## Deliverables

1. Flutter project with: `supabase_flutter`, `flutter_riverpod`, `riverpod_annotation`, maps, geolocator, secure storage for session.
2. Environment config: Supabase URL, anon key, flavor dev/prod.
3. Folder layout: `features/auth`, `features/home`, `features/trip`, `features/wallet`, `features/media`, `core/`, `shared/`.
4. `SupabaseService` singleton + Riverpod bootstrap; auth state listener.
5. README in app folder linking to `docs/planning/rider_app/planning/`.

## Acceptance

- `flutter run` launches shell with placeholder home.
- Sign-in screen stub (no full OTP until prompt 02).

**Depends on:** `app-prd.md`, `technical-implementation.md`.

**Do not implement** full booking or ads in this prompt.
