import 'dart:developer' show log;
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/picked_file_path.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/document_item.dart';
import '../../shared/models/document_types.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/document_upload_service.dart';
import 'document_providers.dart';
import 'document_service.dart';

/// PRD §5.5: grouped driver / vehicle documents, expiry warnings, re-upload.
class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  static String _label(String documentType) {
    return switch (documentType) {
      DocumentTypes.selfie => 'Selfie',
      DocumentTypes.id => 'ID document',
      DocumentTypes.driversLicense => 'Driver licence',
      DocumentTypes.proofOfResidence => 'Proof of residence',
      DocumentTypes.bankStatement => 'Bank statement',
      DocumentTypes.natis => 'NATIS',
      DocumentTypes.doubleDisc => 'Double disc',
      DocumentTypes.insurance => 'Insurance',
      DocumentTypes.ck => 'CK document',
      DocumentTypes.directorApproval => 'Director approval',
      DocumentTypes.vehiclePhotoFront => 'Vehicle photo (front)',
      DocumentTypes.vehiclePhotoLeft => 'Vehicle photo (left)',
      DocumentTypes.vehiclePhotoRight => 'Vehicle photo (right)',
      DocumentTypes.vehiclePhotoRear => 'Vehicle photo (rear)',
      DocumentTypes.vehiclePhotoSpeedo => 'Speedometer photo',
      _ => documentType.replaceAll('_', ' ').toLowerCase(),
    };
  }

  static Color _expiryBannerColor(int days, ColorScheme scheme) {
    if (days <= 1) return scheme.errorContainer;
    if (days <= 3) return Colors.red.shade900.withOpacity(0.35);
    if (days <= 7) return scheme.tertiaryContainer;
    if (days <= 14) return scheme.secondaryContainer;
    return scheme.primaryContainer;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(driverDocumentsProvider);
    final profileAsync = ref.watch(currentDriverProvider);
    final scheme = Theme.of(context).colorScheme;
    final dateFmt = DateFormat.yMMMd();

    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: profileAsync.when(
        data: (profile) {
          if (profile == null) {
            return const Center(
              child: Padding(
                padding: AppSpacing.screenPadding,
                child: Text(
                  'We couldn\'t load your driver profile. Pull to refresh or sign in again.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return docsAsync.when(
            data: (docs) => _DocumentsBody(
              profile: profile,
              docs: docs,
              scheme: scheme,
              dateFmt: dateFmt,
              onRefresh: () => ref.invalidate(driverDocumentsProvider),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Padding(
                padding: AppSpacing.screenPadding,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(userFacingError(e), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => ref.invalidate(driverDocumentsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: Text(userFacingError(e), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}

class _DocumentsBody extends ConsumerWidget {
  const _DocumentsBody({
    required this.profile,
    required this.docs,
    required this.scheme,
    required this.dateFmt,
    required this.onRefresh,
  });

  final DriverProfile profile;
  final List<DocumentItem> docs;
  final ColorScheme scheme;
  final DateFormat dateFmt;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driverDocs =
        docs.where((d) => d.entityType == EntityTypes.driver).toList();
    final vehicleDocs = profile.currentVehicleId == null
        ? <DocumentItem>[]
        : docs
            .where(
              (d) =>
                  d.entityType == EntityTypes.vehicle &&
                  d.entityId == profile.currentVehicleId,
            )
            .toList();

    final warnings = <({int days, String label})>[];
    for (final d in docs) {
      final tier = DocumentService.expiryWarningTierDays(d);
      if (tier != null) {
        warnings.add((days: tier, label: DocumentsScreen._label(d.documentType)));
      }
    }
    warnings.sort((a, b) => a.days.compareTo(b.days));

    return RefreshIndicator(
      onRefresh: () async {
        onRefresh();
        await ref.read(driverDocumentsProvider.future);
      },
      child: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          if (warnings.isNotEmpty) ...[
            Text(
              'Expiry reminders',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            ...warnings.map((w) {
              final color = DocumentsScreen._expiryBannerColor(w.days, scheme);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      w.days == 1
                          ? '${w.label} expires tomorrow.'
                          : '${w.label} expires in ${w.days} days.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
          ],
          Text(
            'Driver',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (driverDocs.isEmpty)
            const Text('No driver documents loaded.')
          else
            ...driverDocs.map(
              (d) => _DocumentCard(
                doc: d,
                profile: profile,
                dateFmt: dateFmt,
              ),
            ),
          const SizedBox(height: 24),
          Text(
            'Vehicle',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (profile.currentVehicleId == null)
            const Text('No vehicle linked.')
          else if (vehicleDocs.isEmpty)
            const Text('No vehicle documents loaded.')
          else
            ...vehicleDocs.map(
              (d) => _DocumentCard(
                doc: d,
                profile: profile,
                dateFmt: dateFmt,
              ),
            ),
        ],
      ),
    );
  }
}

class _DocumentCard extends ConsumerWidget {
  const _DocumentCard({
    required this.doc,
    required this.profile,
    required this.dateFmt,
  });

  final DocumentItem doc;
  final DriverProfile profile;
  final DateFormat dateFmt;

  Future<void> _reupload(BuildContext context, WidgetRef ref) async {
    final pick = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
    );
    if (pick == null || pick.files.isEmpty || !context.mounted) return;
    final path = await materializePickedFile(pick.files.single);
    if (path == null || !context.mounted) {
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

    try {
      showAppToast('Uploading…', long: true);
      await ref.read(documentServiceProvider).uploadDocument(
            documentType: doc.documentType,
            file: File(path),
            entityId: doc.entityType == EntityTypes.driver
                ? profile.id
                : doc.entityId,
            expiryDate: expiryInput,
          );
      ref.invalidate(driverDocumentsProvider);
      if (context.mounted) showAppToast('Document submitted for review');
    } catch (e, st) {
      log(
        'DocumentsScreen._reupload failed',
        name: 'DocumentsScreen',
        error: e,
        stackTrace: st,
      );
      if (context.mounted) {
        showAppToast('Upload failed. ${userFacingError(e)}', long: true);
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final svc = ref.watch(documentServiceProvider);
    final url = svc.publicUrlFor(doc);
    final scheme = Theme.of(context).colorScheme;
    final s = doc.status.toUpperCase();
    final Color statusColor;
    switch (s) {
      case 'APPROVED':
        statusColor = Colors.green.shade700;
      case 'PENDING':
        statusColor = scheme.tertiary;
      case 'EXPIRED':
      case 'DECLINED':
      case 'REJECTED':
        statusColor = scheme.error;
      default:
        statusColor = scheme.onSurfaceVariant;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Preview(url: url, filePath: doc.filePath, svc: svc),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DocumentsScreen._label(doc.documentType),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        doc.status,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (doc.expiryDate != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Expires ${dateFmt.format(doc.expiryDate!.toLocal())}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      if (doc.declineReason != null &&
                          doc.declineReason!.trim().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Reason: ${doc.declineReason}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: scheme.error,
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            if (doc.canReupload) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonal(
                  onPressed: () => _reupload(context, ref),
                  child: const Text('Re-upload'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({
    required this.url,
    required this.filePath,
    required this.svc,
  });

  final String? url;
  final String? filePath;
  final DocumentService svc;

  @override
  Widget build(BuildContext context) {
    const size = 72.0;
    if (url != null &&
        filePath != null &&
        svc.isImagePath(filePath!)) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          url!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(context, size),
        ),
      );
    }
    return _placeholder(context, size);
  }

  Widget _placeholder(BuildContext context, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        filePath != null &&
                DocumentUploadService.storageExtension(filePath!) == 'pdf'
            ? Icons.picture_as_pdf
            : Icons.insert_drive_file,
        size: 32,
      ),
    );
  }
}
