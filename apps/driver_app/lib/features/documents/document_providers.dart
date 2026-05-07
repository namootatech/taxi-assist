import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/document_item.dart';
import '../../shared/providers/app_providers.dart';
import 'document_service.dart';

final documentServiceProvider = Provider<DocumentService>((ref) {
  return DocumentService(
    ref.watch(supabaseServiceProvider),
    ref.watch(documentUploadServiceProvider),
  );
});

final driverDocumentsProvider =
    FutureProvider.autoDispose<List<DocumentItem>>((ref) async {
  final profile = await ref.watch(currentDriverProvider.future);
  if (profile == null) return [];
  return ref.watch(documentServiceProvider).fetchDocumentsForProfile(profile);
});
