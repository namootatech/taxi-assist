import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../features/auth/auth_routing.dart';
import '../../shared/providers/app_providers.dart';

class OnboardingGateScreen extends ConsumerStatefulWidget {
  const OnboardingGateScreen({super.key, required this.destination});

  final AuthDestination destination;

  @override
  ConsumerState<OnboardingGateScreen> createState() => _OnboardingGateScreenState();
}

class _OnboardingGateScreenState extends ConsumerState<OnboardingGateScreen> {
  bool _isAutoLinking = false;
  String? _autoLinkMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAutoLinkVehicle());
  }

  Future<void> _maybeAutoLinkVehicle() async {
    if (widget.destination != AuthDestination.onboardingLinkVehicle) return;
    if (_isAutoLinking) return;
    setState(() {
      _isAutoLinking = true;
      _autoLinkMessage = 'Checking your vehicle details…';
    });

    try {
      final svc = ref.read(supabaseServiceProvider);
      final vehicle = await svc.fetchMyLinkedVehicle();
      final vehicleId = (vehicle?['vehicle_id'] ?? vehicle?['id']) as String?;
      if (vehicleId == null || vehicleId.isEmpty) {
        setState(() {
          _autoLinkMessage = 'No vehicle found yet. If you just submitted, try again in a moment.';
          _isAutoLinking = false;
        });
        return;
      }

      await svc.updateProfile({'current_vehicle_id': vehicleId});
      await ref.read(currentDriverProvider.notifier).refresh();
      setState(() {
        _autoLinkMessage = 'Vehicle linked. Loading your dashboard…';
        _isAutoLinking = false;
      });
    } catch (e) {
      setState(() {
        _autoLinkMessage = 'Couldn’t link your vehicle automatically. Pull to refresh or contact support.';
        _isAutoLinking = false;
      });
    }
  }

  String get _title => switch (widget.destination) {
        AuthDestination.completeRegistration => 'Finish setup',
        AuthDestination.onboardingLinkVehicle => 'Link your vehicle',
        _ => 'Onboarding',
      };

  String get _body => switch (widget.destination) {
        AuthDestination.completeRegistration =>
          'We couldn\'t load your driver profile yet. Pull to refresh, or sign out and '
          'sign in again. If this keeps happening, contact support.',
        AuthDestination.onboardingLinkVehicle =>
          'Your profile is approved. We’re finishing setup using the vehicle you already registered.',
        _ => '',
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: RefreshIndicator(
        onRefresh: () => ref.read(currentDriverProvider.notifier).refresh(),
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text(_body, style: Theme.of(context).textTheme.bodyLarge),
            if (widget.destination == AuthDestination.onboardingLinkVehicle) ...[
              const SizedBox(height: 12),
              Text(
                _autoLinkMessage ?? 'Pull to refresh to continue.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _isAutoLinking
                  ? null
                  : () async {
                      if (widget.destination == AuthDestination.onboardingLinkVehicle) {
                        await _maybeAutoLinkVehicle();
                      }
                      await ref.read(currentDriverProvider.notifier).refresh();
                    },
              child: const Text('Refresh status'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                await ref.read(supabaseServiceProvider).signOut();
                await ClerkAuth.of(context).signOut();
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
