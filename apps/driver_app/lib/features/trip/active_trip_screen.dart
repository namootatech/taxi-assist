import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import 'models/location_point.dart';
import 'models/trip.dart';
import 'models/trip_status.dart';
import 'trip_providers.dart';
import 'widgets/trip_rider_card.dart';

/// Live map + lifecycle actions (Prompt 5, PRD §5.4).
class ActiveTripScreen extends ConsumerStatefulWidget {
  const ActiveTripScreen({super.key, required this.trip});

  final Trip trip;

  @override
  ConsumerState<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends ConsumerState<ActiveTripScreen> {
  Timer? _locationTimer;
  Position? _lastPosition;
  bool _destinationBannerDismissed = false;

  Trip get t => widget.trip;

  LatLng get _pickup => LatLng(
        t.pickupLat ?? -33.9249,
        t.pickupLng ?? 18.4241,
      );

  LatLng get _dropoff => LatLng(
        t.dropoffLat ?? _pickup.latitude,
        t.dropoffLng ?? _pickup.longitude,
      );

  @override
  void initState() {
    super.initState();
    _syncLocationTimer();
  }

  @override
  void didUpdateWidget(covariant ActiveTripScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trip.tripId != widget.trip.tripId) {
      _destinationBannerDismissed = false;
    }
    if (oldWidget.trip.status != widget.trip.status) {
      _syncLocationTimer();
      ref.invalidate(tripRiderDetailsProvider(widget.trip.tripId));
    }
  }

