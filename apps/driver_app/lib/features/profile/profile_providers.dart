import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/providers/app_providers.dart';

/// Vehicle linked from [DriverProfile.currentVehicleId] (RLS-scoped).
final linkedVehicleProvider =
    FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final profile = ref.watch(currentDriverProvider).valueOrNull;
  final vid = profile?.currentVehicleId;
  if (vid == null) return null;
  return ref.read(supabaseServiceProvider).fetchVehicleById(vid);
});
