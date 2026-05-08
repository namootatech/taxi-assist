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
- There is also a `.env.local` file in this folder, but the app code currently reads **only** `assets/default.env`.

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

