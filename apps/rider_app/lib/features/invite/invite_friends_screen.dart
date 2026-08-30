import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/constants/app_spacing.dart';

class InviteFriendsScreen extends StatelessWidget {
  const InviteFriendsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const code = 'TAXI-RIDER';
    return Scaffold(
      appBar: AppBar(title: const Text('Invite friends')),
      body: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Share Trip with friends',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                title: const Text('Your referral code'),
                subtitle: Text(code, style: Theme.of(context).textTheme.titleLarge),
                trailing: IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Code copied')),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Referral rewards and deep links will be enabled in a future release.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
