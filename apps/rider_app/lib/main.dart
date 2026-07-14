import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/utils/app_log.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: 'assets/default.env');

  final url = dotenv.env['SUPABASE_URL'];
  final anonKey = dotenv.env['SUPABASE_ANON_KEY'];
  if (url == null ||
      anonKey == null ||
      url.isEmpty ||
      anonKey.isEmpty ||
      url.contains('your-project')) {
    AppLog.e(
      'bootstrap',
      'supabase_env_missing',
      data: {
        'hasUrl': url != null && url.isNotEmpty,
        'hasAnonKey': anonKey != null && anonKey.isNotEmpty,
      },
    );
    debugPrint(
      'Supabase env missing or placeholder. Update assets/default.env '
      '(run: dart run tool/sync_env.dart from .env.local).',
    );
  } else {
    AppLog.i('bootstrap', 'supabase_env_ok', {
      'host': Uri.tryParse(url)?.host,
    });
  }

  await Supabase.initialize(
    url: url ?? '',
    publishableKey: anonKey ?? '',
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
  AppLog.i('bootstrap', 'supabase_initialized');

  final sentryDsn = dotenv.env['SENTRY_DSN'] ?? '';

  if (sentryDsn.isNotEmpty) {
    AppLog.i('bootstrap', 'sentry_enabled');
    await SentryFlutter.init(
      (options) {
        options.dsn = sentryDsn;
        options.environment = dotenv.env['SENTRY_ENV'] ?? 'development';
        options.tracesSampleRate = 0.2;
      },
      appRunner: () => runApp(
        const ProviderScope(child: TaxiAssistRiderApp()),
      ),
    );
  } else {
    AppLog.w('bootstrap', 'sentry_dsn_empty');
    runApp(const ProviderScope(child: TaxiAssistRiderApp()));
  }
}
