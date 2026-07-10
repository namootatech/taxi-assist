import 'package:flutter/material.dart';

import '../../core/constants/app_spacing.dart';

class TripPlaceholderScreen extends StatelessWidget {
  const TripPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.directions_car_outlined,
      title: 'Active trip',
      subtitle: 'Live driver tracking and trip status — Wave 3.',
    );
  }
}

class WalletPlaceholderScreen extends StatelessWidget {
  const WalletPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.account_balance_wallet_outlined,
      title: 'Wallet',
      subtitle: 'Rider wallet balance and top-up — Wave 3.',
    );
  }
}

class MediaPlaceholderScreen extends StatelessWidget {
  const MediaPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.play_circle_outline,
      title: 'Taxi Assist Media',
      subtitle: 'Ad credits and media summary — Wave 3.',
    );
  }
}

class ProfilePlaceholderScreen extends StatelessWidget {
  const ProfilePlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.person_outline,
      title: 'Profile',
      subtitle: 'Rider profile and verification — Wave 2.',
    );
  }
}

class PaymentsPlaceholderScreen extends StatelessWidget {
  const PaymentsPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.credit_card_outlined,
      title: 'Payment methods',
      subtitle: 'Saved cards and default payment — Wave 3.',
    );
  }
}

class EmergencyPlaceholderScreen extends StatelessWidget {
  const EmergencyPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.emergency_outlined,
      title: 'Emergency contacts',
      subtitle: 'Up to 5 trusted contacts — Wave 3.',
    );
  }
}

class InvitePlaceholderScreen extends StatelessWidget {
  const InvitePlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.card_giftcard_outlined,
      title: 'Invite friends',
      subtitle: 'Referral rewards — stub for pilot.',
    );
  }
}

class SupportPlaceholderScreen extends StatelessWidget {
  const SupportPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.support_agent_outlined,
      title: 'Support',
      subtitle: 'Tickets and FAQ — Wave 3.',
    );
  }
}

class TripHistoryPlaceholderScreen extends StatelessWidget {
  const TripHistoryPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _FeaturePlaceholder(
      icon: Icons.history,
      title: 'Trip history',
      subtitle: 'Past trips and receipts — Wave 3.',
    );
  }
}

class _FeaturePlaceholder extends StatelessWidget {
  const _FeaturePlaceholder({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 56),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
