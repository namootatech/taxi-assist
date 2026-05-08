import 'dart:developer' show log;
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/picked_file_path.dart';
import '../../core/supabase_client.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/document_item.dart';
import '../../shared/models/document_types.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';
import '../documents/document_providers.dart';

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
  bool _uploading = false;

  List<DocumentItem> _latestPerType(List<DocumentItem> docs) {
    final byKey = <String, DocumentItem>{};
    for (final d in docs) {
      final key = '${d.entityType}|${d.entityId}|${d.documentType}';
      final existing = byKey[key];
      if (existing == null) {
        byKey[key] = d;
        continue;
      }
      final a = existing.createdAt;
      final b = d.createdAt;
      if (a == null && b != null) {
        byKey[key] = d;
        continue;
      }
      if (a != null && b != null && b.isAfter(a)) {
        byKey[key] = d;
        continue;
      }
    }
    final list = byKey.values.toList();
    list.sort((a, b) {
      final da = a.createdAt;
      final db = b.createdAt;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return list;
  }

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
        _docs = _latestPerType(rows.map(DocumentItem.fromRow).toList());
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
      'DECLINED' => scheme.error,
      'REJECTED' => scheme.error,
      'EXPIRED' => scheme.error,
      _ => scheme.secondary,
    };
  }

  Future<void> _reupload(DocumentItem doc) async {
    if (_uploading) return;
    final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
    if (uid == null) {
      showAppToast('You are not signed in.');
      return;
    }

    final pick = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
    );
    if (pick == null || pick.files.isEmpty || !mounted) return;

    final path = await materializePickedFile(pick.files.single);
    if (path == null || !mounted) {
      showAppToast(
        'Could not read that file. Try another file or save a copy to your device first.',
        long: true,
      );
      return;
    }

    DateTime? expiryInput;
    if (doc.documentType == DocumentTypes.doubleDisc ||
        doc.documentType == DocumentTypes.insurance) {
      final chosen = await showDatePicker(
        context: context,
        initialDate: DateTime.now().add(const Duration(days: 365)),
        firstDate: DateTime.now(),
        lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
      );
      expiryInput = chosen;
      if (expiryInput == null) return;
    }

    setState(() => _uploading = true);
    try {
      showAppToast('Uploading…', long: true);
      await ref.read(documentServiceProvider).uploadDocument(
            documentType: doc.documentType,
            file: File(path),
            entityId: doc.entityType == EntityTypes.driver ? uid : doc.entityId,
            expiryDate: expiryInput,
          );
      if (mounted) {
        showAppToast('Received — we’ll review soon.');
        await _load();
      }
    } catch (e, st) {
      log(
        'WaitingApprovalScreen._reupload failed',
        name: 'WaitingApprovalScreen',
        error: e,
        stackTrace: st,
      );
      if (mounted) {
        showAppToast(
          'Upload didn’t finish. Check your connection and try again.',
          long: true,
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Review in progress')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: AppSpacing.screenPadding,
          children: [
            Text(
              'We’re reviewing your documents — we’ll notify you.',
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
                'No documents received yet — finish setup to upload everything you need.',
              ),
            ..._docs.map(
              (d) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(d.documentType),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        d.filePath ?? '—',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (d.declineReason != null &&
                          d.declineReason!.trim().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Reason: ${d.declineReason}',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                      if (d.canReupload) ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: OutlinedButton.icon(
                            onPressed: _uploading ? null : () => _reupload(d),
                            icon: _uploading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.upload_file),
                            label: const Text('Upload again'),
                          ),
                        ),
                      ],
                    ],
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
              child: const Text('Refresh status'),
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
