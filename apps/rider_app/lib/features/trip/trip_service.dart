import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/providers/app_providers.dart';
import 'models/location_point.dart';
import 'models/trip.dart';

final tripServiceProvider = Provider<TripService>((ref) => TripService(ref));

final currentTripProvider = StreamProvider.autoDispose<Trip?>((ref) {
  final uid = ref.watch(supabaseClientProvider).auth.currentUser?.id;
  if (uid == null) return const Stream.empty();
  return ref.watch(tripServiceProvider).watchActiveTrip(uid);
});

final driverLocationProvider =
    StreamProvider.autoDispose.family<LocationPoint?, String>((ref, tripId) {
  return ref.watch(tripServiceProvider).watchLatestDriverLocation(tripId);
});

class TripService {
  TripService(this._ref);

  final Ref _ref;

  SupabaseClient get _client => _ref.read(supabaseClientProvider);

  static const _activeStatuses = [
    'REQUESTED',
    'EN_ROUTE_PICKUP',
    'ARRIVED_PICKUP',
    'IN_PROGRESS',
  ];

  Stream<Trip?> watchActiveTrip(String riderId) {
    final controller = StreamController<Trip?>.broadcast();

    Future<void> pushLatest() async {
      try {
        controller.add(await fetchActiveTrip(riderId));
      } catch (e) {
        controller.addError(e);
      }
    }

    final channel = _client.channel('rider-trips-$riderId');
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'trips',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'rider_id',
            value: riderId,
          ),
          callback: (_) => unawaited(pushLatest()),
        )
        .subscribe();

    unawaited(pushLatest());

    controller.onCancel = () {
      unawaited(_client.removeChannel(channel));
    };

    return controller.stream;
  }

  Stream<LocationPoint?> watchLatestDriverLocation(String tripId) {
    final controller = StreamController<LocationPoint?>.broadcast();

    Future<void> pushLatest() async {
      try {
        final rows = await _client
            .from('trip_locations')
            .select()
            .eq('trip_id', tripId)
            .order('recorded_at', ascending: false)
            .limit(1);
        final list = rows as List;
        if (list.isEmpty) {
          controller.add(null);
          return;
        }
        controller.add(
          LocationPoint.fromJson(Map<String, dynamic>.from(list.first as Map)),
        );
      } catch (e) {
        controller.addError(e);
      }
    }

    final channel = _client.channel('rider-trip-loc-$tripId');
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'trip_locations',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'trip_id',
            value: tripId,
          ),
          callback: (_) => unawaited(pushLatest()),
        )
        .subscribe();

    unawaited(pushLatest());

    controller.onCancel = () {
      unawaited(_client.removeChannel(channel));
    };

    return controller.stream;
  }

  Future<Trip?> fetchActiveTrip(String riderId) async {
    final rows = await _client
        .from('trips')
        .select()
        .eq('rider_id', riderId)
        .inFilter('status', _activeStatuses)
        .order('updated_at', ascending: false)
        .limit(1);

    final list = rows as List;
    if (list.isEmpty) return null;
    return Trip.fromJson(Map<String, dynamic>.from(list.first as Map));
  }

  Future<Trip> requestTrip({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? pickupAddress,
    String? dropoffAddress,
    required String paymentMethod,
    double? estimatedFare,
    int? estimatedDurationSec,
  }) async {
    final raw = await _client.rpc(
      'rider_request_trip',
      params: {
        'p_pickup_lat': pickupLat,
        'p_pickup_lng': pickupLng,
        'p_dropoff_lat': dropoffLat,
        'p_dropoff_lng': dropoffLng,
        'p_pickup_address': pickupAddress,
        'p_dropoff_address': dropoffAddress,
        'p_payment_method': paymentMethod,
        'p_estimated_fare': estimatedFare,
        'p_estimated_duration_sec': estimatedDurationSec,
      },
    );
    final res = Map<String, dynamic>.from(raw as Map);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
    final tripJson = Map<String, dynamic>.from(res['trip'] as Map);
    return Trip.fromJson(tripJson);
  }

  Future<void> cancelTrip(String tripId, {String? reason}) async {
    final raw = await _client.rpc(
      'rider_cancel_trip',
      params: {
        'p_trip_id': tripId,
        'p_reason': reason,
      },
    );
    final res = Map<String, dynamic>.from(raw as Map);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> rateCompletedTrip({
    required String tripId,
    required int rating,
    required String comment,
    double? tipAmount,
  }) async {
    final raw = await _client.rpc(
      'rider_rate_completed_trip',
      params: {
        'p_trip_id': tripId,
        'p_rating': rating,
        'p_comment': comment,
        'p_tip_amount': tipAmount,
      },
    );
    final res = Map<String, dynamic>.from(raw as Map);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<Map<String, dynamic>?> fetchDriverProfile(String? driverId) async {
    if (driverId == null) return null;
    final row = await _client
        .from('profiles')
        .select('id, full_name, cellphone, selfie_url')
        .eq('id', driverId)
        .maybeSingle();
    if (row == null) return null;
    return Map<String, dynamic>.from(row);
  }
}

class TripStateException implements Exception {
  TripStateException(this.message);
  final String message;
  @override
  String toString() => message;
}
