import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/models/rider_profile.dart';
import '../../shared/providers/app_providers.dart';
import 'document_upload_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(currentRiderProvider);

    return profileAsync.when(
      data: (profile) {
        if (profile == null) {
          return const Center(child: Text('Not signed in'));
        }
        return ListView(
          padding: AppSpacing.screenPadding,
          children: [
            ListTile(
              title: Text(profile.fullName ?? 'Rider'),
              subtitle: Text(profile.email ?? ''),
              leading: const CircleAvatar(child: Icon(Icons.person)),
            ),
            ListTile(
              title: const Text('Status'),
              trailing: Chip(label: Text(_statusLabel(profile.status))),
            ),
            ListTile(
              title: const Text('Phone'),
              subtitle: Text(profile.cellphone ?? '—'),
            ),
            const Divider(),
            ListTile(
              title: const Text('Verification documents'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const DocumentUploadScreen(),
                ),
              ),
            ),
            ListTile(
              title: const Text('Sign out'),
              leading: const Icon(Icons.logout),
              onTap: () async {
                await ref.read(supabaseServiceProvider).signOut();
                ref.invalidate(currentRiderProvider);
              },
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
    );
  }

  String _statusLabel(RiderProfileStatus status) {
    return switch (status) {
      RiderProfileStatus.approved => 'APPROVED',
      RiderProfileStatus.rejected => 'REJECTED',
      RiderProfileStatus.suspended => 'SUSPENDED',
      RiderProfileStatus.deactivated => 'DEACTIVATED',
      RiderProfileStatus.pending => 'PENDING',
    };
  }
}
