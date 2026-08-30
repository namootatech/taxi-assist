import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';
import '../../core/utils/supabase_session_recovery.dart';
import '../models/driver_profile.dart';
import '../services/document_upload_service.dart';
import '../services/driver_compliance_service.dart';
import '../services/supabase_service.dart';

/// Bottom nav index for [MainShell] (0–4).
final mainShellTabIndexProvider = StateProvider<int>((ref) => 0);

/// Home dashboard: completed trips + fare totals for current UTC day.
final todayTripStatsProvider =
    FutureProvider.autoDispose<TodayTripStats>((ref) async {
  final uid = ref.watch(supabaseClientProvider).auth.currentUser?.id;
  if (uid == null) {
    return const TodayTripStats(completedCount: 0, totalFare: 0);
  }
  ref.watch(currentDriverProvider);
  return ref.watch(supabaseServiceProvider).fetchTodayTripStats();
});

/// Global Supabase facade (singleton process-wide).
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return supabaseClient;
});

final documentUploadServiceProvider = Provider<DocumentUploadService>((ref) {
  return DocumentUploadService(ref.watch(supabaseServiceProvider));
});

final driverComplianceServiceProvider = Provider<DriverComplianceService>((ref) {
  return DriverComplianceService(ref.watch(supabaseClientProvider));
});

/// Supabase auth stream (`onAuthStateChange`).
///
/// Invalid refresh tokens are cleared locally instead of erroring the whole app.
final authProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final controller = StreamController<AuthState>();

  // Emit current snapshot so UI does not hang if the broadcast is quiet.
  controller.add(
    AuthState(AuthChangeEvent.initialSession, client.auth.currentSession),
  );

  final sub = client.auth.onAuthStateChange.listen(
    controller.add,
    onError: (Object e, StackTrace st) async {
      if (isInvalidRefreshTokenError(e)) {
        try {
          await client.auth.signOut(scope: SignOutScope.local);
        } catch (_) {}
        if (!controller.isClosed) {
          controller.add(
            const AuthState(AuthChangeEvent.signedOut, null),
          );
        }
        return;
      }
      if (!controller.isClosed) {
        controller.addError(e, st);
      }
    },
  );

  ref.onDispose(() {
    unawaited(sub.cancel());
    unawaited(controller.close());
  });

  return controller.stream;
});

/// Signed-in driver profile; null when signed out or no row.
final currentDriverProvider =
    AutoDisposeAsyncNotifierProvider<CurrentDriverNotifier, DriverProfile?>(
  CurrentDriverNotifier.new,
);

class CurrentDriverNotifier extends AutoDisposeAsyncNotifier<DriverProfile?> {
  SupabaseService get _svc => ref.read(supabaseServiceProvider);

  @override
  Future<DriverProfile?> build() async {
    ref.watch(authProvider);
    final uid = ref.watch(supabaseClientProvider).auth.currentUser?.id;
    if (uid == null) return null;
    return _svc.getCurrentDriverProfile();
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(() async {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) return null;
      return _svc.getCurrentDriverProfile();
    });
  }
}
