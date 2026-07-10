import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:taxi_assist_rider/features/trip/booking_wizard_screen.dart';
import 'package:taxi_assist_rider/features/trip/models/trip.dart';
import 'package:taxi_assist_rider/features/trip/models/trip_status.dart';
import 'package:taxi_assist_rider/features/trip/trip_service.dart';

class _FakeTripService extends TripService {
  _FakeTripService(super.ref);

  Trip? lastRequest;

  @override
  Future<Trip> requestTrip({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? pickupAddress,
    String? dropoffAddress,
    required String paymentMethod,
    double? estimatedFare,
    int? estimatedDurationSec,
  }) async {
    lastRequest = Trip(
      tripId: 'trip-test-1',
      status: TripStatus.requested,
      pickupLat: pickupLat,
      pickupLng: pickupLng,
      dropoffLat: dropoffLat,
      dropoffLng: dropoffLng,
      paymentMethod: paymentMethod,
      estimatedFare: estimatedFare,
    );
    return lastRequest!;
  }
}

void main() {
  group('BookingWizardScreen', () {
    testWidgets('shows pickup step first', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: BookingWizardScreen(initialLat: -33.9, initialLng: 18.4),
          ),
        ),
      );

      expect(find.text('Book a trip'), findsOneWidget);
      expect(find.text('Pickup address'), findsOneWidget);
      expect(find.byKey(const ValueKey('wizard-continue')), findsOneWidget);
    });

    testWidgets('advances through wizard steps', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: BookingWizardScreen(initialLat: -33.9, initialLng: 18.4),
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey('wizard-continue')));
      await tester.pumpAndSettle();

      expect(find.text('Destination'), findsWidgets);

      await tester.tap(find.byKey(const ValueKey('wizard-continue')));
      await tester.pumpAndSettle();

      expect(find.text('Payment & confirm'), findsOneWidget);
      expect(find.textContaining('Estimated fare'), findsOneWidget);
      expect(find.text('Cash'), findsOneWidget);
    });

    testWidgets('confirm calls requestTrip', (tester) async {
      late _FakeTripService fake;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tripServiceProvider.overrideWith((ref) {
              fake = _FakeTripService(ref);
              return fake;
            }),
          ],
          child: const MaterialApp(
            home: BookingWizardScreen(initialLat: -33.9, initialLng: 18.4),
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey('wizard-continue')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('wizard-continue')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('wizard-continue')));
      await tester.pumpAndSettle();

      expect(fake.lastRequest, isNotNull);
      expect(fake.lastRequest!.paymentMethod, 'CASH');
      expect(fake.lastRequest!.status, TripStatus.requested);
    });
  });
}
