import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';

class DocumentUploadScreen extends ConsumerStatefulWidget {
  const DocumentUploadScreen({super.key});

  @override
  ConsumerState<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends ConsumerState<DocumentUploadScreen> {
  var _loading = false;
  List<Map<String, dynamic>> _docs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final docs = await ref.read(supabaseServiceProvider).listMyDocuments();
    if (mounted) setState(() => _docs = docs);
  }

  Future<void> _upload(String documentType) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image);
    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    final path = file.path;
    if (path == null) return;

    setState(() => _loading = true);
    try {
      final uid = ref.read(supabaseClientProvider).auth.currentUser!.id;
      final ext = path.split('.').last;
      final storagePath = '$uid/rider/${const Uuid().v4()}.$ext';
      final bytes = await File(path).readAsBytes();

      await ref.read(supabaseClientProvider).storage
          .from(SupabaseService.bucketRiderDocuments)
          .uploadBinary(storagePath, bytes);

      await ref.read(supabaseServiceProvider).insertDocument(
            documentType: documentType,
            filePath: storagePath,
          );

      await ref.read(supabaseServiceProvider).updateProfile({
        'registration_submitted': true,
      });
      await ref.read(currentRiderProvider.notifier).refresh();

      showAppToast('Document uploaded');
      await _load();
    } catch (e) {
      showAppToast('Upload failed. Try again.', long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Get verified')),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text(
              'Upload ID and proof of residence to book trips.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            _UploadTile(
              title: 'ID document',
              type: 'ID',
              loading: _loading,
              onUpload: () => _upload('ID'),
            ),
            _UploadTile(
              title: 'Proof of residence',
              type: 'PROOF_OF_RESIDENCE',
              loading: _loading,
              onUpload: () => _upload('PROOF_OF_RESIDENCE'),
            ),
            _UploadTile(
              title: 'Selfie',
              type: 'SELFIE',
              loading: _loading,
              onUpload: () => _upload('SELFIE'),
            ),
            const SizedBox(height: 24),
            Text('Uploaded', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_docs.isEmpty)
              const Text('No documents yet')
            else
              ..._docs.map(
                (d) => ListTile(
                  title: Text('${d['document_type']}'),
                  subtitle: Text('${d['status']}'),
                  trailing: const Icon(Icons.chevron_right),
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
    required this.type,
    required this.loading,
    required this.onUpload,
  });

  final String title;
  final String type;
  final bool loading;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(type),
        trailing: IconButton(
          onPressed: loading ? null : onUpload,
          icon: const Icon(Icons.upload_file),
          tooltip: 'Upload',
        ),
      ),
    );
  }
}
