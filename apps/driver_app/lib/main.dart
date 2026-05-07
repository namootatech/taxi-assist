import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';

/// Taxi Assist Driver — bootstrap.
///
/// 1. Loads [assets/default.env] (copy from [.env.example] for local naming).
/// 2. Initializes Supabase (RLS assumed on backend).
/// 3. Runs the app under [ProviderScope].
///
/// Codegen (optional, for future `@riverpod` usage):
/// `dart run build_runner build --delete-conflicting-outputs`
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
      'Supabase env missing or placeholder. Update assets/default.env with '
      'real SUPABASE_URL and SUPABASE_ANON_KEY before shipping.',
    );
  }

  await Supabase.initialize(
    url: url ?? '',
    anonKey: anonKey ?? '',
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  runApp(const ProviderScope(child: TaxiAssistDriverApp()));
}
