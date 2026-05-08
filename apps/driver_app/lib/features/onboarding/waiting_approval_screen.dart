import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/supabase_client.dart';
import '../../core/utils/safe_text.dart';
import '../../shared/models/document_item.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';

/// After `registration_submitted`, while profile is still PENDING — listen for
/// `documents` updates via Realtime.
class WaitingApprovalScreen extends ConsumerStatefulWidget {
  const WaitingApprovalScreen({super.key});

  @override
  ConsumerState<WaitingApprovalScreen> createState() =>
      _WaitingApprovalScreenState();
}

class _WaitingApprovalScreenState extends ConsumerState<WaitingApprovalScreen> {
  List<DocumentItem> _docs = [];
  RealtimeChannel? _channel;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _subscribe();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ref.read(supabaseServiceProvider).listMyDocuments();
      if (!mounted) return;
      setState(() {
        _docs = rows.map(DocumentItem.fromRow).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  void _subscribe() {
    Future<void>(() async {
      await _load();
      if (!mounted) return;
      final client = ref.read(supabaseClientProvider);
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;
      final ch = client.channel('documents-uploaded-by-$uid');
      ch.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: SupabaseService.documentsTable,
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'uploaded_by',
          value: uid,
        ),
        callback: (payload) {
          if (mounted) _load();
        },
      );
      ch.subscribe();
      if (!mounted) {
        client.removeChannel(ch);
        return;
      }
      setState(() => _channel = ch);
    });
  }

  @override
  void dispose() {
    final ch = _channel;
    if (ch != null) {
      supabaseClient.removeChannel(ch);
    }
    super.dispose();
  }

  Color _statusColor(String status, ColorScheme scheme) {
    return switch (status.toUpperCase()) {
      'APPROVED' => Colors.green.shade700,
      'REJECTED' => scheme.error,
      _ => scheme.secondary,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Awaiting approval')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: AppSpacing.screenPadding,
          children: [
            Text(
              'Your registration was submitted. We\'re reviewing your profile and '
              'documents — updates appear below as we go.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (_error != null)
              Text(
                userFacingError(_error),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            if (!_loading && _docs.isEmpty && _error == null)
              const Text(
                'No documents uploaded yet — finish your documents in onboarding.',
              ),
            ..._docs.map(
              (d) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(d.documentType),
                  subtitle: Text(
                    d.filePath ?? '—',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Chip(
                    label: Text(d.status),
                    backgroundColor: _statusColor(
                      d.status,
                      Theme.of(context).colorScheme,
                    ).withOpacity(0.2),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () =>
                  ref.read(currentDriverProvider.notifier).refresh(),
              child: const Text('Refresh profile'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () async {
                await ref.read(supabaseServiceProvider).signOut();
                ref.invalidate(currentDriverProvider);
              },
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}
