import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:taxi_assist_rider/features/trip/models/trip.dart';
import 'package:taxi_assist_rider/features/trip/models/trip_status.dart';
import 'package:taxi_assist_rider/features/trip/post_trip_screen.dart';
import 'package:taxi_assist_rider/features/trip/trip_service.dart';

const _completedTrip = Trip(
  tripId: 'trip-complete-1',
  status: TripStatus.completed,
  estimatedFare: 120,
  finalFare: 125.50,
  paymentMethod: 'CASH',
);

class _FakeTripService extends TripService {
  _FakeTripService(super.ref);

  Map<String, dynamic>? lastRating;

  @override
  Future<void> rateCompletedTrip({
    required String tripId,
    required int rating,
    required String comment,
    double? tipAmount,
  }) async {
    lastRating = {
      'tripId': tripId,
      'rating': rating,
      'comment': comment,
      'tipAmount': tipAmount,
    };
  }
}

void main() {
  group('PostTripScreen', () {
    testWidgets('shows fare and rating controls', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: PostTripScreen(trip: _completedTrip),
          ),
        ),
      );

      expect(find.text('Rate your trip'), findsOneWidget);
      expect(find.textContaining('Fare: R'), findsOneWidget);
      expect(find.text('Comment (required)'), findsOneWidget);
      expect(find.text('Submit rating'), findsOneWidget);
      expect(find.byIcon(Icons.star), findsNWidgets(5));
    });

    testWidgets('requires comment before submit', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: PostTripScreen(trip: _completedTrip),
          ),
        ),
      );

      await tester.tap(find.text('Submit rating'));
      await tester.pump();

      expect(find.text('Trip complete'), findsNothing);
    });

    testWidgets('submits rating via TripService', (tester) async {
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
            home: PostTripScreen(trip: _completedTrip),
          ),
        ),
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Comment (required)'),
        'Great driver',
      );
      await tester.tap(find.text('Submit rating'));
      await tester.pumpAndSettle();

      expect(fake.lastRating?['tripId'], 'trip-complete-1');
      expect(fake.lastRating?['rating'], 5);
      expect(fake.lastRating?['comment'], 'Great driver');
      expect(find.text('Trip complete'), findsOneWidget);
    });
  });
}
