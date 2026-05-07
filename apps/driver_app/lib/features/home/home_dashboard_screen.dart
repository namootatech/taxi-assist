import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/supabase_client.dart';
import '../../shared/models/driver_enums.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../support/support_screen.dart';
import 'go_online_notifier.dart';

/// PRD §5.3 + Prompt 4: dashboard, go online / offline, today stats, Realtime compliance.
class HomeDashboardScreen extends ConsumerStatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  ConsumerState<HomeDashboardScreen> createState() =>
      _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends ConsumerState<HomeDashboardScreen> {
  RealtimeChannel? _profileChannel;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _subscribeRealtime();
    });
  }

  @override
  void dispose() {
    final a = _profileChannel;
    if (a != null) supabaseClient.removeChannel(a);
    super.dispose();
  }

  void _subscribeRealtime() {
    final client = ref.read(supabaseClientProvider);
    final uid = client.auth.currentUser?.id;
    if (uid == null) return;

    final oldP = _profileChannel;
    if (oldP != null) supabaseClient.removeChannel(oldP);
    final pch = client.channel('home-profile-$uid');
    pch.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'profiles',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'id',
        value: uid,
      ),
      callback: (_) => _onBackendDriverSignal(),
    );
    pch.subscribe();
    _profileChannel = pch;
  }

  Future<void> _onBackendDriverSignal() async {
    if (!mounted) return;
    await ref.read(currentDriverProvider.notifier).refresh();
    if (!mounted) return;
    await ref.read(goOnlineNotifierProvider.notifier).revalidateIfOnline();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<DriverProfile?>>(currentDriverProvider, (prev, next) {
      final p = next.valueOrNull;
      if (p?.onlineStatus == DriverOnlineStatus.offline) {
        ref.read(goOnlineNotifierProvider.notifier).clearSessionTimer();
      }
    });

    final profileAsync = ref.watch(currentDriverProvider);
    final goState = ref.watch(goOnlineNotifierProvider);
    final statsAsync = ref.watch(todayTripStatsProvider);
    final scheme = Theme.of(context).colorScheme;
    final money = NumberFormat.currency(locale: 'en_ZA', symbol: 'R', decimalDigits: 2);

    return profileAsync.when(
      data: (profile) {
        if (profile == null) {
          return const Scaffold(
            body: Center(child: Text('No profile')),
          );
        }

        final online = profile.onlineStatus == DriverOnlineStatus.online;
        final blockers = goState.lastPrecheckReasons;

        return Scaffold(
          appBar: AppBar(title: const Text('Home')),
          body: RefreshIndicator(
            onRefresh: () async {
              await ref.read(currentDriverProvider.notifier).refresh();
              ref.invalidate(todayTripStatsProvider);
              await ref.read(todayTripStatsProvider.future);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: AppSpacing.screenPadding,
              children: [
                Text(
                  'Status',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      online ? Icons.circle : Icons.circle_outlined,
                      color: online ? Colors.greenAccent : scheme.outline,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        online
                            ? 'Online — visible for trip requests'
                            : 'Offline',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                StreamBuilder<void>(
                  stream: Stream.periodic(const Duration(seconds: 1)),
                  builder: (_, __) {
                    final start = goState.onlineSessionStartedAt;
                    if (!online || start == null) {
                      return Text(
                        'Session timer: —',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      );
                    }
                    final d = DateTime.now().difference(start);
                    final h = d.inHours;
                    final m = d.inMinutes.remainder(60);
                    final s = d.inSeconds.remainder(60);
                    return Text(
                      'Available this session: ${h}h ${m}m ${s}s (soft MVP)',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    );
                  },
                ),
                const SizedBox(height: 20),
                Text('Today', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                statsAsync.when(
                  data: (stats) {
                    return Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            label: 'Trips done',
                            value: '${stats.completedCount}',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            label: 'Earnings',
                            value: money.format(stats.totalFare),
                          ),
                        ),
                      ],
                    );
                  },
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text('$e'),
                ),
                const SizedBox(height: 24),
                if (blockers.isNotEmpty) ...[
                  Card(
                    color: scheme.errorContainer.withOpacity(0.35),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Cannot go online',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: 8),
                          ...blockers.map(
                            (r) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text('• $r'),
                            ),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: () {
                              ref.read(mainShellTabIndexProvider.notifier).state = 3;
                            },
                            child: const Text('Fix documents'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor:
                          online ? scheme.error : const Color(0xFF2E7D32),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: goState.busy
                        ? null
                        : () async {
                            final n = ref.read(goOnlineNotifierProvider.notifier);
                            if (online) {
                              await n.goOffline();
                            } else {
                              await n.goOnline();
                            }
                          },
                    child: Text(
                      online ? 'GO OFFLINE' : 'GO ONLINE',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Text('Quick links', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                _linkButton(
                  context,
                  icon: Icons.person_outline,
                  label: 'Profile',
                  tabIndex: 2,
                ),
                _linkButton(
                  context,
                  icon: Icons.folder_outlined,
                  label: 'Documents',
                  tabIndex: 3,
                ),
                _linkButton(
                  context,
                  icon: Icons.payments_outlined,
                  label: 'Earnings',
                  tabIndex: 4,
                ),
                _supportLink(context),
              ],
            ),
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        body: Center(child: Text('$e')),
      ),
    );
  }

  Widget _linkButton(
    BuildContext context, {
      required IconData icon,
      required String label,
      required int tabIndex,
    }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: OutlinedButton.icon(
        onPressed: () {
          ref.read(mainShellTabIndexProvider.notifier).state = tabIndex;
        },
        icon: Icon(icon),
        label: Align(
          alignment: Alignment.centerLeft,
          child: Text(label),
        ),
      ),
    );
  }

  Widget _supportLink(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: OutlinedButton.icon(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SupportScreen()),
          );
        },
        icon: const Icon(Icons.support_agent_outlined),
        label: const Align(
          alignment: Alignment.centerLeft,
          child: Text('Support'),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ],
        ),
      ),
    );
  }
}
