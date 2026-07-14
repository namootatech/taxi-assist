import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/utils/app_log.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/rider_map.dart';
import '../../shared/widgets/trip_status_banner.dart';
import '../media/ad_playback_screen.dart';
import 'models/trip.dart';
import 'models/trip_driver_details.dart';
import 'models/trip_status.dart';
import 'trip_service.dart';

class ActiveTripScreen extends ConsumerStatefulWidget {
  const ActiveTripScreen({super.key, required this.trip});

  final Trip trip;

  @override
  ConsumerState<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends ConsumerState<ActiveTripScreen> {
  TripDriverDetails? _driver;
  var _loadingDriver = false;
  Object? _driverError;
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
    if (oldWidget.trip.tripId != widget.trip.tripId ||
        oldWidget.trip.driverId != widget.trip.driverId ||
        oldWidget.trip.vehicleId != widget.trip.vehicleId ||
        oldWidget.trip.status != widget.trip.status) {
      _loadDriver();
    }
    if (oldWidget.trip.status != widget.trip.status) {
      _maybeShowAd();
    }
  }

  Future<void> _loadDriver() async {
    setState(() {
      _loadingDriver = true;
      _driverError = null;
    });
    try {
      final d = await ref
          .read(tripServiceProvider)
          .fetchTripDriver(widget.trip.tripId);
      if (mounted) setState(() => _driver = d);
    } catch (e, st) {
      AppLog.e('ui.activeTrip', 'driver_card_failed', error: e, stackTrace: st);
      if (mounted) setState(() => _driverError = e);
    } finally {
      if (mounted) setState(() => _loadingDriver = false);
    }
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
    final phone = _driver?.cellphone;
    if (phone == null || phone.isEmpty) {
      showAppToast(
        'Driver phone is available once they are en route to pick you up',
        long: true,
      );
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
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final paymentLine =
        'Pay · ${trip.paymentMethod ?? 'CASH'}'
        '${trip.estimatedFare != null ? ' · ~R${trip.estimatedFare!.toStringAsFixed(0)}' : ''}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TripStatusBanner(status: trip.status),
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              RiderMap(
                pickup: pickup,
                dropoff: dropoff,
                driver: driverLoc == null
                    ? null
                    : LatLng(driverLoc.latitude, driverLoc.longitude),
              ),
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Material(
                  elevation: 6,
                  borderRadius: BorderRadius.circular(18),
                  color: scheme.surface,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 8, 10),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _DriverCard(
                          loading: _loadingDriver && _driver == null,
                          error: _driverError,
                          driver: _driver,
                          hasDriverId: trip.driverId != null,
                          paymentLine: paymentLine,
                          onCall: _callDriver,
                          onRetry: _loadDriver,
                          scheme: scheme,
                          textTheme: textTheme,
                        ),
                        if (_pendingAd == null &&
                            trip.status == TripStatus.inProgress)
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
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _cancel,
                              child: const Text('Cancel trip'),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DriverCard extends StatelessWidget {
  const _DriverCard({
    required this.loading,
    required this.error,
    required this.driver,
    required this.hasDriverId,
    required this.paymentLine,
    required this.onCall,
    required this.onRetry,
    required this.scheme,
    required this.textTheme,
  });

  final bool loading;
  final Object? error;
  final TripDriverDetails? driver;
  final bool hasDriverId;
  final String paymentLine;
  final VoidCallback onCall;
  final VoidCallback onRetry;
  final ColorScheme scheme;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Row(
        children: [
          CircleAvatar(
            backgroundColor: scheme.primary.withOpacity(0.12),
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: scheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text('Loading driver details…', style: textTheme.bodyMedium),
        ],
      );
    }

    if (!hasDriverId) {
      return ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(
          backgroundColor: scheme.primary.withOpacity(0.12),
          child: Icon(Icons.search, color: scheme.primary),
        ),
        title: Text('Looking for a driver…', style: textTheme.titleMedium),
        subtitle: Text(paymentLine),
      );
    }

    if (driver == null) {
      return ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(
          backgroundColor: scheme.errorContainer,
          child: Icon(Icons.error_outline, color: scheme.error),
        ),
        title: const Text('Couldn’t load driver details'),
        subtitle: Text(error?.toString() ?? 'Tap retry'),
        trailing: IconButton(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
        ),
      );
    }

    final selfie = driver!.selfieUrl;
    final vehicleLine = driver!.vehicleLine;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: scheme.primary.withOpacity(0.12),
          backgroundImage: selfie != null ? NetworkImage(selfie) : null,
          onBackgroundImageError: selfie != null ? (_, __) {} : null,
          child: selfie == null
              ? Icon(Icons.person, color: scheme.primary, size: 28)
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                driver!.fullName,
                style: textTheme.titleMedium,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.star_rounded, size: 18, color: scheme.primary),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      driver!.ratingLabel,
                      style: textTheme.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (vehicleLine != null) ...[
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.directions_car_outlined,
                      size: 18,
                      color: scheme.onSurface.withOpacity(0.7),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        vehicleLine,
                        style: textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurface.withOpacity(0.85),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 6),
              if (driver!.canCall)
                Text(
                  driver!.cellphone!,
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                )
              else
                Text(
                  'Phone shown when driver is en route',
                  style: textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                paymentLine,
                style: textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: driver!.canCall ? 'Call driver' : 'Phone after en route',
          onPressed: onCall,
          icon: Icon(
            Icons.phone,
            color: driver!.canCall
                ? scheme.primary
                : scheme.onSurface.withOpacity(0.35),
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
        if (trip.status == TripStatus.completed) {
          return const Center(child: Text('Trip completed — rate on Home'));
        }
        return ActiveTripScreen(trip: trip);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
    );
  }
}
