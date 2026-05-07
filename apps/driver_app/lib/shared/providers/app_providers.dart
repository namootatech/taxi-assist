import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';
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
final authProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client.auth.onAuthStateChange;
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
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) return null;
      return _svc.getCurrentDriverProfile();
    });
  }
}
