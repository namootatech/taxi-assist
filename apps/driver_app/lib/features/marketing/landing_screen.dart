import 'package:flutter/material.dart';

import '../../core/constants/app_spacing.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({
    super.key,
    required this.onSignIn,
    required this.onCreateAccount,
  });

  final VoidCallback onSignIn;
  final VoidCallback onCreateAccount;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          _Background(
            primary: scheme.primary,
            secondary: scheme.secondary,
            isDark: isDark,
          ),
          SafeArea(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        height: 44,
                        width: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          color: scheme.primary.withOpacity(0.14),
                          border: Border.all(
                            color: scheme.primary.withOpacity(0.22),
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            'TA',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Taxi Assist Driver',
                              style: textTheme.titleSmall),
                          const SizedBox(height: 2),
                          Text(
                            'Drive with Trip.',
                            style: textTheme.bodySmall?.copyWith(
                              color: (isDark ? Colors.white70 : Colors.black54),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: (isDark
                              ? Colors.white.withOpacity(0.06)
                              : Colors.black.withOpacity(0.05)),
                          border: Border.all(
                            color: (isDark
                                ? Colors.white.withOpacity(0.12)
                                : Colors.black.withOpacity(0.10)),
                          ),
                        ),
                        child: const Text(
                          'Driver',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 26),
                  Text(
                    'Go online.\nGet trips.\nGet paid.',
                    style: textTheme.displayLarge?.copyWith(
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Get verified, add your vehicle, and keep everything current. When you’re ready, go online and start earning.',
                    style: textTheme.headlineSmall?.copyWith(
                      color: scheme.onSurface.withOpacity(isDark ? 0.78 : 0.72),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _Pill('Clear setup steps', isDark: isDark),
                      _Pill('Document reminders', isDark: isDark),
                      _Pill('Trip requests in one place', isDark: isDark),
                      _Pill('Earnings you can track', isDark: isDark),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      color: (isDark
                          ? Colors.white.withOpacity(0.06)
                          : Colors.white.withOpacity(0.72)),
                      border: Border.all(
                        color: (isDark
                            ? Colors.white.withOpacity(0.12)
                            : Colors.black.withOpacity(0.08)),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Before you can drive',
                          style: textTheme.labelLarge?.copyWith(
                            color: scheme.onSurface.withOpacity(0.92),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'You’ll upload your documents and vehicle details once, then we review them. You’ll get a clear status and what to fix if anything is missing.',
                          style: textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurface
                                .withOpacity(isDark ? 0.74 : 0.68),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: FilledButton(
                          onPressed: onCreateAccount,
                          style: FilledButton.styleFrom(
                            backgroundColor: scheme.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                          child: const Text('Start driving'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: OutlinedButton(
                          onPressed: onSignIn,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: scheme.onSurface,
                            side: BorderSide(
                              color: (isDark
                                  ? Colors.white.withOpacity(0.20)
                                  : Colors.black.withOpacity(0.16)),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                          child: const Text('Sign in'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'By continuing, you agree to the Trip driver terms.',
                        style: textTheme.bodySmall?.copyWith(
                          color: scheme.onSurface
                              .withOpacity(isDark ? 0.62 : 0.58),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                    ],
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

class _Pill extends StatelessWidget {
  const _Pill(this.text, {required this.isDark});

  final String text;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: isDark
            ? Colors.white.withOpacity(0.08)
            : Colors.black.withOpacity(0.05),
        border: Border.all(
            color: isDark
                ? Colors.white.withOpacity(0.14)
                : Colors.black.withOpacity(0.10)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: Theme.of(context)
              .colorScheme
              .onSurface
              .withOpacity(isDark ? 0.78 : 0.70),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _Background extends StatelessWidget {
  const _Background({
    required this.primary,
    required this.secondary,
    required this.isDark,
  });

  final Color primary;
  final Color secondary;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Pexels photo (safe fallback below if it fails to load).
        Image.network(
          'https://images.pexels.com/photos/31410721/pexels-photo-31410721.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600',
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) {
            return const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF0B1220),
                    Color(0xFF111827),
                    Color(0xFF0A0A0A),
                  ],
                ),
              ),
            );
          },
        ),
        // Darken for text legibility.
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isDark
                  ? const [
                      Color(0x99000000),
                      Color(0xCC000000),
                      Color(0xFF000000),
                    ]
                  : [
                      const Color(0x88FFFAF4),
                      const Color(0xB3FFFAF4),
                      const Color(0xFFFFFAF4),
                    ],
            ),
          ),
        ),
        // Brand wash so the hero feels like Trip (red/navy).
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(-0.6, -0.9),
              radius: 1.2,
              colors: [
                primary.withOpacity(isDark ? 0.16 : 0.10),
                Colors.transparent,
              ],
            ),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0.9, -0.7),
              radius: 1.3,
              colors: [
                secondary.withOpacity(isDark ? 0.18 : 0.08),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }
}
