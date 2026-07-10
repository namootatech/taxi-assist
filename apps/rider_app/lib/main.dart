import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';

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
    debugPrint(
      'Supabase env missing or placeholder. Update assets/default.env.',
    );
  }

  await Supabase.initialize(
    url: url ?? '',
    publishableKey: anonKey ?? '',
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  final sentryDsn = dotenv.env['SENTRY_DSN'] ?? '';

  if (sentryDsn.isNotEmpty) {
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
    runApp(const ProviderScope(child: TaxiAssistRiderApp()));
  }
}
