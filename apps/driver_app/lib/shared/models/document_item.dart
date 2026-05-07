/// Row-shaped document for list / compliance (PRD §5.5, Prompt 6).
class DocumentItem {
  const DocumentItem({
    required this.documentType,
    required this.entityType,
    required this.entityId,
    this.documentId,
    this.filePath,
    required this.status,
    this.expiryDate,
    this.declineReason,
    this.createdAt,
  });

  final String documentType;
  final String entityType;
  final String entityId;
  final String? documentId;
  final String? filePath;
  final String status;
  final DateTime? expiryDate;
  final String? declineReason;
  final DateTime? createdAt;

  factory DocumentItem.fromRow(Map<String, dynamic> row) {
    return DocumentItem(
      documentType: row['document_type'] as String? ?? '',
      entityType: (row['entity_type'] as String? ?? '').toUpperCase(),
      entityId: row['entity_id'] as String? ?? '',
      documentId: row['document_id'] as String?,
      filePath: row['file_path'] as String?,
      status: (row['status'] as String? ?? 'PENDING').toUpperCase(),
      expiryDate: _parseDate(row['expiry_date']),
      declineReason: row['decline_reason'] as String?,
      createdAt: _parseDate(row['created_at']),
    );
  }

  static DateTime? _parseDate(Object? v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
    return null;
  }

  bool get isTerminalBad =>
      status == 'EXPIRED' || status == 'DECLINED' || status == 'REJECTED';

  bool get canReupload => isTerminalBad;
}
