import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/constants/app_spacing.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/utils/app_log.dart';
import 'core/utils/safe_text.dart';
import 'features/auth/auth_routing.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/marketing/landing_screen.dart';
import 'shared/models/rider_profile.dart';
import 'shared/providers/app_providers.dart';
import 'shared/widgets/main_shell.dart';

class TaxiAssistRiderApp extends ConsumerWidget {
  const TaxiAssistRiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp(
      title: 'Trip Rider',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox.shrink(),
            Positioned(
              top: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.only(right: 10, top: 8),
                  child: Material(
                    color: Colors.transparent,
                    // No tooltip — MaterialApp.builder sits outside the
                    // navigator Overlay; Tooltip asserts Overlay and paints a
                    // full-screen ErrorWidget (the red sheet).
                    child: IconButton(
                      onPressed: () =>
                          ref.read(themeModeProvider.notifier).toggle(),
                      icon: const Icon(Icons.brightness_6),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
      home: const _AppHome(),
      debugShowCheckedModeBanner: false,
    );
  }
}

Widget _profileDestination(RiderProfile? profile) {
  final dest = resolveDestination(profile);
  AppLog.d('ui.appHome', 'destination', {
    'destination': dest.name,
    'hasProfile': profile != null,
    'status': profile?.status.name,
  });
  return switch (dest) {
    AuthDestination.login => const _SignedOutHome(),
    AuthDestination.mainShell ||
    AuthDestination.waitingApproval ||
    AuthDestination.pendingVerification ||
    AuthDestination.completeRegistration ||
    AuthDestination.documentUpload =>
      const MainShell(),
    AuthDestination.accountBlocked => const _AccountBlockedScreen(),
  };
}

class _AppHome extends ConsumerWidget {
  const _AppHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authProvider);

    return authAsync.when(
      data: (auth) {
        if (auth.session == null) return const _SignedOutHome();

        final profileAsync = ref.watch(currentRiderProvider);
        final cached = profileAsync.valueOrNull;
        if (cached != null) return _profileDestination(cached);

        return profileAsync.when(
          data: (profile) => _profileDestination(profile),
          loading: () => const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          ),
          error: (e, _) => Scaffold(
            body: Center(
              child: Padding(
                padding: AppSpacing.screenPadding,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(safeMessage(e), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => ref.invalidate(currentRiderProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(body: Center(child: Text(safeMessage(e)))),
    );
  }
}

class _SignedOutHome extends StatelessWidget {
  const _SignedOutHome();

  @override
  Widget build(BuildContext context) {
    return LandingScreen(
      onSignIn: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      ),
      onCreateAccount: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const RegisterScreen()),
      ),
    );
  }
}

class _AccountBlockedScreen extends StatelessWidget {
  const _AccountBlockedScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: const Center(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: Text(
            'Your account is not active. Contact support for help.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
