import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/services/places_service.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/rider_location.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/rider_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/places_search_field.dart';
import '../../shared/widgets/rider_map.dart';
import '../profile/document_upload_screen.dart';
import '../trip/booking_wizard_screen.dart';
import '../trip/active_trip_screen.dart';
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
  String? _locationError;
  String? _addressLabel;
  final _whereTo = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  @override
  void dispose() {
    _whereTo.dispose();
    super.dispose();
  }

  Future<void> _loadLocation() async {
    setState(() {
      _loadingLocation = true;
      _locationError = null;
    });
    final result = await RiderLocation.getCurrent();
    if (!mounted) return;
    if (!result.ok) {
      setState(() {
        _locationError = result.errorMessage;
        _loadingLocation = false;
      });
      if (result.errorMessage != null) {
        showAppToast(result.errorMessage!, long: true);
      }
      return;
    }
    final pos = result.position!;
    setState(() {
      _position = pos;
      _loadingLocation = false;
    });
    final label = await PlacesService().reverseGeocode(pos.latitude, pos.longitude);
    if (mounted && label != null) {
      setState(() => _addressLabel = label);
    }
  }

  void _openBooking({PlaceDetails? dropoff}) {
    final profile = widget.profile;
    if (profile == null || !profile.canBook) {
      showAppToast(
        profile == null
            ? 'Sign in to book'
            : 'Your account cannot book trips right now. Contact support.',
        long: true,
      );
      return;
    }
    Navigator.of(context).push(
      PageRouteBuilder<void>(
        pageBuilder: (_, a, __) => BookingWizardScreen(
          initialLat: _position?.latitude,
          initialLng: _position?.longitude,
          initialPickupAddress: _addressLabel ?? 'Current location',
          initialDropoff: dropoff,
        ),
        transitionsBuilder: (_, anim, __, child) => SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final showVerifyHint = profile?.isVerificationPending ?? false;
    final scheme = Theme.of(context).colorScheme;

    return Stack(
      fit: StackFit.expand,
      children: [
        RiderMap(
          initialLat: _position?.latitude,
          initialLng: _position?.longitude,
          pickup: _position == null
              ? null
              : LatLng(_position!.latitude, _position!.longitude),
          myLocationEnabled: true,
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: SafeArea(
            child: AnimatedPadding(
              duration: const Duration(milliseconds: 250),
              padding: AppSpacing.screenPadding,
              child: Material(
                elevation: 0,
                borderRadius: BorderRadius.circular(20),
                color: scheme.surface,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: scheme.outline.withOpacity(0.18),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.18),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              height: 36,
                              width: 36,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                color: scheme.primary.withOpacity(0.14),
                              ),
                              child: Icon(
                                Icons.local_taxi,
                                size: 20,
                                color: scheme.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Where to?',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _addressLabel ??
                              (_loadingLocation
                                  ? 'Finding your location…'
                                  : (_locationError ?? 'Set pickup on map')),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (_locationError != null) ...[
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: _loadLocation,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry location'),
                          ),
                        ],
                        const SizedBox(height: 12),
                        PlacesSearchField(
                          label: 'Destination',
                          controller: _whereTo,
                          biasLat: _position?.latitude,
                          biasLng: _position?.longitude,
                          onPlaceSelected: (details) {
                            AppLog.i('ui.home', 'dropoff_picked');
                            _openBooking(dropoff: details);
                          },
                        ),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed:
                              _loadingLocation ? null : () => _openBooking(),
                          icon: const Icon(Icons.local_taxi),
                          label: const Text('Book a trip'),
                        ),
                        if (showVerifyHint) ...[
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const DocumentUploadScreen(),
                              ),
                            ),
                            child: const Text('Verify account (optional)'),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
