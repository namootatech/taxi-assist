import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/document_item.dart';
import '../../shared/models/document_types.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/services/document_upload_service.dart';
import '../../shared/services/supabase_service.dart';

/// PRD §5.5 / Prompt 6: list, upload/re-upload, preview URLs, Realtime hook-up.
class DocumentService {
  DocumentService(this._supabase, this._upload);

  final SupabaseService _supabase;
  final DocumentUploadService _upload;

  SupabaseClient get _client => _supabase.client;

  /// Matches `driver_precheck_go_online` critical `document_type` set.
  static const Set<String> criticalGoOnlineTypes = {
    DocumentTypes.driversLicense,
    DocumentTypes.id,
    DocumentTypes.selfie,
    DocumentTypes.proofOfResidence,
    DocumentTypes.natis,
    DocumentTypes.doubleDisc,
    DocumentTypes.insurance,
  };

  static String storageBucketForPath(String filePath) {
    final parts = filePath.split('/');
    if (parts.length >= 4 && parts[1] == 'vehicle') {
      final file = parts[3];
      if (file.startsWith('front_') ||
          file.startsWith('left_') ||
          file.startsWith('right_') ||
          file.startsWith('rear_') ||
          file.startsWith('speedo_')) {
        return SupabaseService.bucketVehiclePhotos;
      }
    }
    return SupabaseService.bucketDriverDocuments;
  }

  String? publicUrlFor(DocumentItem doc) {
    final path = doc.filePath;
    if (path == null || path.isEmpty) return null;
    final bucket = storageBucketForPath(path);
    return _upload.publicUrlForPath(bucket, path);
  }

  bool isImagePath(String path) {
    final ext = DocumentUploadService.storageExtension(path);
    return const {'png', 'jpg', 'jpeg', 'webp'}.contains(ext);
  }

  /// Driver + current vehicle rows only, newest first.
  Future<List<DocumentItem>> fetchDocumentsForProfile(DriverProfile profile) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];

    final rows = await _client
        .from(SupabaseService.documentsTable)
        .select()
        .eq('uploaded_by', uid)
        .order('created_at', ascending: false);

    final list = rows as List<dynamic>;
    final vehicleId = profile.currentVehicleId;
    return list
        .map((e) => DocumentItem.fromRow(Map<String, dynamic>.from(e as Map)))
        .where((d) {
          if (d.entityType == EntityTypes.driver && d.entityId == profile.id) {
            return true;
          }
          if (d.entityType == EntityTypes.vehicle &&
              vehicleId != null &&
              d.entityId == vehicleId) {
            return true;
          }
          return false;
        })
        .toList();
  }

  static bool _isBlockingRow(DocumentItem d, DateTime utcToday) {
    if (!criticalGoOnlineTypes.contains(d.documentType)) return false;
    if (d.status == 'EXPIRED' ||
        d.status == 'DECLINED' ||
        d.status == 'REJECTED') {
      return true;
    }
    if (d.expiryDate != null) {
      final e = _dateOnlyUtc(d.expiryDate!);
      if (e.isBefore(utcToday)) return true;
    }
    return false;
  }

  static DateTime _dateOnlyUtc(DateTime d) =>
      DateTime.utc(d.year, d.month, d.day);

  static DateTime utcToday() {
    final n = DateTime.now().toUtc();
    return DateTime.utc(n.year, n.month, n.day);
  }

  /// Same rule as `driver_precheck_go_online` for critical docs (any bad row).
  static bool hasBlockingCriticalIssue(Iterable<DocumentItem> docs) {
    final today = utcToday();
    return docs.any((d) => _isBlockingRow(d, today));
  }

  /// Days until expiry (inclusive of today = 0 on expiry day). Null if no date.
  static int? daysUntilExpiry(DateTime expiryDate) {
    final e = _dateOnlyUtc(expiryDate);
    final t = utcToday();
    return e.difference(t).inDays;
  }

  /// Approved doc with future expiry in 1..30 days → warning tier for UI.
  static int? expiryWarningTierDays(DocumentItem d) {
    if (d.status != 'APPROVED' || d.expiryDate == null) return null;
    final days = daysUntilExpiry(d.expiryDate!);
    if (days == null || days <= 0 || days > 30) return null;
    return days;
  }

  RealtimeChannel subscribeMyDocuments({
    required void Function(PostgresChangePayload payload) onEvent,
  }) {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) {
      throw StateError('Not signed in');
    }
    final ch = _client.channel('app-documents-$uid');
    ch.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: SupabaseService.documentsTable,
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'uploaded_by',
        value: uid,
      ),
      callback: onEvent,
    );
    ch.subscribe();
    return ch;
  }

  void unsubscribe(RealtimeChannel channel) {
    _client.removeChannel(channel);
  }

  /// Re-upload path: new `PENDING` row (same as onboarding).
  Future<void> uploadDocument({
    required String documentType,
    required File file,
    required String entityId,
    DateTime? expiryDate,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');

    final localPath = file.path;
    final bytes = await file.readAsBytes();
    final ct = DocumentUploadService.contentTypeForPath(localPath);

    final entityType =
        entityId == uid ? EntityTypes.driver : EntityTypes.vehicle;

    if (entityType == EntityTypes.driver) {
      final storagePath = DocumentUploadService.driverDocumentPath(
        authUid: uid,
        documentType: documentType,
        filePath: localPath,
      );
      await _upload.uploadAndRecord(
        bucket: SupabaseService.bucketDriverDocuments,
        storagePath: storagePath,
        bytes: bytes,
        contentType: ct,
        entityType: entityType,
        entityId: entityId,
        documentType: documentType,
        expiryDate: expiryDate,
      );
      return;
    }

    final vehicleId = entityId;
    final useVehiclePhotoBucket = documentType.startsWith('VEHICLE_PHOTO');
    final slot = _vehicleSlotForDocumentType(documentType);
    final storagePath = useVehiclePhotoBucket
        ? DocumentUploadService.vehicleAssetPath(
            authUid: uid,
            vehicleId: vehicleId,
            slot: slot,
            filePath: localPath,
          )
        : DocumentUploadService.driverDocumentPath(
            authUid: uid,
            documentType: '${documentType}_$vehicleId',
            filePath: localPath,
          );
    final bucket = useVehiclePhotoBucket
        ? SupabaseService.bucketVehiclePhotos
        : SupabaseService.bucketDriverDocuments;

    await _upload.uploadAndRecord(
      bucket: bucket,
      storagePath: storagePath,
      bytes: bytes,
      contentType: ct,
      entityType: entityType,
      entityId: vehicleId,
      documentType: documentType,
      expiryDate: expiryDate,
    );
  }

  static String _vehicleSlotForDocumentType(String documentType) {
    return switch (documentType) {
      DocumentTypes.vehiclePhotoFront => 'front',
      DocumentTypes.vehiclePhotoLeft => 'left',
      DocumentTypes.vehiclePhotoRight => 'right',
      DocumentTypes.vehiclePhotoRear => 'rear',
      DocumentTypes.vehiclePhotoSpeedo => 'speedo',
      DocumentTypes.natis => 'natis',
      DocumentTypes.doubleDisc => 'doubledisc',
      DocumentTypes.insurance => 'insurance',
      DocumentTypes.ck => 'ck',
      DocumentTypes.directorApproval => 'director',
      _ => 'doc',
    };
  }
}
