import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/constants/app_spacing.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/utils/safe_text.dart';
import 'features/auth/auth_routing.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/auth/waiting_approval_screen.dart';
import 'features/profile/document_upload_screen.dart';
import 'shared/models/rider_profile.dart';
import 'shared/providers/app_providers.dart';
import 'shared/widgets/main_shell.dart';

class TaxiAssistRiderApp extends ConsumerWidget {
  const TaxiAssistRiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp(
      title: 'Taxi Assist Rider',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      home: const _AppHome(),
      debugShowCheckedModeBanner: false,
    );
  }
}

Widget _profileDestination(RiderProfile? profile) {
  final dest = resolveDestination(profile);
  return switch (dest) {
    AuthDestination.login => const _Landing(),
    AuthDestination.mainShell => const MainShell(),
    AuthDestination.waitingApproval ||
    AuthDestination.pendingVerification =>
      const WaitingApprovalScreen(),
    AuthDestination.completeRegistration ||
    AuthDestination.documentUpload =>
      const DocumentUploadScreen(),
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
        if (auth.session == null) return const _Landing();

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

class _Landing extends StatelessWidget {
  const _Landing();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(
                'Taxi Assist Rider',
                style: Theme.of(context).textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Book safe, affordable rides across South Africa.',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                ),
                child: const Text('Sign in'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const RegisterScreen(),
                  ),
                ),
                child: const Text('Create account'),
              ),
            ],
          ),
        ),
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
