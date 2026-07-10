import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/providers/app_providers.dart';

final adViewsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(supabaseServiceProvider).fetchAdViews();
});

class MediaSummaryScreen extends ConsumerWidget {
  const MediaSummaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewsAsync = ref.watch(adViewsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Taxi Assist Media')),
      body: viewsAsync.when(
        data: (views) {
          if (views.isEmpty) {
            return const Center(
              child: Text('No ad views yet. Watch ads during trips to earn credit.'),
            );
          }
          return ListView.separated(
            padding: AppSpacing.screenPadding,
            itemCount: views.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, i) {
              final v = views[i];
              return ListTile(
                title: Text('${v['state']}'),
                subtitle: Text('${v['created_at']}'),
                trailing: v['rating'] != null ? Text('★ ${v['rating']}') : null,
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
