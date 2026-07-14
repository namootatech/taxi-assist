import 'package:flutter_test/flutter_test.dart';
import 'package:taxi_assist_rider/core/utils/fare_calculator.dart';

void main() {
  group('Booking fare product rules', () {
    test('uses R25 base and R10 per km', () {
      expect(FareCalculator.baseFare, 25);
      expect(FareCalculator.perKm, 10);
      expect(FareCalculator.minimum, 35);
    });

    test('computes trip total from real meters', () {
      final fare = FareCalculator.fromMeters(8500);
      expect(fare.distanceKm, closeTo(8.5, 0.01));
      expect(fare.total, closeTo(25 + 85, 0.01));
    });
  });
}
