import 'package:flutter/material.dart';

/// Touch-friendly spacing (48dp targets per design system).
abstract final class AppSpacing {
  static const double minTapTarget = 48;
  static const EdgeInsets screenPadding = EdgeInsets.symmetric(
    horizontal: 16,
    vertical: 12,
  );
}
