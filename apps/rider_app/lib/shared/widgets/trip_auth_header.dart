import 'package:flutter/material.dart';

/// Shared Trip brand header for rider auth screens.
class TripAuthHeader extends StatelessWidget {
  const TripAuthHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 48,
          width: 48,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: scheme.primary.withOpacity(0.14),
            border: Border.all(color: scheme.primary.withOpacity(0.22)),
          ),
          child: Center(
            child: Text(
              'TA',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: scheme.primary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(title, style: textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: textTheme.bodyMedium?.copyWith(
            color: scheme.onSurface.withOpacity(isDark ? 0.72 : 0.65),
            height: 1.35,
          ),
        ),
        const SizedBox(height: 28),
      ],
    );
  }
}
