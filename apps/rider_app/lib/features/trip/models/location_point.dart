class LocationPoint {
  const LocationPoint({
    required this.latitude,
    required this.longitude,
    this.speedMps,
    required this.recordedAt,
  });

  final double latitude;
  final double longitude;
  final double? speedMps;
  final DateTime recordedAt;

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    double n(Object? v) => v is num ? v.toDouble() : 0;
    return LocationPoint(
      latitude: n(json['lat']),
      longitude: n(json['lng']),
      speedMps: json['speed_mps'] is num ? (json['speed_mps'] as num).toDouble() : null,
      recordedAt: DateTime.tryParse('${json['recorded_at']}') ?? DateTime.now(),
    );
  }
}
