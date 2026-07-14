import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/pick_image.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';

class DocumentUploadScreen extends ConsumerStatefulWidget {
  const DocumentUploadScreen({super.key});

  @override
  ConsumerState<DocumentUploadScreen> createState() =>
      _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends ConsumerState<DocumentUploadScreen> {
  var _loading = false;
  var _loadingDocs = true;
  List<Map<String, dynamic>> _docs = [];

  @override
  void initState() {
    super.initState();
    AppLog.i('ui.documents', 'opened');
    _load();
  }

  Future<void> _load() async {
    setState(() => _loadingDocs = true);
    try {
      final docs = await ref.read(supabaseServiceProvider).listMyDocuments();
      if (mounted) setState(() => _docs = docs);
    } catch (e, st) {
      AppLog.e('ui.documents', 'load_failed', error: e, stackTrace: st);
      if (mounted) showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _loadingDocs = false);
    }
  }

  bool _hasType(String type) =>
      _docs.any((d) => '${d['document_type']}' == type);

  Future<void> _upload(String documentType) async {
    if (_loading) return;
    AppLog.i('ui.documents', 'upload_tap', {'documentType': documentType});

    final path = await pickImageFromSheet(context);
    if (path == null) {
      AppLog.d('ui.documents', 'pick_cancelled', {'documentType': documentType});
      return;
    }

    setState(() => _loading = true);
    try {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) {
        throw StateError('Not signed in');
      }
      final ext = path.contains('.') ? path.split('.').last.toLowerCase() : 'jpg';
      final storagePath = '$uid/rider/${const Uuid().v4()}.$ext';
      AppLog.i('ui.documents', 'upload_started', {
        'documentType': documentType,
        'storagePath': storagePath,
      });

      final bytes = await File(path).readAsBytes();
      await ref
          .read(supabaseClientProvider)
          .storage
          .from(SupabaseService.bucketRiderDocuments)
          .uploadBinary(storagePath, bytes);

      await ref.read(supabaseServiceProvider).insertDocument(
            documentType: documentType,
            filePath: storagePath,
          );

      if (documentType == 'SELFIE') {
        await ref.read(supabaseServiceProvider).updateProfile({
          'selfie_url': storagePath,
        });
      }

      final required = {'ID', 'PROOF_OF_RESIDENCE', 'SELFIE'};
      final types = {
        ..._docs.map((d) => '${d['document_type']}'),
        documentType,
      };
      if (required.every(types.contains)) {
        await ref.read(supabaseServiceProvider).updateProfile({
          'registration_submitted': true,
        });
        AppLog.i('ui.documents', 'registration_submitted');
      }

      await ref.read(currentRiderProvider.notifier).refresh();
      showAppToast('Document uploaded');
      await _load();
      AppLog.i('ui.documents', 'upload_ok', {'documentType': documentType});
    } catch (e, st) {
      AppLog.e('ui.documents', 'upload_failed',
          error: e, stackTrace: st, data: {'documentType': documentType});
      showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Get verified'),
        actions: [
          TextButton(
            onPressed: () {
              AppLog.i('ui.documents', 'skipped');
              if (canPop) {
                Navigator.of(context).pop();
              }
            },
            child: const Text('Skip'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text(
              'Verification is optional. You can use the app and book trips without uploading documents.',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Tip: on an emulator with an empty gallery, use Take photo.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            _UploadTile(
              title: 'ID document',
              subtitle: 'South African ID or passport',
              done: _hasType('ID'),
              loading: _loading,
              onUpload: () => _upload('ID'),
            ),
            _UploadTile(
              title: 'Proof of residence',
              subtitle: 'Utility bill or bank statement',
              done: _hasType('PROOF_OF_RESIDENCE'),
              loading: _loading,
              onUpload: () => _upload('PROOF_OF_RESIDENCE'),
            ),
            _UploadTile(
              title: 'Selfie',
              subtitle: 'Clear photo of your face',
              done: _hasType('SELFIE'),
              loading: _loading,
              onUpload: () => _upload('SELFIE'),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () {
                AppLog.i('ui.documents', 'skip_cta');
                if (canPop) {
                  Navigator.of(context).pop();
                }
              },
              child: const Text('Skip for now'),
            ),
            const SizedBox(height: 24),
            Text('Uploaded', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_loadingDocs)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_docs.isEmpty)
              Text(
                'No documents yet — tap a row above to add one, or skip.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              )
            else
              ..._docs.map(
                (d) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.check_circle_outline),
                  title: Text('${d['document_type']}'),
                  subtitle: Text('${d['status']}'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _UploadTile extends StatelessWidget {
  const _UploadTile({
    required this.title,
    required this.subtitle,
    required this.done,
    required this.loading,
    required this.onUpload,
  });

  final String title;
  final String subtitle;
  final bool done;
  final bool loading;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: loading ? null : onUpload,
        leading: Icon(
          done ? Icons.check_circle : Icons.add_a_photo_outlined,
          color: done ? scheme.primary : scheme.onSurfaceVariant,
        ),
        title: Text(title),
        subtitle: Text(done ? 'Uploaded — tap to replace' : subtitle),
        trailing: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.chevron_right),
      ),
    );
  }
}