  void _syncLocationTimer() {
    _locationTimer?.cancel();
    if (widget.trip.status == TripStatus.inProgress) {
      _locationTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        unawaited(_pushLocationSample());
      });
      unawaited(_pushLocationSample());
    }
  }

  Future<void> _pushLocationSample() async {
    try {
      final p = await Geolocator.getCurrentPosition();
      _lastPosition = p;
      final svc = ref.read(tripServiceProvider);
      await svc.updateDriverLocation(
        widget.trip.tripId,
        p.latitude,
        p.longitude,
        p.speed,
      );
      await svc.flushPendingLocations();
      if (mounted) setState(() {});
    } catch (e) {
      showAppToast('Location update queued: $e');
    }
  }

  Future<void> _openNav(LatLng target) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      showAppToast('Could not open Maps');
    }
  }

  Future<void> _endTripFlow() async {
    final fareCtrl = TextEditingController(
      text: t.estimatedFare?.toStringAsFixed(2) ?? '',
    );
    try {
      final dist = _lastPosition != null
          ? ref.read(tripServiceProvider).distanceMetersBetween(
                LocationPoint(
                  latitude: t.pickupLat ?? _pickup.latitude,
                  longitude: t.pickupLng ?? _pickup.longitude,
                ),
                LocationPoint(
                  latitude: _lastPosition!.latitude,
                  longitude: _lastPosition!.longitude,
                ),
              )
          : null;

      final ok = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('End trip'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: fareCtrl,
                decoration: const InputDecoration(
                  labelText: 'Final fare (R)',
                  border: OutlineInputBorder(),
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
              ),
              if (dist != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Approx. distance: ${(dist / 1000).toStringAsFixed(1)} km',
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Complete'),
            ),
          ],
        ),
      );
      if (ok != true || !mounted) return;

      final fare = double.tryParse(fareCtrl.text.trim());
      await ref.read(tripServiceProvider).endTrip(
            t.tripId,
            finalFare: fare,
            finalDistance: dist,
          );
      // Realtime keeps this COMPLETED trip mounted until rated; open ratings.
      if (!mounted) return;
      await _ratingDialog();
    } catch (e) {
      if (mounted) showAppToast('$e', long: true);
    } finally {
      fareCtrl.dispose();
    }
  }

  /// Collect rating in the dialog only — submit AFTER the route is closed.
  /// Submitting while the dialog is open lets Realtime tear down this screen
  /// underneath the overlay and trips Flutter's `_dependents.isEmpty` assert.
  Future<void> _ratingDialog() async {
    if (!mounted) return;
    final tripId = t.tripId;
    final stars = ValueNotifier<int>(5);
    final comment = TextEditingController();
    ({int stars, String? comment})? result;
    try {
      result = await showDialog<({int stars, String? comment})>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Rate rider'),
          content: ValueListenableBuilder<int>(
            valueListenable: stars,
            builder: (context, value, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final idx = i + 1;
                    return IconButton(
                      onPressed: () => stars.value = idx,
                      icon: Icon(
                        idx <= value ? Icons.star : Icons.star_border,
                        color: Colors.amber,
                      ),
                    );
                  }),
                ),
                TextField(
                  controller: comment,
                  decoration: const InputDecoration(
                    labelText: 'Comment (optional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Skip'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx, (
                  stars: stars.value,
                  comment: comment.text.trim().isEmpty
                      ? null
                      : comment.text.trim(),
                ));
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      );
    } finally {
      // Defer dispose until after the dialog route finishes tearing down
      // its ValueListenableBuilder dependents.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        stars.dispose();
        comment.dispose();
      });
    }

    if (result == null || !mounted) return;

    try {
      await ref.read(tripServiceProvider).submitDriverRating(
            tripId,
            stars: result.stars,
            comment: result.comment,
          );
      if (mounted) showAppToast('Thanks for your feedback');
    } catch (e) {
      if (mounted) showAppToast('$e', long: true);
    }
  }

  Future<void> _cancelTripFlow() async {
    final reasonController = TextEditingController();
    try {
      final reason = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Cancel trip?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Cancelling before pickup may take you offline.'),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason (required)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                textInputAction: TextInputAction.done,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('No'),
            ),
            FilledButton(
              onPressed: () {
                final reason = reasonController.text.trim();
                if (reason.isEmpty) return;
                Navigator.pop(ctx, reason);
              },
              child: const Text('Cancel trip'),
            ),
          ],
        ),
      );

      if (reason == null || !mounted) return;

      try {
        await ref
            .read(tripServiceProvider)
            .cancelEnRoute(t.tripId, reason: reason);
        await ref
            .read(supabaseServiceProvider)
            .updateProfile({'online_status': 'OFFLINE'});
        showAppToast('Trip cancelled — you are offline.');
      } catch (e) {
        showAppToast('$e', long: true);
      }
    } finally {
      reasonController.dispose();
    }
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    // Do not use ref here — Riverpod forbids provider reads after dispose.
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final live = _lastPosition;
    final driverLatLng =
        live != null ? LatLng(live.latitude, live.longitude) : _pickup;
    final awaitingRating =
        t.status == TripStatus.completed && t.driverRating == null;

    return Scaffold(
      appBar: AppBar(title: Text('Trip · ${tripStatusToApi(t.status)}')),
      body: Column(
        children: [
          if (t.shouldShowDestinationBanner && !_destinationBannerDismissed)
            MaterialBanner(
              content: const Text(
                'Rider updated the destination. Check the map.',
              ),
              actions: [
                TextButton(
                  onPressed: () =>
                      setState(() => _destinationBannerDismissed = true),
                  child: const Text('OK'),
                ),
              ],
            ),
          Expanded(
            child: GoogleMap(
              initialCameraPosition:
                  CameraPosition(target: driverLatLng, zoom: 14),
              markers: {
                Marker(markerId: const MarkerId('pickup'), position: _pickup),
                Marker(
                  markerId: const MarkerId('drop'),
                  position: _dropoff,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueAzure,
                  ),
                ),
                Marker(
                  markerId: const MarkerId('me'),
                  position: driverLatLng,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueGreen,
                  ),
                ),
              },
              polylines: {
                Polyline(
                  polylineId: const PolylineId('line'),
                  color: Colors.blue,
                  width: 4,
                  points: [_pickup, _dropoff],
                ),
              },
              myLocationEnabled: true,
              onMapCreated: (c) {
                ref.read(tripMapControllerProvider.notifier).state = c;
              },
            ),
          ),
          Padding(
            padding: AppSpacing.screenPadding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TripRiderCard(tripId: t.tripId),
                const SizedBox(height: 8),
                Text(
                  'Payment: ${t.paymentMethodLabel}',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                if (t.estimatedDurationSec != null)
                  Text(
                    'ETA hint: ~${(t.estimatedDurationSec! / 60).ceil()} min',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                const SizedBox(height: 8),
                if (awaitingRating) ...[
                  Text(
                    'Trip completed. Please rate the rider.',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: _ratingDialog,
                    child: const Text('Rate rider'),
                  ),
                ] else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (t.status == TripStatus.enRoutePickup) ...[
                        OutlinedButton.icon(
                          onPressed: () => _openNav(_pickup),
                          icon: const Icon(Icons.navigation),
                          label: const Text('Nav to pickup'),
                        ),
                        FilledButton(
                          onPressed: () async {
                            try {
                              await ref
                                  .read(tripServiceProvider)
                                  .arrivedAtPickup(t.tripId);
                            } catch (e) {
                              showAppToast('$e');
                            }
                          },
                          child: const Text('Arrived at pickup'),
                        ),
                      ],
                      if (t.status == TripStatus.arrivedPickup)
                        FilledButton(
                          onPressed: () async {
                            try {
                              await ref
                                  .read(tripServiceProvider)
                                  .startTrip(t.tripId);
                            } catch (e) {
                              showAppToast('$e');
                            }
                          },
                          child: const Text('Start trip'),
                        ),
                      if (t.status == TripStatus.inProgress) ...[
                        OutlinedButton.icon(
                          onPressed: () => _openNav(_dropoff),
                          icon: const Icon(Icons.navigation),
                          label: const Text('Nav to drop-off'),
                        ),
                        FilledButton(
                          onPressed: _endTripFlow,
                          child: const Text('End trip'),
                        ),
                      ],
                      if (t.status == TripStatus.enRoutePickup ||
                          t.status == TripStatus.arrivedPickup)
                        TextButton(
                          onPressed: _cancelTripFlow,
                          child: const Text('Cancel trip'),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
