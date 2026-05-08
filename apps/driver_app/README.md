# Taxi Assist — Driver App (Flutter)

This is the Driver app for the Taxi Assist platform.

## Prerequisites

- Flutter installed (Dart \(>= 3.5\))
- One of:
  - Android Studio + an Android emulator
  - Xcode + an iOS simulator (macOS only)
  - Chrome (for web)

## Environment variables (Supabase)

The app loads Supabase config from `assets/default.env` at startup.

Required keys:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Notes:

- `SUPABASE_ANON_KEY` is a publishable client key (it is expected to be shipped in the app), but **do not** put service-role keys in a client app.
- The app code reads **only** `assets/default.env`. For local/dev and for release builds, we keep that file in sync from `.env.local` via `tool/sync_env.dart`.

### Setup `.env.local`

```bash
cd apps/driver_app
cp .env.example .env.local
```

Edit `.env.local`, then sync it into the runtime asset:

```bash
cd apps/driver_app
dart run tool/sync_env.dart
```

## Install dependencies

```bash
cd apps/driver_app
flutter pub get
```

## Run the app

### Android (recommended)

Start an emulator, then:

```bash
cd apps/driver_app
flutter run -d emulator-5554
```

If you’re not sure which device id to use:

```bash
flutter devices
```

### iOS (macOS only)

```bash
cd apps/driver_app
flutter run -d ios
```

### macOS desktop

```bash
cd apps/driver_app
flutter run -d macos
```

### Web (Chrome)

```bash
cd apps/driver_app
flutter run -d chrome
```

## Useful commands

### Generate code (Riverpod)

```bash
cd apps/driver_app
dart run build_runner build --delete-conflicting-outputs
```

### Lints / analyze

```bash
cd apps/driver_app
flutter analyze
```

## Build a release APK (Android)

This produces `build/app/outputs/flutter-apk/app-release.apk`.

```bash
cd apps/driver_app
dart run tool/sync_env.dart && flutter build apk --release
```

For a longer, future-proof guide (including branding/icons/splash), see `BUILDING.md`.

