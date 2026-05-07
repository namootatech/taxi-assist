import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/providers/app_providers.dart';

/// One completed trip row for the earnings list.
class EarningsTripRow {
  const EarningsTripRow({
    required this.tripId,
    this.completedAt,
    this.finalFare,
    this.riderRating,
    this.riderDisplayName,
  });

  final String tripId;
  final DateTime? completedAt;
  final double? finalFare;
  /// Stars the rider gave the driver (`trips.driver_rating`).
  final int? riderRating;
  final String? riderDisplayName;

  factory EarningsTripRow.fromMap(Map<String, dynamic> m) {
    DateTime? completed;
    final c = m['completed_at'];
    if (c != null) {
      completed = DateTime.tryParse('$c');
    }
    final fareRaw = m['final_fare'];
    final fare = fareRaw is num ? fareRaw.toDouble() : null;
    final r = m['driver_rating'];
    final int? rating = r is int ? r : (r is num ? r.toInt() : null);
    return EarningsTripRow(
      tripId: m['trip_id'] as String,
      completedAt: completed,
      finalFare: fare,
      riderRating: rating,
      riderDisplayName: m['rider_display_name'] as String?,
    );
  }
}

class EarningsSummary {
  const EarningsSummary({
    required this.todayTotal,
    required this.weekTotal,
    required this.monthTotal,
    required this.trips,
  });

  final double todayTotal;
  final double weekTotal;
  final double monthTotal;
  final List<EarningsTripRow> trips;
}

final earningsSummaryProvider =
    FutureProvider.autoDispose<EarningsSummary>((ref) async {
  ref.watch(currentDriverProvider);
  final rows =
      await ref.watch(supabaseServiceProvider).fetchCompletedTripsForDriver();
  final trips = rows.map(EarningsTripRow.fromMap).toList();
  final now = DateTime.now();
  final startOfToday = DateTime(now.year, now.month, now.day);
  final startOfWeek =
      startOfToday.subtract(Duration(days: now.weekday - DateTime.monday));
  final startOfMonth = DateTime(now.year, now.month, 1);

  double todayTotal = 0;
  double weekTotal = 0;
  double monthTotal = 0;

  for (final t in trips) {
    final c = t.completedAt?.toLocal();
    if (c == null) continue;
    final fare = t.finalFare ?? 0;
    if (!c.isBefore(startOfToday)) {
      todayTotal += fare;
    }
    if (!c.isBefore(startOfWeek)) {
      weekTotal += fare;
    }
    if (!c.isBefore(startOfMonth)) {
      monthTotal += fare;
    }
  }

  return EarningsSummary(
    todayTotal: todayTotal,
    weekTotal: weekTotal,
    monthTotal: monthTotal,
    trips: trips,
  );
});

final payoutsListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  ref.watch(currentDriverProvider);
  return ref.watch(supabaseServiceProvider).fetchPayouts();
});
