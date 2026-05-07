import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../features/auth/auth_routing.dart';
import '../../shared/providers/app_providers.dart';

class OnboardingGateScreen extends ConsumerWidget {
  const OnboardingGateScreen({super.key, required this.destination});

  final AuthDestination destination;

      String get _title => switch (destination) {
        AuthDestination.completeRegistration => 'Complete registration',
        AuthDestination.onboardingLinkVehicle => 'Link your vehicle',
        _ => 'Onboarding',
      };

  String get _body => switch (destination) {
        AuthDestination.completeRegistration =>
          'We could not load your driver profile yet. Check your Supabase `profiles` '
          'table and RLS, then pull to refresh or sign in again.',
        AuthDestination.onboardingLinkVehicle =>
          'Your profile is approved. Next, link an approved vehicle (Car ID + number plate) '
          '— full flow arrives in a later build.',
        _ => '',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: RefreshIndicator(
        onRefresh: () => ref.read(currentDriverProvider.notifier).refresh(),
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text(_body, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => ref.read(currentDriverProvider.notifier).refresh(),
              child: const Text('Refresh status'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                await ref.read(supabaseServiceProvider).signOut();
                ref.invalidate(currentDriverProvider);
              },
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}
