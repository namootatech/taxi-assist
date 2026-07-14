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

/// Aggregate stars for the signed-in driver (`driver_get_my_rating`).
/// Never includes raters or comments — only avg + count.
final driverMyRatingProvider =
    FutureProvider.autoDispose<({double? avg, int count})>((ref) async {
  ref.watch(currentDriverProvider);
  final raw = await ref.read(supabaseClientProvider).rpc('driver_get_my_rating');
  final map = Map<String, dynamic>.from(raw as Map);
  if (map['ok'] != true) {
    return (avg: null, count: 0);
  }
  final avg = map['avg_rating'];
  return (
    avg: avg is num ? avg.toDouble() : null,
    count: (map['total_ratings'] as num?)?.toInt() ?? 0,
  );
});
