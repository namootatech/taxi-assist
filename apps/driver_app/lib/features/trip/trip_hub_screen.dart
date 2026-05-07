import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import 'models/trip.dart';
import 'models/trip_status.dart';
import 'trip_providers.dart';
import 'active_trip_screen.dart';
import 'ride_request_screen.dart';

/// Trips tab: ride request, active trip map, or empty (Prompt 5).
class TripHubScreen extends ConsumerWidget {
  const TripHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(currentTripProvider);

    return tripAsync.when(
      data: (Trip? trip) {
        if (trip == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Trips')),
            body: ListView(
              padding: AppSpacing.screenPadding,
              children: [
                Text(
                  'No active trip',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Stay online on Home to receive ride requests. New requests '
                  'open here automatically.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(currentTripProvider),
                  child: const Text('Refresh'),
                ),
              ],
            ),
          );
        }
        if (trip.status == TripStatus.requested) {
          return RideRequestScreen(key: ValueKey(trip.tripId), trip: trip);
        }
        return ActiveTripScreen(key: ValueKey(trip.tripId), trip: trip);
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Trips')),
        body: Center(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: Text('$e'),
          ),
        ),
      ),
    );
  }
}
