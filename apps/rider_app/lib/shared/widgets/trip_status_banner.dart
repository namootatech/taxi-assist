import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../features/trip/models/trip_status.dart';

class TripStatusBanner extends StatelessWidget {
  const TripStatusBanner({super.key, required this.status});

  final TripStatus status;

  Color get _color => switch (status) {
        TripStatus.requested => TripBannerColors.requested,
        TripStatus.enRoutePickup => TripBannerColors.enRoute,
        TripStatus.arrivedPickup => TripBannerColors.arrived,
        TripStatus.inProgress => TripBannerColors.inProgress,
        TripStatus.completed => TripBannerColors.completed,
        TripStatus.cancelled => TripBannerColors.cancelled,
        TripStatus.noShow => TripBannerColors.cancelled,
        TripStatus.unknown => Colors.grey,
      };

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: tripStatusLabel(status),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        color: _color,
        child: Text(
          tripStatusLabel(status),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
