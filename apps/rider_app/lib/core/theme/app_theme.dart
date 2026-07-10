import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_spacing.dart';

/// Rider design tokens from design-system/taxi-assist-rider/MASTER.md
abstract final class AppTheme {
  static const primaryBlue = Color(0xFF2563EB);
  static const secondaryBlue = Color(0xFF3B82F6);
  static const ctaOrange = Color(0xFFF97316);
  static const backgroundLight = Color(0xFFF8FAFC);
  static const textSlate = Color(0xFF1E293B);
  static const portalBackground = Color(0xFF0F172A);
  static const portalSurface = Color(0xFF1E293B);

  static TextTheme _textTheme(Brightness brightness) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark(useMaterial3: true).textTheme
        : ThemeData.light(useMaterial3: true).textTheme;
    return GoogleFonts.sourceSans3TextTheme(base).copyWith(
      displayLarge: GoogleFonts.lexend(textStyle: base.displayLarge),
      displayMedium: GoogleFonts.lexend(textStyle: base.displayMedium),
      displaySmall: GoogleFonts.lexend(textStyle: base.displaySmall),
      headlineLarge: GoogleFonts.lexend(textStyle: base.headlineLarge),
      headlineMedium: GoogleFonts.lexend(textStyle: base.headlineMedium),
      headlineSmall: GoogleFonts.lexend(textStyle: base.headlineSmall),
      titleLarge: GoogleFonts.lexend(textStyle: base.titleLarge),
      titleMedium: GoogleFonts.lexend(textStyle: base.titleMedium),
      titleSmall: GoogleFonts.lexend(textStyle: base.titleSmall),
    );
  }

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryBlue,
      brightness: Brightness.light,
      surface: backgroundLight,
    ).copyWith(
      primary: primaryBlue,
      secondary: secondaryBlue,
      tertiary: ctaOrange,
      onSurface: textSlate,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      textTheme: _textTheme(Brightness.light),
      scaffoldBackgroundColor: backgroundLight,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: backgroundLight,
        foregroundColor: textSlate,
        elevation: 0,
        titleTextStyle: GoogleFonts.lexend(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: textSlate,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ctaOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, AppSpacing.minTapTarget),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        filled: true,
        fillColor: Colors.white,
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.08),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryBlue,
      brightness: Brightness.dark,
      surface: portalSurface,
    ).copyWith(
      primary: secondaryBlue,
      secondary: primaryBlue,
      tertiary: ctaOrange,
      surface: portalSurface,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      textTheme: _textTheme(Brightness.dark),
      scaffoldBackgroundColor: portalBackground,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: portalBackground,
        elevation: 0,
        titleTextStyle: GoogleFonts.lexend(
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ctaOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(AppSpacing.minTapTarget),
        ),
      ),
      cardTheme: CardTheme(
        color: portalSurface,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

/// Trip state banner colors.
abstract final class TripBannerColors {
  static const requested = Color(0xFF3B82F6);
  static const enRoute = Color(0xFF2563EB);
  static const arrived = Color(0xFF0EA5E9);
  static const inProgress = Color(0xFF22C55E);
  static const completed = Color(0xFF64748B);
  static const cancelled = Color(0xFFEF4444);
}
