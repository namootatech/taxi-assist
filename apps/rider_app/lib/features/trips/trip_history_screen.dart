import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/providers/app_providers.dart';

class TripHistoryScreen extends ConsumerStatefulWidget {
  const TripHistoryScreen({super.key});

  @override
  ConsumerState<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends ConsumerState<TripHistoryScreen> {
  List<Map<String, dynamic>> _trips = [];
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await ref.read(supabaseServiceProvider).fetchTripHistory();
    if (mounted) {
      setState(() {
        _trips = rows;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip history')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _trips.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('No trips yet')),
                      ],
                    )
                  : ListView.separated(
                      padding: AppSpacing.screenPadding,
                      itemCount: _trips.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (context, i) {
                        final t = _trips[i];
                        return ListTile(
                          title: Text(t['dropoff_address'] as String? ?? 'Trip'),
                          subtitle: Text('${t['status']} · ${t['completed_at'] ?? t['updated_at']}'),
                          trailing: Text(
                            'R${t['final_fare'] ?? t['estimated_fare'] ?? '—'}',
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
