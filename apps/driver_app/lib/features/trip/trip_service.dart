import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';
import 'models/location_point.dart';
import 'models/trip.dart';

class _QueuedLocation {
  _QueuedLocation({
    required this.tripId,
    required this.driverId,
    required this.point,
  });

  final String tripId;
  final String driverId;
  final LocationPoint point;

  Map<String, dynamic> toRow() => point.toInsertRow(tripId: tripId, driverId: driverId);
}

/// Trip lifecycle + live location (Prompt 5, PRD §5.4, business-logic §3.2).
class TripService {
  TripService(this._ref);

  final Ref _ref;

  SupabaseClient get _client => _ref.read(supabaseClientProvider);
  SupabaseService get _profiles => _ref.read(supabaseServiceProvider);

  final List<_QueuedLocation> _locationQueue = [];

  static const _activeStatuses = [
    'REQUESTED',
    'ACCEPTED',
    'EN_ROUTE_PICKUP',
    'ARRIVED_PICKUP',
    'IN_PROGRESS',
  ];

  /// Same stream source as [listenForRideRequests] — Postgres changes for this driver.
  Stream<Trip?> watchActiveTrip(String driverId) {
    final controller = StreamController<Trip?>.broadcast();

    Future<void> pushLatest() async {
      try {
        controller.add(await fetchActiveTrip(driverId));
      } catch (e) {
        controller.addError(e);
      }
    }

    final channel = _client.channel('driver-trips-$driverId');
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'trips',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'driver_id',
            value: driverId,
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

  /// Realtime subscription for incoming / updated trips (alias of [watchActiveTrip]).
  Stream<Trip?> listenForRideRequests(String driverId) => watchActiveTrip(driverId);

  Future<Trip?> fetchActiveTrip(String driverId) async {
    final rows = await _client
        .from('trips')
        .select()
        .eq('driver_id', driverId)
        .inFilter('status', _activeStatuses)
        .order('updated_at', ascending: false)
        .limit(1);

    final list = rows as List<dynamic>;
    if (list.isEmpty) return null;
    return Trip.fromJson(Map<String, dynamic>.from(list.first as Map));
  }

  Future<Map<String, dynamic>> _rpc(
    String action, {
    required String tripId,
    double? finalFare,
    double? finalDistanceM,
  }) async {
    return Map<String, dynamic>.from(
      await _client.rpc(
        'driver_transition_trip',
        params: {
          'p_trip_id': tripId,
          'p_action': action,
          'p_final_fare': finalFare,
          'p_final_distance_m': finalDistanceM,
        },
      ) as Map,
    );
  }

  Future<void> acceptTrip(String tripId) async {
    final res = await _rpc('accept', tripId: tripId);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> declineTrip(String tripId) async {
    final res = await _rpc('decline', tripId: tripId);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
    await _profiles.updateProfile({'online_status': 'OFFLINE'});
    showAppToast('Request declined — you are now offline (PRD §5.4).', long: true);
  }

  Future<void> arrivedAtPickup(String tripId) async {
    final res = await _rpc('arrived_pickup', tripId: tripId);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> startTrip(String tripId) async {
    final res = await _rpc('start_trip', tripId: tripId);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> endTrip(
    String tripId, {
    double? finalDistance,
    double? finalFare,
  }) async {
    final res = await _rpc(
      'end_trip',
      tripId: tripId,
      finalFare: finalFare,
      finalDistanceM: finalDistance,
    );
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> cancelEnRoute(String tripId) async {
    final res = await _rpc('cancel_en_route', tripId: tripId);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> submitDriverRating(
    String tripId, {
    required int stars,
    String? comment,
  }) async {
    final raw = await _client.rpc(
      'driver_rate_completed_trip',
      params: {
        'p_trip_id': tripId,
        'p_rating': stars,
        'p_comment': comment,
      },
    );
    final res = Map<String, dynamic>.from(raw as Map);
    if (res['ok'] != true) {
      throw TripStateException('${res['error'] ?? res}');
    }
  }

  Future<void> updateDriverLocation(
    String tripId,
    double lat,
    double lng,
    double? speed,
  ) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;

    final point = LocationPoint(
      latitude: lat,
      longitude: lng,
      speedMps: speed,
      recordedAt: DateTime.now().toUtc(),
    );
    final row = point.toInsertRow(tripId: tripId, driverId: uid);

    try {
      await _client.from('trip_locations').insert(row);
      await _flushLocationQueue();
    } catch (_) {
      _locationQueue.add(
        _QueuedLocation(tripId: tripId, driverId: uid, point: point),
      );
    }
  }

  Future<void> _flushLocationQueue() async {
    while (_locationQueue.isNotEmpty) {
      final item = _locationQueue.first;
      try {
        await _client.from('trip_locations').insert(item.toRow());
        _locationQueue.removeAt(0);
      } catch (_) {
        break;
      }
    }
  }

  /// Flush queued points after connectivity returns (call from UI pull-to-refresh).
  Future<void> flushPendingLocations() => _flushLocationQueue();

  /// Best-effort distance (m) while moving (MVP; server may recompute fare).
  double distanceMetersBetween(LocationPoint a, LocationPoint b) {
    return Geolocator.distanceBetween(
      a.latitude,
      a.longitude,
      b.latitude,
      b.longitude,
    );
  }
}

class TripStateException implements Exception {
  TripStateException(this.message);
  final String message;
  @override
  String toString() => message;
}
