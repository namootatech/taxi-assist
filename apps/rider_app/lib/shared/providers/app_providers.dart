import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';
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
  return client.auth.onAuthStateChange;
});

final riderWalletProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  ref.watch(authProvider);
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
    if (uid == null) return null;
    return _svc.getCurrentRiderProfile();
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(() async {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) return null;
      return _svc.getCurrentRiderProfile();
    });
  }
}
