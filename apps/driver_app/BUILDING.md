# Driver app — building release APK

This guide documents how to build a **release APK** for the Flutter Driver app in `apps/driver_app/`.

## Prerequisites

1. Install Flutter (Dart >= 3.5)
2. Run once:

```bash
cd apps/driver_app
flutter pub get
```

## Environment variables

The app reads env at runtime from the Flutter asset `assets/default.env`.

For local/dev and for release builds, we treat `.env.local` as the source of truth and **sync it** into `assets/default.env` right before building.

1. Create `.env.local`:

```bash
cd apps/driver_app
cp .env.example .env.local
```

2. Update `.env.local`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

3. Sync + build:

```bash
cd apps/driver_app
dart run tool/sync_env.dart
flutter build apk --release
```

Or use the script:

```bash
bash apps/driver_app/scripts/build-release-apk.sh
```

## Output

The release APK is written to:

`apps/driver_app/build/app/outputs/flutter-apk/app-release.apk`

## Signing (important)

Right now, Android `release` uses the **debug signing config** (see `apps/driver_app/android/app/build.gradle.kts`).

That means:

- The APK is a *release build* (optimized), but it’s **not signed for Play Store distribution**
- For distribution, you’ll want to configure a proper `signingConfigs { release { ... } }` and point `buildTypes.release.signingConfig` at it

## Icons / splash / branding assets

Flutter has 3 different “asset” concepts that often get mixed up:

1. **Runtime assets used by your UI** (images you show in widgets)
2. **Android/iOS app icon assets** (launcher icon)
3. **Android/iOS splash screen assets**

### 1) Runtime images (in-app UI)

Add files under `apps/driver_app/assets/` and register them in `pubspec.yaml`:

```yaml
flutter:
  assets:
    - assets/default.env
    - assets/images/
```

Then reference them in code:

```dart
Image.asset('assets/images/logo.png')
```

### 2) App icon (launcher icon)

Best practice is to store a **single source** image in `assets/` and generate platform icons.

Recommended approach:

1. Add a source file, e.g. `assets/branding/app-icon.png` (1024x1024 PNG)
2. Add and configure `flutter_launcher_icons`
3. Run the generator, then rebuild the APK

If you wire it up, the build script supports:

```bash
bash apps/driver_app/scripts/build-release-apk.sh --regen-branding
```

### 3) Splash screen

Similarly, keep source images under `assets/branding/` and generate native splash resources.

Recommended approach:

1. Add `assets/branding/splash.png` (or background + logo)
2. Add and configure `flutter_native_splash`
3. Run the generator, then rebuild the APK

The same `--regen-branding` flag will run it if configured.

## Suggested future structure for branding files

Create these folders:

- `apps/driver_app/assets/images/` (in-app UI)
- `apps/driver_app/assets/branding/` (icon + splash source images)

Then regenerate branding and rebuild:

```bash
bash apps/driver_app/scripts/build-release-apk.sh --regen-branding
```

