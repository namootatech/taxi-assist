import 'package:sentry_flutter/sentry_flutter.dart';

class AppSentry {
  static bool get isEnabled => Sentry.isEnabled;

  static void action(
    String action, {
    Map<String, Object?> data = const {},
    SentryLevel level = SentryLevel.info,
  }) {
    if (!isEnabled) return;
    Sentry.addBreadcrumb(
      Breadcrumb(
        category: 'action',
        message: action,
        level: level,
        data: _safeData(data),
      ),
    );
  }

  static Future<void> captureException(
    Object error, {
    StackTrace? stackTrace,
    String? hint,
    Map<String, Object?> context = const {},
  }) async {
    if (!isEnabled) return;
    await Sentry.captureException(
      error,
      stackTrace: stackTrace,
      withScope: (scope) {
        if (hint != null && hint.isNotEmpty) scope.setTag('hint', hint);
        if (context.isNotEmpty) scope.setContexts('context', _safeData(context));
      },
    );
  }

  static Map<String, Object?> _safeData(Map<String, Object?> raw) {
    final cleaned = <String, Object?>{};
    for (final entry in raw.entries) {
      final keyLower = entry.key.toLowerCase();
      if (keyLower.contains('password')) continue;
      if (keyLower.contains('token')) continue;
      if (keyLower.contains('secret')) continue;
      if (keyLower.contains('anon_key')) continue;
      cleaned[entry.key] = entry.value;
    }
    return cleaned;
  }
}
