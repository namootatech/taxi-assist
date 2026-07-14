import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';
import '../../core/utils/app_log.dart';
import '../models/rider_profile.dart';
import '../services/supabase_service.dart';

/// Drawer route id for [MainShell].
final mainShellRouteProvider = StateProvider<String>((ref) => 'home');

/// Bottom nav index for [MainShell].
final mainShellTabIndexProvider = StateProvider<int>((ref) => 0);

final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return supabaseClient;
});

/// Supabase auth stream (`onAuthStateChange`).
final authProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client.auth.onAuthStateChange.map((state) {
    AppLog.d('auth.stream', 'event', {
      'event': state.event.name,
      'userId': state.session?.user.id,
    });
    return state;
  });
});

final riderWalletProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  ref.watch(authProvider);
  AppLog.d('providers.wallet', 'load');
  return ref.watch(supabaseServiceProvider).fetchRiderWallet();
});

final currentRiderProvider =
    AutoDisposeAsyncNotifierProvider<CurrentRiderNotifier, RiderProfile?>(
  CurrentRiderNotifier.new,
);

class CurrentRiderNotifier extends AutoDisposeAsyncNotifier<RiderProfile?> {
  SupabaseService get _svc => ref.read(supabaseServiceProvider);

  @override
  Future<RiderProfile?> build() async {
    ref.watch(authProvider);
    final uid = ref.watch(supabaseClientProvider).auth.currentUser?.id;
    AppLog.d('providers.currentRider', 'build', {'userId': uid});
    if (uid == null) return null;
    return _svc.getCurrentRiderProfile();
  }

  Future<void> refresh() async {
    AppLog.d('providers.currentRider', 'refresh');
    state = await AsyncValue.guard(() async {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) {
        AppLog.d('providers.currentRider', 'refresh_no_session');
        return null;
      }
      return _svc.getCurrentRiderProfile();
    });
    if (state.hasError) {
      AppLog.e(
        'providers.currentRider',
        'refresh_failed',
        error: state.error,
        stackTrace: state.stackTrace,
      );
    } else {
      AppLog.d('providers.currentRider', 'refresh_ok', {
        'hasProfile': state.valueOrNull != null,
        'status': state.valueOrNull?.status.name,
      });
    }
  }
}
