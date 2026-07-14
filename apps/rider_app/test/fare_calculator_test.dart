import 'package:flutter_test/flutter_test.dart';
import 'package:taxi_assist_rider/core/utils/fare_calculator.dart';

void main() {
  group('FareCalculator', () {
    test('applies base + R10/km with minimum', () {
      // 1 km → 25 + 10 = 35 (hits minimum floor equally)
      final f = FareCalculator.fromMeters(1000);
      expect(f.perKmRate, 10);
      expect(f.baseFare, 25);
      expect(f.total, 35);
    });

    test('charges distance for longer trips', () {
      // 10 km → 25 + 100 = 125
      final f = FareCalculator.fromMeters(10000);
      expect(f.distanceKm, 10);
      expect(f.total, 125);
    });

    test('caps soft max estimate', () {
      final f = FareCalculator.fromMeters(100000);
      expect(f.total, FareCalculator.maxEstimate);
    });
  });
}
