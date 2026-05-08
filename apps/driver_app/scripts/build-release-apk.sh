#!/usr/bin/env bash
set -euo pipefail

shouldRegenBranding=false
if [[ "${1:-}" == "--regen-branding" ]]; then
  shouldRegenBranding=true
fi

appDir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$appDir"

if [[ ! -f ".env.local" ]]; then
  echo "Missing apps/driver_app/.env.local"
  echo "Create it first: cp .env.example .env.local"
  exit 1
fi

dart run tool/sync_env.dart

if [[ "$shouldRegenBranding" == "true" ]]; then
  if [[ -f "pubspec.yaml" ]] && grep -q "flutter_launcher_icons" pubspec.yaml; then
    dart run flutter_launcher_icons
  else
    echo "Skipping app icon generation (flutter_launcher_icons not configured)"
  fi

  if [[ -f "pubspec.yaml" ]] && grep -q "flutter_native_splash" pubspec.yaml; then
    dart run flutter_native_splash:create
  else
    echo "Skipping splash generation (flutter_native_splash not configured)"
  fi
fi

flutter build apk --release

apkPath="build/app/outputs/flutter-apk/app-release.apk"
if [[ -f "$apkPath" ]]; then
  echo "Release APK ready:"
  echo "$appDir/$apkPath"
fi

