import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import 'app_log.dart';

class RiderLocationResult {
  const RiderLocationResult({
    this.position,
    this.errorMessage,
  });

  final Position? position;
  final String? errorMessage;

  bool get ok => position != null;
}

/// Robust GPS helper for Android emulators and devices.
class RiderLocation {
  RiderLocation._();

  static Future<RiderLocationResult> getCurrent({
    Duration timeout = const Duration(seconds: 12),
  }) async {
    AppLog.i('location', 'get_current_started');
    try {
      final serviceOn = await Geolocator.isLocationServiceEnabled();
      if (!serviceOn) {
        AppLog.w('location', 'service_disabled');
        return const RiderLocationResult(
          errorMessage:
              'Location is off. Enable GPS, or in the emulator open Extended Controls → Location and set a pin.',
        );
      }

      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied) {
        AppLog.w('location', 'permission_denied');
        return const RiderLocationResult(
          errorMessage: 'Location permission denied. Allow location to book nearby.',
        );
      }
      if (perm == LocationPermission.deniedForever) {
        AppLog.w('location', 'permission_denied_forever');
        await openAppSettings();
        return const RiderLocationResult(
          errorMessage:
              'Location permanently denied. Enable it in App settings → Permissions.',
        );
      }

      try {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 12),
          ),
        ).timeout(timeout);
        AppLog.i('location', 'fix_ok', {
          'lat': pos.latitude,
          'lng': pos.longitude,
        });
        return RiderLocationResult(position: pos);
      } catch (e) {
        AppLog.w('location', 'current_failed_try_last', {'error': '$e'});
        final last = await Geolocator.getLastKnownPosition();
        if (last != null) {
          AppLog.i('location', 'last_known_ok');
          return RiderLocationResult(position: last);
        }
        return const RiderLocationResult(
          errorMessage:
              'Could not get a GPS fix. On Android Studio: Extended Controls → Location → set a point, then try again.',
        );
      }
    } catch (e, st) {
      AppLog.e('location', 'failed', error: e, stackTrace: st);
      return RiderLocationResult(errorMessage: 'Location error: $e');
    }
  }
}
