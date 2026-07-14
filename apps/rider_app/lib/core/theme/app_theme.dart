import 'package:flutter/material.dart';

import '../constants/app_spacing.dart';

/// Trip brand theme — aligned with `apps/driver_app` / docs/design-system.
abstract final class AppTheme {
  static const brandRed = Color(0xFFFE0000);
  static const brandNavy = Color(0xFF244065);
  static const marketingBackground = Color(0xFFFFFAF4);
  static const portalBackground = Color(0xFF07111F);
  static const portalSurface = Color(0xFF0D1A2D);

  static TextTheme buildTextTheme({required Brightness brightness}) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark(useMaterial3: true).textTheme
        : ThemeData.light(useMaterial3: true).textTheme;

    TextStyle? s(
      TextStyle? style, {
      FontWeight? weight,
      double? letterSpacing,
      double? height,
    }) {
      if (style == null) return null;
      return style.copyWith(
        fontWeight: weight ?? style.fontWeight,
        letterSpacing: letterSpacing ?? style.letterSpacing,
        height: height ?? style.height,
      );
    }

    return base.copyWith(
      displayLarge:
          s(base.displayLarge, weight: FontWeight.w900, letterSpacing: -0.6, height: 1.02),
      displayMedium:
          s(base.displayMedium, weight: FontWeight.w900, letterSpacing: -0.5, height: 1.04),
      displaySmall:
          s(base.displaySmall, weight: FontWeight.w900, letterSpacing: -0.4, height: 1.06),
      headlineLarge:
          s(base.headlineLarge, weight: FontWeight.w800, letterSpacing: -0.35, height: 1.10),
      headlineMedium:
          s(base.headlineMedium, weight: FontWeight.w800, letterSpacing: -0.25, height: 1.12),
      headlineSmall:
          s(base.headlineSmall, weight: FontWeight.w800, letterSpacing: -0.15, height: 1.14),
      titleLarge: s(base.titleLarge, weight: FontWeight.w800, letterSpacing: -0.1),
      titleMedium: s(base.titleMedium, weight: FontWeight.w700),
      titleSmall: s(base.titleSmall, weight: FontWeight.w700, letterSpacing: 0.2),
      bodyLarge: s(base.bodyLarge, weight: FontWeight.w500, height: 1.35),
      bodyMedium: s(base.bodyMedium, weight: FontWeight.w500, height: 1.35),
      bodySmall: s(base.bodySmall, weight: FontWeight.w600, letterSpacing: 0.2),
      labelLarge: s(base.labelLarge, weight: FontWeight.w700, letterSpacing: 0.2),
      labelMedium: s(base.labelMedium, weight: FontWeight.w700, letterSpacing: 0.25),
      labelSmall: s(base.labelSmall, weight: FontWeight.w700, letterSpacing: 0.3),
    );
  }

  static ThemeData get light {
    const surface = Color(0xFFFFFFFF);

    final scheme = ColorScheme.fromSeed(
      seedColor: brandNavy,
      brightness: Brightness.light,
      surface: surface,
      error: brandRed,
    ).copyWith(
      primary: brandRed,
      secondary: brandNavy,
      surface: surface,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      textTheme: buildTextTheme(brightness: Brightness.light),
      visualDensity: VisualDensity.standard,
      scaffoldBackgroundColor: marketingBackground,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: marketingBackground,
        foregroundColor: scheme.onSurface,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: AppSpacing.minTapTarget + 8,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        indicatorColor: Color.alphaBlend(
          brandRed.withOpacity(0.14),
          marketingBackground,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: brandRed,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, AppSpacing.minTapTarget),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        filled: true,
        fillColor: Colors.white,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    );
  }

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: brandNavy,
      brightness: Brightness.dark,
      surface: portalBackground,
      error: brandRed,
    ).copyWith(
      primary: brandRed,
      secondary: brandNavy,
      primaryContainer: const Color(0xFF3A1A1A),
      secondaryContainer: const Color(0xFF12233B),
      surface: portalSurface,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      textTheme: buildTextTheme(brightness: Brightness.dark),
      visualDensity: VisualDensity.standard,
      scaffoldBackgroundColor: portalBackground,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: portalBackground,
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
          backgroundColor: brandRed,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, AppSpacing.minTapTarget),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        filled: true,
        fillColor: portalSurface,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: portalSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    );
  }
}

/// Trip state banner colors (semantic, not marketing palette).
abstract final class TripBannerColors {
  static const requested = Color(0xFF244065);
  static const enRoute = Color(0xFFFE0000);
  static const arrived = Color(0xFF0EA5E9);
  static const inProgress = Color(0xFF22C55E);
  static const completed = Color(0xFF64748B);
  static const cancelled = Color(0xFFEF4444);
}
