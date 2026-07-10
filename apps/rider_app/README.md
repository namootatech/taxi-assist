# Taxi Assist Rider

Flutter + Supabase + Riverpod passenger app for the Taxi Assist platform.

## Planning docs

- [Rider app planning](../../docs/planning/rider_app/)
- [API contract](../../docs/system/rider_app/api.md)
- [Deployment](../../docs/system/rider_app/deployment.md)
- [UX checklist](../../docs/system/rider_app/ux-checklist.md)
- [Design system](../../design-system/taxi-assist-rider/MASTER.md)

## Setup

```bash
cp .env.example .env.local
# Edit SUPABASE_URL and SUPABASE_ANON_KEY
dart run tool/sync_env.dart
flutter pub get
flutter run
```

From monorepo root:

```bash
pnpm run sync-env:rider
```

## Auth

Email/password via Supabase (same project as driver app). Phone OTP is documented but deferred.

## Tests

```bash
flutter analyze
flutter test
```
