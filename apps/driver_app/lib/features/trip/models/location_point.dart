/// Single driver GPS sample (trip_locations row / live map).
class LocationPoint {
  const LocationPoint({
    required this.latitude,
    required this.longitude,
    this.speedMps,
    this.recordedAt,
  });

  final double latitude;
  final double longitude;
  final double? speedMps;
  final DateTime? recordedAt;

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      latitude: (json['lat'] as num).toDouble(),
      longitude: (json['lng'] as num).toDouble(),
      speedMps: (json['speed_mps'] as num?)?.toDouble(),
      recordedAt: json['recorded_at'] != null
          ? DateTime.tryParse('${json['recorded_at']}')
          : null,
    );
  }

  Map<String, dynamic> toInsertRow({
    required String tripId,
    required String driverId,
  }) {
    return {
      'trip_id': tripId,
      'driver_id': driverId,
      'lat': latitude,
      'lng': longitude,
      if (speedMps != null) 'speed_mps': speedMps,
    };
  }
}
