# Taxi Assist Rider — deployment

## Prerequisites

- Flutter SDK >= 3.5 (see `apps/rider_app/pubspec.yaml`)
- Xcode 15+ (iOS) / Android Studio with SDK 23+ (Android)
- Access to shared Supabase project (same as driver/admin)

## Environment

Copy and sync env before every release build:

```bash
cd apps/rider_app
cp .env.example .env.local
# Set SUPABASE_URL, SUPABASE_ANON_KEY, optional SENTRY_DSN, GOOGLE_MAPS_API_KEY
dart run tool/sync_env.dart
```

From monorepo root: `pnpm run sync-env:rider`

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Shared project URL |
| `SUPABASE_ANON_KEY` | Yes | Anon key only — never ship service role |
| `SENTRY_DSN` | No | Crash reporting |
| `GOOGLE_MAPS_API_KEY` | Maps | Native Android/iOS config also required |

## Database

Apply platform migrations (includes rider core):

```bash
supabase db push
# or apply supabase/migrations/20260709120000_rider_app_core.sql
```

RPCs used by the client: `rider_request_trip`, `rider_cancel_trip`, `rider_rate_completed_trip`, `record_ad_view_event`.

## Signing

### Android

1. Create a release keystore (once per org):

   ```bash
   keytool -genkey -v -keystore taxi-assist-rider.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rider
   ```

2. Add `android/key.properties` (gitignored):

   ```properties
   storePassword=***
   keyPassword=***
   keyAlias=rider
   storeFile=../taxi-assist-rider.jks
   ```

3. Wire signing in `android/app/build.gradle` release block (mirror driver app when promoted to store).

4. Internal pilot: `flutter build apk --release` and distribute via Play internal testing track.

### iOS

1. Open `ios/Runner.xcworkspace` in Xcode.
2. Set **Team**, **Bundle Identifier** (`za.co.qwabi.taxiassist.rider` or org convention), and **Signing & Capabilities**.
3. Archive → Distribute → TestFlight for pilot builds.
4. Confirm **Deployment Target** ≥ 12.0 in Runner target settings.

## Build

```bash
cd apps/rider_app
flutter pub get
flutter analyze
flutter test
flutter build apk --release   # Android internal
flutter build ios --release   # TestFlight (signing required)
```

## Minimum OS

- **Android:** API 23 (Android 6.0)
- **iOS:** 12.0+ (Flutter default; confirm in Xcode deployment target)

## Pilot checklist

Use this before handing builds to corridor testers (align with driver pilot geography).

- [ ] `supabase db push` applied; `20260709120000_rider_app_core.sql` on target project
- [ ] `pnpm run sync-env:rider` with production/staging Supabase URL + anon key
- [ ] Test rider seeded: `profiles.profile_type = RIDER`, `status = APPROVED`
- [ ] Test driver online in same corridor for `rider_request_trip` assignment
- [ ] Signup → document upload → admin approval → book flow verified on device
- [ ] Active trip: driver location updates visible; call driver works
- [ ] Post-trip: rating + comment required; optional wallet tip within R500 cap
- [ ] Taxi Assist Media: abandon shows no credit; complete with rating grants credit
- [ ] Wallet balance readable; emergency contacts CRUD (max 5)
- [ ] Sentry DSN configured for pilot build (optional but recommended)
- [ ] Play internal track or TestFlight build uploaded with release notes
- [ ] Pilot tester list matches driver corridor accounts

## CI

Workflow: `.github/workflows/rider-app-flutter-test.yml` runs `flutter analyze` and `flutter test` on push/PR touching `apps/rider_app/**`.

## Security

- RLS enforced on all tables; mobile uses anon key only.
- Payment card PANs never stored — `payment_methods.token_ref` only.
- Document uploads use `driver-documents` bucket with `{uid}/` prefix.
