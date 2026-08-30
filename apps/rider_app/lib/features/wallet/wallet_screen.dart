import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/providers/app_providers.dart';

final walletTxProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(supabaseServiceProvider).fetchWalletTransactions();
});

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(riderWalletProvider);
    final txAsync = ref.watch(walletTxProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () {
              ref.invalidate(riderWalletProvider);
              ref.invalidate(walletTxProvider);
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
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
                      Text('Balance',
                          style: Theme.of(context).textTheme.labelLarge),
                      const SizedBox(height: 8),
                      Text(
                        'R${balance is num ? balance.toStringAsFixed(2) : '0.00'}',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Use Wallet at booking to pay with credits, or Wallet + cash for a hybrid trip.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Activity', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              txAsync.when(
                data: (rows) {
                  if (rows.isEmpty) {
                    return const Text(
                      'No credits yet. Watch Trip Media during trips to earn.',
                    );
                  }
                  return Column(
                    children: rows.map((tx) {
                      final dir = '${tx['direction']}';
                      final amount = tx['amount'];
                      final type = '${tx['type']}';
                      final credit = dir == 'CREDIT';
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          credit ? Icons.south_west : Icons.north_east,
                          color: credit ? Colors.green : Colors.orange,
                        ),
                        title: Text(type),
                        subtitle: Text('${tx['created_at'] ?? ''}'),
                        trailing: Text(
                          '${credit ? '+' : '-'}R${amount is num ? amount.toStringAsFixed(2) : amount}',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: credit ? Colors.green : null,
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('$e'),
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
