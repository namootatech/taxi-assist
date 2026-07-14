/// Rider details returned by `driver_get_trip_rider`.
class TripRiderDetails {
  const TripRiderDetails({
    required this.id,
    required this.fullName,
    this.cellphone,
    required this.cellphoneVisible,
    this.selfieUrl,
    required this.verified,
    this.avgRating,
    required this.totalRatings,
    this.createdAt,
  });

  final String id;
  final String fullName;
  final String? cellphone;
  final bool cellphoneVisible;
  final String? selfieUrl;
  final bool verified;
  final double? avgRating;
  final int totalRatings;
  final DateTime? createdAt;

  /// How long the rider has been on the platform, e.g. "3 hours", "2 days",
  /// "5 months", "1 year 3 months".
  String get memberSinceLabel {
    final joined = createdAt;
    if (joined == null) return 'Member since unknown';
    return formatMemberTenure(joined, DateTime.now().toUtc());
  }

  factory TripRiderDetails.fromJson(Map<String, dynamic> json) {
    final avg = json['avg_rating'];
    return TripRiderDetails(
      id: json['id'] as String,
      fullName: (json['full_name'] as String?)?.trim().isNotEmpty == true
          ? (json['full_name'] as String).trim()
          : 'Rider',
      cellphone: json['cellphone'] as String?,
      cellphoneVisible: json['cellphone_visible'] == true,
      selfieUrl: json['selfie_url'] as String?,
      verified: json['verified'] == true,
      avgRating: avg is num ? avg.toDouble() : null,
      totalRatings: (json['total_ratings'] as num?)?.toInt() ?? 0,
      createdAt: _parseDate(json['created_at']),
    );
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value.toUtc();
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value)?.toUtc();
    }
    return null;
  }
}

/// Hours → days → months → years and months.
String formatMemberTenure(DateTime joined, DateTime now) {
  final start = joined.toUtc();
  final end = now.toUtc();
  if (end.isBefore(start)) return 'Just joined';

  var months =
      (end.year - start.year) * 12 + end.month - start.month;
  if (end.day < start.day) months -= 1;
  if (months < 0) months = 0;

  if (months >= 12) {
    final years = months ~/ 12;
    final remMonths = months % 12;
    final yearPart = years == 1 ? '1 year' : '$years years';
    if (remMonths == 0) return yearPart;
    final monthPart = remMonths == 1 ? '1 month' : '$remMonths months';
    return '$yearPart $monthPart';
  }

  if (months >= 1) {
    return months == 1 ? '1 month' : '$months months';
  }

  final days = end.difference(start).inDays;
  if (days >= 1) {
    return days == 1 ? '1 day' : '$days days';
  }

  final hours = end.difference(start).inHours;
  if (hours < 1) return 'Less than an hour';
  return hours == 1 ? '1 hour' : '$hours hours';
}
