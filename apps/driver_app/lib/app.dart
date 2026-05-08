import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'core/constants/app_spacing.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/utils/safe_text.dart';
import 'features/account/account_status_screen.dart';
import 'features/auth/auth_routing.dart';
import 'features/auth/login_screen.dart';
import 'features/marketing/landing_screen.dart';
import 'features/onboarding/onboarding_flow_screen.dart';
import 'features/onboarding/onboarding_gate_screen.dart';
import 'features/onboarding/waiting_approval_screen.dart';
import 'features/training/training_required_screen.dart';
import 'features/documents/document_compliance_scope.dart';
import 'shared/providers/app_providers.dart';
import 'shared/widgets/main_shell.dart';

class TaxiAssistDriverApp extends ConsumerWidget {
  const TaxiAssistDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp(
      title: 'Taxi Assist Driver',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      navigatorObservers: [SentryNavigatorObserver()],
      builder: (context, child) {
        final content = DocumentComplianceScope(
          child: child ?? const SizedBox.shrink(),
        );

        return Stack(
          children: [
            content,
            Positioned(
              top: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.only(right: 10, top: 8),
                  child: Material(
                    color: Colors.transparent,
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

class _AppHome extends ConsumerWidget {
  const _AppHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authProvider);

    return authAsync.when(
      data: (auth) {
        final session = auth.session;
        if (session == null) {
          return LandingScreen(
            onSignIn: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
              );
            },
            onCreateAccount: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const OnboardingGateScreen(
                    destination: AuthDestination.completeRegistration,
                  ),
                ),
              );
            },
          );
        }

        final profileAsync = ref.watch(currentDriverProvider);
        return profileAsync.when(
          data: (profile) {
            final dest = resolveDestination(profile);
            return switch (dest) {
              AuthDestination.mainShell => const MainShell(),
              AuthDestination.accountBlocked =>
                AccountStatusScreen(profile: profile!),
              AuthDestination.completeRegistration =>
                const OnboardingGateScreen(
                  destination: AuthDestination.completeRegistration,
                ),
              AuthDestination.onboardingWizard =>
                OnboardingFlowScreen(profile: profile!),
              AuthDestination.onboardingAwaitingReview =>
                const WaitingApprovalScreen(),
              AuthDestination.onboardingLinkVehicle =>
                const OnboardingGateScreen(
                  destination: AuthDestination.onboardingLinkVehicle,
                ),
              AuthDestination.trainingRequired =>
                const TrainingRequiredScreen(),
            };
          },
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
                    Text(
                      safeMessage(e),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => ref.invalidate(currentDriverProvider),
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
      error: (e, _) => Scaffold(
        body: Center(child: Text(safeMessage(e))),
      ),
    );
  }
}
