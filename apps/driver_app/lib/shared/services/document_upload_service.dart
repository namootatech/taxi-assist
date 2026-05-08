import 'dart:developer' show log;
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import 'supabase_service.dart';

/// Uploads to Supabase Storage and inserts `documents` rows (RLS on backend).
///
/// **Expected `documents` DDL (operators):** `document_id` uuid default
/// `gen_random_uuid()`, `entity_type` text, `entity_id` uuid,
/// `document_type` text, `file_path` text, `status` text default `PENDING`,
/// `uploaded_by` uuid (`auth.uid()`), optional `expiry_date` date.
///
/// **Buckets:** `driver-documents`, `vehicle-photos` (tech-spec §2.4).
/// Vehicle PDFs/images may live under `driver-documents` as
/// `{uid}/vehicle/{vehicle_id}/...` if bucket policies are simpler.
class DocumentUploadService {
  DocumentUploadService(this._supabase);

  final SupabaseService _supabase;
  static const _uuid = Uuid();

  static String storageExtension(String path) {
    final i = path.lastIndexOf('.');
    if (i < 0 || i == path.length - 1) return 'bin';
    return path.substring(i + 1).toLowerCase();
  }

  static String contentTypeForPath(String path) {
    final ext = storageExtension(path);
    return switch (ext) {
      'png' => 'image/png',
      'jpg' => 'image/jpeg',
      'jpeg' => 'image/jpeg',
      'webp' => 'image/webp',
      'pdf' => 'application/pdf',
      _ => 'application/octet-stream',
    };
  }

  /// `{auth_uid}/driver/{document_type}_{uuid}.{ext}`
  static String driverDocumentPath({
    required String authUid,
    required String documentType,
    required String filePath,
  }) {
    final ext = storageExtension(filePath);
    return '$authUid/driver/${documentType}_${_uuid.v4()}.$ext';
  }

  /// Vehicle photos: `{auth_uid}/vehicle/{vehicle_id}/{slot}_{uuid}.{ext}`
  static String vehicleAssetPath({
    required String authUid,
    required String vehicleId,
    required String slot,
    required String filePath,
  }) {
    final ext = storageExtension(filePath);
    return '$authUid/vehicle/$vehicleId/${slot}_${_uuid.v4()}.$ext';
  }

  Future<void> uploadBinary({
    required String bucket,
    required String storagePath,
    required Uint8List bytes,
    required String contentType,
  }) async {
    try {
      await _supabase.client.storage.from(bucket).uploadBinary(
            storagePath,
            bytes,
            fileOptions: FileOptions(contentType: contentType, upsert: true),
          );
    } catch (e, st) {
      log(
        'storage.uploadBinary failed bucket=$bucket path=$storagePath '
        'contentType=$contentType bytes=${bytes.length}: $e',
        name: 'DocumentUploadService',
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  String publicUrlForPath(String bucket, String storagePath) {
    return _supabase.client.storage.from(bucket).getPublicUrl(storagePath);
  }

  Future<void> recordDocument({
    required String entityType,
    required String entityId,
    required String documentType,
    required String filePath,
    DateTime? expiryDate,
  }) async {
    final uid = _supabase.auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');

    final row = <String, dynamic>{
      'entity_type': entityType,
      'entity_id': entityId,
      'document_type': documentType,
      'file_path': filePath,
      'status': 'PENDING',
      'uploaded_by': uid,
      if (expiryDate != null)
        'expiry_date': expiryDate.toIso8601String().split('T').first,
    };

    try {
      await _supabase.client.from(SupabaseService.documentsTable).insert(row);
    } catch (e, st) {
      log(
        'documents.insert failed entityType=$entityType entityId=$entityId '
        'documentType=$documentType: $e',
        name: 'DocumentUploadService',
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  Future<void> uploadAndRecord({
    required String bucket,
    required String storagePath,
    required Uint8List bytes,
    required String contentType,
    required String entityType,
    required String entityId,
    required String documentType,
    DateTime? expiryDate,
  }) async {
    await uploadBinary(
      bucket: bucket,
      storagePath: storagePath,
      bytes: bytes,
      contentType: contentType,
    );
    await recordDocument(
      entityType: entityType,
      entityId: entityId,
      documentType: documentType,
      filePath: storagePath,
      expiryDate: expiryDate,
    );
  }
}
