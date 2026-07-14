import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../observability/app_sentry.dart';

/// Console + Sentry breadcrumb logger for debugging rider flows.
///
/// Prints always in debug/profile builds. Never logs passwords/tokens.
class AppLog {
  AppLog._();

  static const _tag = 'RiderApp';

  static void d(
    String scope,
    String message, [
    Map<String, Object?> data = const {},
  ]) {
    _print('D', scope, message, data);
    AppSentry.action('$scope.$message', data: data);
  }

  static void i(
    String scope,
    String message, [
    Map<String, Object?> data = const {},
  ]) {
    _print('I', scope, message, data);
    AppSentry.action('$scope.$message', data: data);
  }

  static void w(
    String scope,
    String message, [
    Map<String, Object?> data = const {},
  ]) {
    _print('W', scope, message, data);
    AppSentry.action(
      '$scope.$message',
      data: data,
      level: SentryLevel.warning,
    );
  }

  static void e(
    String scope,
    String message, {
    Object? error,
    StackTrace? stackTrace,
    Map<String, Object?> data = const {},
  }) {
    final merged = <String, Object?>{
      ...data,
      if (error != null) 'errorType': error.runtimeType.toString(),
      if (error != null) 'error': '$error',
    };
    _print('E', scope, message, merged);
    if (stackTrace != null) {
      debugPrint('$_tag/$scope stack:\n$stackTrace');
    }
    AppSentry.action(
      '$scope.$message',
      data: merged,
      level: SentryLevel.error,
    );
    if (error != null) {
      // Fire-and-forget; callers should not await logging.
      AppSentry.captureException(
        error,
        stackTrace: stackTrace,
        hint: '$scope.$message',
        context: data,
      );
    }
  }

  static void _print(
    String level,
    String scope,
    String message,
    Map<String, Object?> data,
  ) {
    final safe = _stripSecrets(data);
    final suffix = safe.isEmpty ? '' : ' $safe';
    debugPrint('$_tag/$level/$scope: $message$suffix');
  }

  static Map<String, Object?> _stripSecrets(Map<String, Object?> raw) {
    final out = <String, Object?>{};
    for (final e in raw.entries) {
      final k = e.key.toLowerCase();
      if (k.contains('password') ||
          k.contains('token') ||
          k.contains('secret') ||
          k.contains('anon_key') ||
          k.contains('apikey')) {
        continue;
      }
      out[e.key] = e.value;
    }
    return out;
  }
}
