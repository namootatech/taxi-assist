import 'package:flutter_test/flutter_test.dart';

import 'package:taxi_assist_driver/features/trip/models/trip_rider_details.dart';

void main() {
  group('formatMemberTenure', () {
    final joined = DateTime.utc(2026, 1, 1, 12);

    test('hours when under a day', () {
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 1, 1, 15)),
        '3 hours',
      );
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 1, 1, 13)),
        '1 hour',
      );
    });

    test('days when under a month', () {
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 1, 4, 12)),
        '3 days',
      );
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 1, 2, 12)),
        '1 day',
      );
    });

    test('months when under a year', () {
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 4, 1, 12)),
        '3 months',
      );
      expect(
        formatMemberTenure(joined, DateTime.utc(2026, 2, 1, 12)),
        '1 month',
      );
    });

    test('years and months when over a year', () {
      expect(
        formatMemberTenure(joined, DateTime.utc(2027, 1, 1, 12)),
        '1 year',
      );
      expect(
        formatMemberTenure(joined, DateTime.utc(2028, 4, 1, 12)),
        '2 years 3 months',
      );
    });
  });
}
