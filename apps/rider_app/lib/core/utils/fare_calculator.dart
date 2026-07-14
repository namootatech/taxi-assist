/// Taxi Assist Rider fare engine.
///
/// Product rule (2026-07-14): **R25 base + R10 per km**, minimum R35.
/// Soft display cap R500 for pre-trip estimates.
class FareBreakdown {
  const FareBreakdown({
    required this.distanceKm,
    required this.baseFare,
    required this.perKmRate,
    required this.distanceCharge,
    required this.total,
  });

  final double distanceKm;
  final double baseFare;
  final double perKmRate;
  final double distanceCharge;
  final double total;

  String get distanceLabel => '${distanceKm.toStringAsFixed(1)} km';
  String get totalLabel => 'R${total.toStringAsFixed(2)}';
}

class FareCalculator {
  static const double baseFare = 25;
  static const double perKm = 10;
  static const double minimum = 35;
  static const double maxEstimate = 500;

  /// [distanceMeters] from Geolocator.distanceBetween (straight-line until
  /// Directions API is wired).
  static FareBreakdown fromMeters(double distanceMeters) {
    final km = distanceMeters <= 0 ? 0.0 : distanceMeters / 1000.0;
    final distanceCharge = km * perKm;
    var total = baseFare + distanceCharge;
    if (total < minimum) total = minimum;
    if (total > maxEstimate) total = maxEstimate;
    return FareBreakdown(
      distanceKm: km,
      baseFare: baseFare,
      perKmRate: perKm,
      distanceCharge: distanceCharge,
      total: double.parse(total.toStringAsFixed(2)),
    );
  }

  static FareBreakdown fromLatLng({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required double Function(double, double, double, double) distanceBetween,
  }) {
    final meters = distanceBetween(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return fromMeters(meters);
  }
}
