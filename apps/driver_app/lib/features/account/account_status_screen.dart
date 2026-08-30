import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/models/driver_enums.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/providers/app_providers.dart';

class AccountStatusScreen extends ConsumerWidget {
  const AccountStatusScreen({super.key, required this.profile});

  final DriverProfile profile;

  String get _title => switch (profile.status) {
        DriverProfileStatus.rejected => 'Application not approved',
        DriverProfileStatus.suspended => 'Account suspended',
        DriverProfileStatus.deactivated => 'Account deactivated',
        _ => 'Account status',
      };

  String get _body => switch (profile.status) {
        DriverProfileStatus.rejected =>
          'Your driver application was not approved. Review the reason below and contact Trip support if you need help.',
        DriverProfileStatus.suspended =>
          'Your account is suspended. You cannot drive until this is resolved. Contact support.',
        DriverProfileStatus.deactivated =>
          'This account has been deactivated. Sign in with a different account or contact support.',
        _ => 'Please contact support.',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reason = profile.rejectionReason?.trim();
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(_body, style: Theme.of(context).textTheme.bodyLarge),
            if (profile.status == DriverProfileStatus.rejected &&
                reason != null &&
                reason.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Reason: $reason',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
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
