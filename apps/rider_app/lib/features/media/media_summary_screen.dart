import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/providers/app_providers.dart';

final adViewsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(supabaseServiceProvider).fetchAdViews();
});

class MediaSummaryScreen extends ConsumerWidget {
  const MediaSummaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewsAsync = ref.watch(adViewsProvider);
    final walletAsync = ref.watch(riderWalletProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Trip Media')),
      body: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          walletAsync.when(
            data: (wallet) {
              final balance = wallet?['balance'];
              return Card(
                child: ListTile(
                  title: const Text('Ad credits in wallet'),
                  subtitle: const Text('Earned from completed ad views'),
                  trailing: Text(
                    'R${balance is num ? balance.toStringAsFixed(2) : '0.00'}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              );
            },
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),
          Text('Your ad views', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          viewsAsync.when(
            data: (views) {
              if (views.isEmpty) {
                return const Text(
                  'No ad views yet. Watch ads during trips to earn credit.',
                );
              }
              return Column(
                children: views.map((v) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${v['state']}'),
                    subtitle: Text('${v['created_at']}'),
                    trailing:
                        v['rating'] != null ? Text('★ ${v['rating']}') : null,
                  );
                }).toList(),
              );
            },
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('$e'),
          ),
        ],
      ),
    );
  }
}
