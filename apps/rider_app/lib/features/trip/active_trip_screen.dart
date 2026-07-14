import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/rider_map.dart';
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
  Map<String, dynamic>? _pendingAd;

  @override
  void initState() {
    super.initState();
    _loadDriver();
    _maybeShowAd();
  }

  @override
  void didUpdateWidget(covariant ActiveTripScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trip.status != widget.trip.status) {
      _maybeShowAd();
    }
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
    try {
      final ads = await ref
          .read(supabaseServiceProvider)
          .getNextAdsForTrip(widget.trip.tripId);
      final paid = ads.cast<Map<String, dynamic>?>().firstWhere(
            (a) => a?['campaign_id'] != null,
            orElse: () => null,
          );
      if (!mounted) return;
      if (paid == null) {
        AppLog.w('ui.activeTrip', 'no_campaign_ad');
        return;
      }
      setState(() => _pendingAd = paid);
      _adShown = true;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => AdPlaybackScreen(
            tripId: widget.trip.tripId,
            campaignId: '${paid['campaign_id']}',
            videoUrl: paid['video_path'] as String?,
            advertiser: paid['advertiser'] as String?,
          ),
        ),
      );
    } catch (e, st) {
      AppLog.e('ui.activeTrip', 'ad_failed', error: e, stackTrace: st);
    }
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
            TextButton(
                onPressed: () => Navigator.pop(ctx), child: const Text('Keep')),
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
    final driverLoc = locAsync.valueOrNull;
    final pickup = (trip.pickupLat != null && trip.pickupLng != null)
        ? LatLng(trip.pickupLat!, trip.pickupLng!)
        : null;
    final dropoff = (trip.dropoffLat != null && trip.dropoffLng != null)
        ? LatLng(trip.dropoffLat!, trip.dropoffLng!)
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TripStatusBanner(status: trip.status),
        Expanded(
          child: RiderMap(
            pickup: pickup,
            dropoff: dropoff,
            driver: driverLoc == null
                ? null
                : LatLng(driverLoc.latitude, driverLoc.longitude),
          ),
        ),
        Padding(
          padding: AppSpacing.screenPadding,
          child: Column(
            children: [
              Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(_driver?['full_name'] as String? ?? 'Driver'),
                  subtitle: Text(
                    'Pay · ${trip.paymentMethod ?? 'CASH'}'
                    '${trip.estimatedFare != null ? ' · ~R${trip.estimatedFare!.toStringAsFixed(0)}' : ''}',
                  ),
                  trailing: IconButton(
                    onPressed: _callDriver,
                    icon: const Icon(Icons.phone),
                  ),
                ),
              ),
              if (_pendingAd == null && trip.status == TripStatus.inProgress)
                TextButton(
                  onPressed: () {
                    _adShown = false;
                    _maybeShowAd();
                  },
                  child: const Text('Watch Taxi Assist Media'),
                ),
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
      ],
    );
  }
}

/// Thin hub when opened from the drawer without an embedded Scaffold.
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
