import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/widgets/map_placeholder.dart';
import '../../shared/widgets/trip_status_banner.dart';
import '../media/ad_playback_screen.dart';
import 'models/trip.dart';
import 'models/trip_status.dart';
import 'trip_service.dart';

class ActiveTripScreen extends ConsumerStatefulWidget {
  const ActiveTripScreen({super.key, required this.trip});

  final Trip trip;

  @override
  ConsumerState<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends ConsumerState<ActiveTripScreen> {
  Map<String, dynamic>? _driver;
  var _adShown = false;

  @override
  void initState() {
    super.initState();
    _loadDriver();
    _maybeShowAd();
  }

  Future<void> _loadDriver() async {
    final d = await ref
        .read(tripServiceProvider)
        .fetchDriverProfile(widget.trip.driverId);
    if (mounted) setState(() => _driver = d);
  }

  Future<void> _maybeShowAd() async {
    if (_adShown) return;
    if (widget.trip.status != TripStatus.inProgress) return;
    _adShown = true;
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdPlaybackScreen(tripId: widget.trip.tripId),
      ),
    );
  }

  Future<void> _callDriver() async {
    final phone = _driver?['cellphone'] as String?;
    if (phone == null || phone.isEmpty) {
      showAppToast('Driver phone not available');
      return;
    }
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _cancel() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final ctrl = TextEditingController();
        return AlertDialog(
          title: const Text('Cancel trip?'),
          content: TextField(
            controller: ctrl,
            decoration: const InputDecoration(labelText: 'Reason (optional)'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, ctrl.text),
              child: const Text('Cancel trip'),
            ),
          ],
        );
      },
    );
    if (reason == null) return;
    try {
      await ref.read(tripServiceProvider).cancelTrip(
            widget.trip.tripId,
            reason: reason,
          );
      showAppToast('Trip cancelled');
    } catch (e) {
      showAppToast('$e', long: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    final locAsync = ref.watch(driverLocationProvider(trip.tripId));

    return Scaffold(
      appBar: AppBar(title: const Text('Your trip')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TripStatusBanner(status: trip.status),
          Expanded(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: Column(
                children: [
                  MapPlaceholder(
                    height: 200,
                    pickupLabel: trip.pickupAddress,
                    dropoffLabel: trip.dropoffAddress,
                  ),
                  const SizedBox(height: 12),
                  locAsync.when(
                    data: (loc) => Text(
                      loc == null
                          ? 'Waiting for driver location…'
                          : 'Driver at ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)}',
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('Location error: $e'),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.person)),
                      title: Text(_driver?['full_name'] as String? ?? 'Driver'),
                      subtitle: Text(trip.paymentMethod ?? 'CASH'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            onPressed: _callDriver,
                            icon: const Icon(Icons.phone),
                            tooltip: 'Call driver',
                          ),
                          IconButton(
                            onPressed: () => showAppToast('Messaging coming soon'),
                            icon: const Icon(Icons.message_outlined),
                            tooltip: 'Message driver',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (trip.status == TripStatus.requested ||
                      trip.status == TripStatus.enRoutePickup ||
                      trip.status == TripStatus.arrivedPickup)
                    OutlinedButton(
                      onPressed: _cancel,
                      child: const Text('Cancel trip'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Drawer entry: shows active trip or empty state.
class ActiveTripHubScreen extends ConsumerWidget {
  const ActiveTripHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(currentTripProvider);
    return tripAsync.when(
      data: (trip) {
        if (trip == null) {
          return const Center(child: Text('No active trip'));
        }
        return ActiveTripScreen(trip: trip);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
    );
  }
}
