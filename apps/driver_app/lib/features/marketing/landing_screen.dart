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
    return Scaffold(
      body: Stack(
        children: [
          const _Background(),
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
                          color: Colors.white.withOpacity(0.10),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.12),
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
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Taxi Assist Driver',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Safer trips. Faster payouts.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white70,
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
                          color: Colors.white.withOpacity(0.08),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.12),
                          ),
                        ),
                        child: const Text(
                          'Driver app',
                          style: TextStyle(fontSize: 12, color: Colors.white70),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 26),
                  const Text(
                    'Go online with confidence.',
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      height: 1.08,
                      letterSpacing: -1.0,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'One flow for onboarding, documents, vehicles, and trips — built to keep you moving.',
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.35,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _Pill('Faster verification'),
                      _Pill('Live trip updates'),
                      _Pill('Weekly payouts'),
                      _Pill('Support in-app'),
                    ],
                  ),
                  const Spacer(),
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton(
                          onPressed: onCreateAccount,
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text('Create account'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton(
                          onPressed: onSignIn,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(
                              color: Colors.white.withOpacity(0.18),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text('Sign in'),
                        ),
                      ),
                      const SizedBox(height: 10),
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
  const _Pill(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: Colors.white.withOpacity(0.08),
        border: Border.all(color: Colors.white.withOpacity(0.14)),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, color: Colors.white70),
      ),
    );
  }
}

class _Background extends StatelessWidget {
  const _Background();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Unsplash photo (safe fallback below if it fails to load).
        Image.network(
          'https://images.unsplash.com/photo-1520975958225-57b5d9c1d4b3?auto=format&fit=crop&w=1600&q=80',
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
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0x99000000),
                Color(0xCC000000),
                Color(0xFF000000),
              ],
            ),
          ),
        ),
        // Soft color glows.
        Align(
          alignment: const Alignment(-1.2, -1.1),
          child: Container(
            width: 320,
            height: 320,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0x44A855F7),
            ),
          ),
        ),
        Align(
          alignment: const Alignment(1.2, 1.2),
          child: Container(
            width: 320,
            height: 320,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0x4444D3FF),
            ),
          ),
        ),
        const BackdropFilter(
          filter: ColorFilter.mode(Colors.transparent, BlendMode.dst),
          child: SizedBox.shrink(),
        ),
      ],
    );
  }
}

