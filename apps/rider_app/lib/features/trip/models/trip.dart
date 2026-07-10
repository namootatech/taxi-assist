import 'trip_status.dart';

class Trip {
  const Trip({
    required this.tripId,
    this.riderId,
    this.driverId,
    this.vehicleId,
    required this.status,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.pickupAddress,
    this.dropoffAddress,
    this.paymentMethod,
    this.estimatedFare,
    this.estimatedDurationSec,
    this.finalFare,
    this.finalDistanceM,
    this.riderTipAmount,
    this.cancelReason,
    this.completedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String tripId;
  final String? riderId;
  final String? driverId;
  final String? vehicleId;
  final TripStatus status;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? pickupAddress;
  final String? dropoffAddress;
  final String? paymentMethod;
  final double? estimatedFare;
  final int? estimatedDurationSec;
  final double? finalFare;
  final double? finalDistanceM;
  final double? riderTipAmount;
  final String? cancelReason;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => const [
        TripStatus.requested,
        TripStatus.enRoutePickup,
        TripStatus.arrivedPickup,
        TripStatus.inProgress,
      ].contains(status);

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
      riderId: json['rider_id'] as String?,
      driverId: json['driver_id'] as String?,
      vehicleId: json['vehicle_id'] as String?,
      status: parseTripStatus(json['status'] as String?),
      pickupLat: n(json['pickup_lat']),
      pickupLng: n(json['pickup_lng']),
      dropoffLat: n(json['dropoff_lat']),
      dropoffLng: n(json['dropoff_lng']),
      pickupAddress: json['pickup_address'] as String?,
      dropoffAddress: json['dropoff_address'] as String?,
      paymentMethod: json['payment_method'] as String?,
      estimatedFare: n(json['estimated_fare']),
      estimatedDurationSec: ni(json['estimated_duration_sec']),
      finalFare: n(json['final_fare']),
      finalDistanceM: n(json['final_distance_m']),
      riderTipAmount: n(json['rider_tip_amount']),
      cancelReason: json['cancel_reason'] as String?,
      completedAt: dt(json['completed_at']),
      createdAt: dt(json['created_at']),
      updatedAt: dt(json['updated_at']),
    );
  }
}
