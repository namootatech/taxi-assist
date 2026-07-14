import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import 'models/trip.dart';
import 'trip_providers.dart';
import 'widgets/trip_rider_card.dart';

/// Incoming REQUESTED trip (PRD §5.4).
class RideRequestScreen extends ConsumerStatefulWidget {
  const RideRequestScreen({super.key, required this.trip});

  final Trip trip;

  @override
  ConsumerState<RideRequestScreen> createState() => _RideRequestScreenState();
}

class _RideRequestScreenState extends ConsumerState<RideRequestScreen> {
  bool _busy = false;

  LatLng get _pickup => LatLng(
        widget.trip.pickupLat ?? -33.9249,
        widget.trip.pickupLng ?? 18.4241,
      );

  LatLng get _dropoff => LatLng(
        widget.trip.dropoffLat ?? _pickup.latitude,
        widget.trip.dropoffLng ?? _pickup.longitude,
      );

  Future<void> _openNav(LatLng target) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      showAppToast('Could not open Maps');
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    final est = trip.estimatedFare != null
        ? 'R ${trip.estimatedFare!.toStringAsFixed(2)}'
        : '—';
    final eta = trip.estimatedDurationSec != null
        ? '${(trip.estimatedDurationSec! / 60).ceil()} min est.'
        : '—';

    return Scaffold(
      appBar: AppBar(title: const Text('Ride request')),
      body: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          Text(
            'New request',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          TripRiderCard(tripId: trip.tripId),
          const SizedBox(height: 12),
          _row('Pickup', trip.pickupAddress ?? '—'),
          _row('Drop-off', trip.dropoffAddress ?? '—'),
          _row('Est. fare', est),
          _row('Est. time', eta),
          _row('Payment', trip.paymentMethodLabel),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: GoogleMap(
                initialCameraPosition: CameraPosition(target: _pickup, zoom: 13),
                markers: {
                  Marker(markerId: const MarkerId('p'), position: _pickup),
                  Marker(
                    markerId: const MarkerId('d'),
                    position: _dropoff,
                    icon: BitmapDescriptor.defaultMarkerWithHue(
                      BitmapDescriptor.hueAzure,
                    ),
                  ),
                },
                polylines: {
                  Polyline(
                    polylineId: const PolylineId('route'),
                    color: Colors.blueAccent,
                    width: 4,
                    points: [_pickup, _dropoff],
                  ),
                },
                liteModeEnabled: false,
                zoomControlsEnabled: false,
                myLocationButtonEnabled: false,
                mapToolbarEnabled: false,
              ),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => _openNav(_pickup),
            icon: const Icon(Icons.navigation),
            label: const Text('Navigate to pickup'),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() => _busy = true);
                          try {
                            await ref
                                .read(tripServiceProvider)
                                .declineTrip(trip.tripId);
                          } catch (e) {
                            showAppToast('$e', long: true);
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        },
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() => _busy = true);
                          try {
                            await ref
                                .read(tripServiceProvider)
                                .acceptTrip(trip.tripId);
                            showAppToast('Accepted — head to pickup');
                            ref.invalidate(
                              tripRiderDetailsProvider(trip.tripId),
                            );
                          } catch (e) {
                            showAppToast('$e', long: true);
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        },
                  child: const Text('Accept'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _row(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              k,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(child: Text(v)),
        ],
      ),
    );
  }
}
