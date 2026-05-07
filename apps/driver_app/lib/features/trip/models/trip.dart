import 'trip_status.dart';

/// Row from `public.trips` (Prompt 5 / PRD §5.4).
class Trip {
  const Trip({
    required this.tripId,
    required this.driverId,
    this.vehicleId,
    required this.status,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.pickupAddress,
    this.dropoffAddress,
    this.riderDisplayName,
    this.riderVerified = false,
    this.paymentMethod,
    this.estimatedFare,
    this.estimatedDurationSec,
    this.finalFare,
    this.finalDistanceM,
    this.destinationUpdatedAt,
    this.cancelReason,
    this.driverRating,
    this.driverComment,
    this.completedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String tripId;
  final String driverId;
  final String? vehicleId;
  final TripStatus status;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? pickupAddress;
  final String? dropoffAddress;
  final String? riderDisplayName;
  final bool riderVerified;
  final String? paymentMethod;
  final double? estimatedFare;
  final int? estimatedDurationSec;
  final double? finalFare;
  final double? finalDistanceM;
  final DateTime? destinationUpdatedAt;
  final String? cancelReason;
  final int? driverRating;
  final String? driverComment;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  /// Rider changed destination mid-trip (server sets `destination_updated_at`).
  bool get shouldShowDestinationBanner =>
      destinationUpdatedAt != null && status == TripStatus.inProgress;

  factory Trip.fromJson(Map<String, dynamic> json) {
    double? n(Object? v) => v is num ? v.toDouble() : null;
    int? ni(Object? v) => v is int ? v : (v is num ? v.toInt() : null);
    DateTime? dt(Object? v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      return DateTime.tryParse('$v');
    }

    return Trip(
      tripId: json['trip_id'] as String,
      driverId: json['driver_id'] as String,
      vehicleId: json['vehicle_id'] as String?,
      status: parseTripStatus(json['status'] as String?),
      pickupLat: n(json['pickup_lat']),
      pickupLng: n(json['pickup_lng']),
      dropoffLat: n(json['dropoff_lat']),
      dropoffLng: n(json['dropoff_lng']),
      pickupAddress: json['pickup_address'] as String?,
      dropoffAddress: json['dropoff_address'] as String?,
      riderDisplayName: json['rider_display_name'] as String?,
      riderVerified: json['rider_verified'] as bool? ?? false,
      paymentMethod: json['payment_method'] as String?,
      estimatedFare: n(json['estimated_fare']),
      estimatedDurationSec: ni(json['estimated_duration_sec']),
      finalFare: n(json['final_fare']),
      finalDistanceM: n(json['final_distance_m']),
      destinationUpdatedAt: dt(json['destination_updated_at']),
      cancelReason: json['cancel_reason'] as String?,
      driverRating: ni(json['driver_rating']),
      driverComment: json['driver_comment'] as String?,
      completedAt: dt(json['completed_at']),
      createdAt: dt(json['created_at']),
      updatedAt: dt(json['updated_at']),
    );
  }

  /// PRD §4.2 payment copy for drivers.
  String get paymentMethodLabel {
    final p = (paymentMethod ?? '').toUpperCase();
    if (p.contains('CASH') && p.contains('WALLET')) return 'Cash top-up';
    if (p == 'CASH') return 'Cash';
    if (p == 'CARD' || p == 'APP_WALLET' || p.contains('WALLET')) {
      return 'Card / App';
    }
    if (p.isEmpty) return '—';
    return paymentMethod!;
  }
}
