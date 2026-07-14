# Taxi Assist Rider

Flutter + Supabase + Riverpod passenger app for the Taxi Assist platform.

## Planning docs

- [Rider app planning](../../docs/planning/rider_app/)
- [API contract](../../docs/system/rider_app/api.md)
- [Deployment](../../docs/system/rider_app/deployment.md)
- [UX checklist](../../docs/system/rider_app/ux-checklist.md)
- [Design system](../../design-system/taxi-assist-rider/MASTER.md)
- [Maps / fares / ads prompt](../../docs/prompts/2026-07-14-rider-maps-fares-ads-prompt.md)

## Setup

```bash
cp .env.example .env.local
# Edit SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY
# Enable Maps SDK for Android + Places API on that Google Cloud key
dart run tool/sync_env.dart
flutter pub get
flutter run
```

`sync_env.dart` writes `assets/default.env` and `android/.../google_maps_api.xml`.

From monorepo root:

```bash
pnpm run sync-env:rider
```

## Android emulator location

Maps and GPS need a mocked position:

1. Prefer a **Google Play** system image AVD.
2. Extended Controls (⋯) → **Location** → set a pin or play a route.
3. Grant location when the app prompts.
4. If stuck: App info → Permissions → Location → Allow, then **Retry location** on home.

## Fare rule

Estimate = **R25 base + R10/km** (straight-line), minimum R35, soft cap R500.

## Auth

Email/password via Supabase (same project as driver app). Phone OTP is documented but deferred.
Verification documents are optional.

## Tests

```bash
flutter analyze
flutter test
```
