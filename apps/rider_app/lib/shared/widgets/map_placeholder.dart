import 'package:flutter/material.dart';

/// Map widget placeholder when Google Maps API key is not configured.
/// Replace with [GoogleMap] when native keys are set.
class MapPlaceholder extends StatelessWidget {
  const MapPlaceholder({
    super.key,
    this.pickupLabel,
    this.dropoffLabel,
    this.height = 220,
  });

  final String? pickupLabel;
  final String? dropoffLabel;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Map showing pickup and destination',
      child: Container(
        height: height,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.3),
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: Icon(
                Icons.map_outlined,
                size: 48,
                color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
              ),
            ),
            if (pickupLabel != null)
              const Positioned(
                left: 12,
                top: 12,
                child: _PinChip(label: 'Pickup', icon: Icons.trip_origin),
              ),
            if (dropoffLabel != null)
              const Positioned(
                right: 12,
                bottom: 12,
                child: _PinChip(label: 'Drop-off', icon: Icons.place),
              ),
          ],
        ),
      ),
    );
  }
}

class _PinChip extends StatelessWidget {
  const _PinChip({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      backgroundColor: Colors.white.withOpacity(0.92),
    );
  }
}
