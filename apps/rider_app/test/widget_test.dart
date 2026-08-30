import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:taxi_assist_rider/app.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'https://example.supabase.co',
      publishableKey:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTc2ODAwMCwiZXhwIjoxOTYxMzQ0MDAwfQ.test',
    );
  });

  testWidgets('Landing screen shows sign in', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: TaxiAssistRiderApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Trip Rider'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
  });
}
