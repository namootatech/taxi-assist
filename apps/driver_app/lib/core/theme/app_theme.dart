import 'package:flutter/material.dart';

import '../constants/app_spacing.dart';

/// Dark-first theme: high contrast, large controls for night and in-vehicle use.
abstract final class AppTheme {
  static ThemeData get dark {
    const brandRed = Color(0xFFFE0000);
    const brandNavy = Color(0xFF244065);
    final scheme = ColorScheme.fromSeed(
      seedColor: brandNavy,
      brightness: Brightness.dark,
      surface: const Color(0xFF0F131A),
      error: brandRed,
    ).copyWith(
      primary: brandRed,
      secondary: brandNavy,
      primaryContainer: const Color(0xFF3A1A1A),
      secondaryContainer: const Color(0xFF1B314E),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      visualDensity: VisualDensity.standard,
      scaffoldBackgroundColor: scheme.surface,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: AppSpacing.minTapTarget + 8,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        indicatorColor: scheme.primaryContainer,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, AppSpacing.minTapTarget),
        ),
      ),
    );
  }
}
