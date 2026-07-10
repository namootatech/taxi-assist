import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/rider_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/map_placeholder.dart';
import '../trip/active_trip_screen.dart';
import '../trip/booking_wizard_screen.dart';
import '../trip/models/trip_status.dart';
import '../trip/post_trip_screen.dart';
import '../trip/trip_service.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentRiderProvider).valueOrNull;
    final tripAsync = ref.watch(currentTripProvider);

    return tripAsync.when(
      data: (trip) {
        if (trip != null && trip.status == TripStatus.completed) {
          return PostTripScreen(trip: trip);
        }
        if (trip != null && trip.isActive) {
          return ActiveTripScreen(trip: trip);
        }
        return _BookingHome(profile: profile);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
    );
  }
}

class _BookingHome extends ConsumerStatefulWidget {
  const _BookingHome({this.profile});

  final RiderProfile? profile;

  @override
  ConsumerState<_BookingHome> createState() => _BookingHomeState();
}

class _BookingHomeState extends ConsumerState<_BookingHome> {
  Position? _position;
  var _loadingLocation = false;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    setState(() => _loadingLocation = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      if (mounted) setState(() => _position = pos);
    } finally {
      if (mounted) setState(() => _loadingLocation = false);
    }
  }

  void _openBooking() {
    final profile = widget.profile;
    if (profile == null || !profile.canBook) {
      showAppToast(
        profile == null
            ? 'Sign in to book'
            : 'Complete verification before booking',
        long: true,
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BookingWizardScreen(
          initialLat: _position?.latitude,
          initialLng: _position?.longitude,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canBook = widget.profile?.canBook ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: AppSpacing.screenPadding,
          child: Text(
            'Where to?',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: MapPlaceholder(
              height: double.infinity,
              pickupLabel: _position != null ? 'Your location' : null,
            ),
          ),
        ),
        if (!canBook)
          Padding(
            padding: AppSpacing.screenPadding,
            child: Card(
              color: Theme.of(context).colorScheme.errorContainer,
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Text('Verify your profile to book trips.'),
              ),
            ),
          ),
        Padding(
          padding: AppSpacing.screenPadding,
          child: FilledButton.icon(
            onPressed: _loadingLocation ? null : _openBooking,
            icon: _loadingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.local_taxi),
            label: const Text('Book a trip'),
          ),
        ),
      ],
    );
  }
}
