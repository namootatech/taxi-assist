import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/providers/app_providers.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(riderWalletProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: walletAsync.when(
        data: (wallet) {
          final balance = wallet?['balance'];
          return ListView(
            padding: AppSpacing.screenPadding,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Balance', style: Theme.of(context).textTheme.labelLarge),
                      const SizedBox(height: 8),
                      Text(
                        'R${balance is num ? balance.toStringAsFixed(2) : '0.00'}',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Earn credits by watching Taxi Assist Media ads during trips.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
