import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/models/driver_enums.dart';
import '../../shared/providers/app_providers.dart';
import 'earnings_providers.dart';

/// PRD §5.6: summaries, trip list, payout stub.
class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  static String _money(double v) =>
      NumberFormat.currency(symbol: 'R', decimalDigits: 2).format(v);

  static String _date(DateTime? d) {
    if (d == null) return '—';
    return DateFormat.yMMMd().add_jm().format(d.toLocal());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentDriverProvider).valueOrNull;
    final scheme = Theme.of(context).colorScheme;
    final earnings = ref.watch(earningsSummaryProvider);
    final payouts = ref.watch(payoutsListProvider);

    final suspended = profile?.status == DriverProfileStatus.suspended ||
        profile?.status == DriverProfileStatus.deactivated;

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: ListView(
        padding: AppSpacing.screenPadding.copyWith(bottom: 24),
        children: [
          if (suspended)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                color: scheme.errorContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    'Account restricted. Historical earnings are shown for your records.',
                    style: TextStyle(color: scheme.onErrorContainer),
                  ),
                ),
              ),
            ),
          earnings.when(
            data: (s) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _SummaryCard(
                        label: 'Today',
                        value: _money(s.todayTotal),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SummaryCard(
                        label: 'This week',
                        value: _money(s.weekTotal),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _SummaryCard(
                  label: 'This month (completed trips)',
                  value: _money(s.monthTotal),
                ),
                const SizedBox(height: 20),
                Text('Completed trips', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (s.trips.isEmpty)
                  const Text('No completed trips yet.')
                else
                  ...s.trips.map(
                    (t) => Card(
                      child: ListTile(
                        title: Text(t.riderDisplayName ?? 'Trip'),
                        subtitle: Text(_date(t.completedAt)),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              t.finalFare != null ? _money(t.finalFare!) : '—',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            Text(
                              t.riderRating != null
                                  ? 'Rider rating: ${t.riderRating}★'
                                  : 'Rider rating: —',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            loading: () => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Text('$e'),
          ),
          const SizedBox(height: 24),
          Text('Payout history', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          payouts.when(
            data: (list) {
              if (list.isEmpty) {
                return Text(
                  'No payouts recorded yet. When back-office processes a payout, it will appear here.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                );
              }
              return Column(
                children: list.map((row) {
                  final amt = row['amount'];
                  final st = '${row['status'] ?? ''}';
                  final created = row['created_at'];
                  DateTime? dt;
                  if (created != null) {
                    dt = DateTime.tryParse('$created');
                  }
                  final double amount = amt is num ? amt.toDouble() : 0;
                  return Card(
                    child: ListTile(
                      title: Text(_money(amount)),
                      subtitle: Text(dt != null ? _date(dt) : ''),
                      trailing: Text(st),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('Payouts: $e'),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
            ),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}
