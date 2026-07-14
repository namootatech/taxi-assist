import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/utils/app_log.dart';
import '../../shared/providers/app_providers.dart';
import 'models/location_point.dart';
import 'models/trip.dart';
import 'models/trip_driver_details.dart';

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
    Timer? poll;

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

    // Realtime can miss events on emulators — poll as a safety net.
    poll = Timer.periodic(const Duration(seconds: 4), (_) {
      unawaited(pushLatest());
    });

    unawaited(pushLatest());

    controller.onCancel = () {
      poll?.cancel();
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
    AppLog.d('trip.fetchActive', 'started', {'riderId': riderId});
    try {
      final activeRows = await _client
          .from('trips')
          .select()
          .eq('rider_id', riderId)
          .inFilter('status', _activeStatuses)
          .order('updated_at', ascending: false)
          .limit(1);

      final activeList = activeRows as List;
      if (activeList.isNotEmpty) {
        final trip =
            Trip.fromJson(Map<String, dynamic>.from(activeList.first as Map));
        AppLog.d('trip.fetchActive', 'ok', {
          'tripId': trip.tripId,
          'status': trip.status.name,
        });
        return trip;
      }

      // Surface completed trips until the rider rates (or skips this session).
      final completedRows = await _client
          .from('trips')
          .select()
          .eq('rider_id', riderId)
          .eq('status', 'COMPLETED')
          .order('updated_at', ascending: false)
          .limit(1);

      final completedList = completedRows as List;
      if (completedList.isEmpty) {
        AppLog.d('trip.fetchActive', 'none');
        return null;
      }

      final trip = Trip.fromJson(
        Map<String, dynamic>.from(completedList.first as Map),
      );

      final rating = await _client
          .from('driver_ratings')
          .select('rating_id')
          .eq('trip_id', trip.tripId)
          .eq('rider_id', riderId)
          .maybeSingle();

      if (rating != null) {
        AppLog.d('trip.fetchActive', 'completed_already_rated', {
          'tripId': trip.tripId,
        });
        return null;
      }

      AppLog.d('trip.fetchActive', 'completed_awaiting_rating', {
        'tripId': trip.tripId,
      });
      return trip;
    } catch (e, st) {
      AppLog.e('trip.fetchActive', 'failed', error: e, stackTrace: st);
      rethrow;
    }
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
    AppLog.i('trip.request', 'started', {
      'paymentMethod': paymentMethod,
      'estimatedFare': estimatedFare,
    });
    try {
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
        AppLog.w('trip.request', 'rpc_rejected', {'error': '${res['error']}'});
        throw TripStateException('${res['error'] ?? res}');
      }
      final tripJson = Map<String, dynamic>.from(res['trip'] as Map);
      final trip = Trip.fromJson(tripJson);

      if (paymentMethod == 'WALLET' &&
          estimatedFare != null &&
          estimatedFare > 0) {
        AppLog.i('trip.request', 'wallet_debit', {'amount': estimatedFare});
        await _ref.read(supabaseServiceProvider).debitWalletForTrip(
              tripId: trip.tripId,
              amount: estimatedFare,
            );
      }

      AppLog.i('trip.request', 'completed', {'tripId': trip.tripId});
      return trip;
    } catch (e, st) {
      AppLog.e('trip.request', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> cancelTrip(String tripId, {String? reason}) async {
    AppLog.i('trip.cancel', 'started', {'tripId': tripId});
    try {
      final raw = await _client.rpc(
        'rider_cancel_trip',
        params: {
          'p_trip_id': tripId,
          'p_reason': reason,
        },
      );
      final res = Map<String, dynamic>.from(raw as Map);
      if (res['ok'] != true) {
        AppLog.w('trip.cancel', 'rpc_rejected', {'error': '${res['error']}'});
        throw TripStateException('${res['error'] ?? res}');
      }
      AppLog.i('trip.cancel', 'completed', {'tripId': tripId});
    } catch (e, st) {
      AppLog.e('trip.cancel', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> rateCompletedTrip({
    required String tripId,
    required int rating,
    required String comment,
    double? tipAmount,
  }) async {
    AppLog.i('trip.rate', 'started', {
      'tripId': tripId,
      'rating': rating,
      'hasTip': tipAmount != null,
    });
    try {
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
        AppLog.w('trip.rate', 'rpc_rejected', {'error': '${res['error']}'});
        throw TripStateException('${res['error'] ?? res}');
      }
      AppLog.i('trip.rate', 'completed', {'tripId': tripId});
    } catch (e, st) {
      AppLog.e('trip.rate', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  /// Assigned driver card for an owned trip (name, selfie, rating, vehicle).
  Future<TripDriverDetails?> fetchTripDriver(String tripId) async {
    AppLog.d('trip.driverCard', 'started', {'tripId': tripId});
    try {
      final raw = await _client.rpc(
        'rider_get_trip_driver',
        params: {'p_trip_id': tripId},
      );
      final res = Map<String, dynamic>.from(raw as Map);
      if (res['ok'] != true) {
        AppLog.w('trip.driverCard', 'rpc_rejected', {'error': '${res['error']}'});
        throw TripStateException('${res['error'] ?? res}');
      }
      if (res['assigned'] != true || res['driver'] is! Map) {
        AppLog.d('trip.driverCard', 'unassigned');
        return null;
      }
      final details = TripDriverDetails.fromJson(
        Map<String, dynamic>.from(res['driver'] as Map),
      );
      final resolved = details.copyWithSelfie(
        _resolveSelfieUrl(details.selfieUrl),
      );
      AppLog.d('trip.driverCard', 'ok', {
        'driverId': resolved.id,
        'hasVehicle': resolved.vehicle != null,
        'hasRating': resolved.avgRating != null,
      });
      return resolved;
    } catch (e, st) {
      AppLog.e('trip.driverCard', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  @Deprecated('Use fetchTripDriver(tripId) — profile RLS blocks direct reads')
  Future<Map<String, dynamic>?> fetchDriverProfile(String? driverId) async {
    AppLog.d('trip.driverProfile', 'legacy_skipped', {'driverId': driverId});
    return null;
  }

  String? _resolveSelfieUrl(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final path = raw.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    try {
      return _client.storage.from('driver-documents').getPublicUrl(path);
    } catch (_) {
      return path;
    }
  }
}

class TripStateException implements Exception {
  TripStateException(this.message);
  final String message;
  @override
  String toString() => message;
}
