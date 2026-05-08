import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/driver_enums.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';
import 'go_online_state.dart';

final goOnlineNotifierProvider =
    StateNotifierProvider<GoOnlineNotifier, GoOnlineUiState>((ref) {
  return GoOnlineNotifier(ref);
});

class GoOnlineNotifier extends StateNotifier<GoOnlineUiState> {
  GoOnlineNotifier(this._ref) : super(const GoOnlineUiState());

  final Ref _ref;

  SupabaseService get _svc => _ref.read(supabaseServiceProvider);

  /// Clear local session timer when profile shows offline (e.g. refresh).
  void clearSessionTimer() {
    state = state.copyWith(clearSession: true);
  }

  void clearDisplayedBlockers() {
    state = state.copyWith(clearReasons: true);
  }

  List<String> _parseReasons(Object? raw) {
    if (raw is List) {
      return raw.map((e) => '$e').toList();
    }
    return const [];
  }

  Future<void> goOnline() async {
    state = state.copyWith(busy: true, clearReasons: true);
    try {
      final loc = await Permission.locationWhenInUse.request();
      if (!loc.isGranted) {
        showAppToast(
          'Location permission is required to go online and receive trips.',
          long: true,
        );
        state = state.copyWith(busy: false);
        return;
      }

      final res = await _svc.driverPrecheckGoOnline();
      final ok = res['ok'] == true;
      if (!ok) {
        final reasons = _parseReasons(res['reasons']);
        state = state.copyWith(busy: false, lastPrecheckReasons: reasons);
        showAppToast(
          reasons.isNotEmpty ? reasons.first : 'You cannot go online yet.',
          long: true,
        );
        return;
      }

      await _svc.updateProfile({'online_status': 'ONLINE'});
      await _ref.read(currentDriverProvider.notifier).refresh();
      state = state.copyWith(
        busy: false,
        onlineSessionStartedAt: DateTime.now(),
        clearReasons: true,
      );
      showAppToast('You are now online');
    } catch (e) {
      state = state.copyWith(busy: false);
      showAppToast(userFacingError(e), long: true);
    }
  }

  Future<void> goOffline() async {
    state = state.copyWith(busy: true);
    try {
      await _svc.updateProfile({'online_status': 'OFFLINE'});
      await _ref.read(currentDriverProvider.notifier).refresh();
      state = state.copyWith(
        busy: false,
        clearSession: true,
        clearReasons: true,
      );
      showAppToast('You are now offline');
    } catch (e) {
      state = state.copyWith(busy: false);
      showAppToast(userFacingError(e), long: true);
    }
  }

  /// Called when Realtime indicates profile/docs changed and server rules no longer allow online.
  Future<void> complianceForceOffline() async {
    final profile = _ref.read(currentDriverProvider).valueOrNull;
    if (profile?.onlineStatus != DriverOnlineStatus.online) {
      clearSessionTimer();
      return;
    }
    try {
      await _svc.updateProfile({'online_status': 'OFFLINE'});
      await _ref.read(currentDriverProvider.notifier).refresh();
      state = state.copyWith(clearSession: true);
      showAppToast(
        'You\'re now offline — your documents or approval status changed.',
        long: true,
      );
    } catch (e) {
      showAppToast(userFacingError(e), long: true);
    }
  }

  Future<void> revalidateIfOnline() async {
    final profile = _ref.read(currentDriverProvider).valueOrNull;
    if (profile?.onlineStatus != DriverOnlineStatus.online) return;

    final res = await _svc.driverPrecheckGoOnline();
    if (res['ok'] != true) {
      final reasons = _parseReasons(res['reasons']);
      state = state.copyWith(lastPrecheckReasons: reasons);
      await complianceForceOffline();
    } else {
      state = state.copyWith(clearReasons: true);
    }
  }
}
