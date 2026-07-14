import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/providers/app_providers.dart';
import 'models/trip.dart';
import 'models/trip_rider_details.dart';
import 'trip_service.dart';

final tripServiceProvider = Provider<TripService>((ref) => TripService(ref));

/// Active / incoming trip for the signed-in driver (Realtime + refresh).
final currentTripProvider = StreamProvider.autoDispose<Trip?>((ref) {
  final uid = ref.watch(supabaseClientProvider).auth.currentUser?.id;
  if (uid == null) {
    return const Stream<Trip?>.empty();
  }
  return ref.watch(tripServiceProvider).watchActiveTrip(uid);
});

/// Rider details for a trip (`driver_get_trip_rider`).
final tripRiderDetailsProvider =
    FutureProvider.autoDispose.family<TripRiderDetails?, String>((ref, tripId) {
  return ref.watch(tripServiceProvider).fetchTripRider(tripId);
});

/// GoogleMap controller set from `onMapCreated` (trip map).
final tripMapControllerProvider =
    StateProvider<GoogleMapController?>((ref) => null);

/// Continuous device positions for map smoothing (battery-aware distance filter).
final locationStreamProvider = StreamProvider.autoDispose<Position>((ref) {
  return Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 15,
    ),
  );
});
