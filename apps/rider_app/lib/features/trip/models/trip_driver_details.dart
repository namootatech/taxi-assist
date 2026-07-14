/// Assigned driver + vehicle shown to the rider during an active trip.
class TripDriverDetails {
  const TripDriverDetails({
    required this.id,
    required this.fullName,
    this.cellphone,
    this.selfieUrl,
    this.avgRating,
    this.totalRatings = 0,
    this.vehicle,
    this.cellphoneVisible = false,
  });

  final String id;
  final String fullName;
  final String? cellphone;
  final String? selfieUrl;
  final double? avgRating;
  final int totalRatings;
  final TripVehicleDetails? vehicle;
  final bool cellphoneVisible;

  bool get canCall =>
      cellphoneVisible && (cellphone?.trim().isNotEmpty ?? false);

  String get ratingLabel {
    if (avgRating == null || totalRatings <= 0) return 'New driver';
    return '${avgRating!.toStringAsFixed(1)} · $totalRatings '
        '${totalRatings == 1 ? 'trip' : 'trips'}';
  }

  TripDriverDetails copyWithSelfie(String? url) {
    return TripDriverDetails(
      id: id,
      fullName: fullName,
      cellphone: cellphone,
      selfieUrl: url ?? selfieUrl,
      avgRating: avgRating,
      totalRatings: totalRatings,
      vehicle: vehicle,
      cellphoneVisible: cellphoneVisible,
    );
  }

  String? get vehicleLine {
    final v = vehicle;
    if (v == null) return null;
    final parts = <String>[
      if ((v.colour ?? '').trim().isNotEmpty) v.colour!.trim(),
      [
        if ((v.make ?? '').trim().isNotEmpty) v.make!.trim(),
        if ((v.model ?? '').trim().isNotEmpty) v.model!.trim(),
      ].join(' ').trim(),
      if ((v.registrationNumber ?? '').trim().isNotEmpty)
        v.registrationNumber!.trim().toUpperCase(),
    ].where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return null;
    return parts.join(' · ');
  }

  factory TripDriverDetails.fromJson(Map<String, dynamic> json) {
    final vehicleRaw = json['vehicle'];
    final cellphoneVisible = json['cellphone_visible'] == true ||
        ((json['cellphone'] as String?)?.trim().isNotEmpty ?? false);
    return TripDriverDetails(
      id: '${json['id']}',
      fullName: (json['full_name'] as String?)?.trim().isNotEmpty == true
          ? (json['full_name'] as String).trim()
          : 'Your driver',
      cellphone: json['cellphone'] as String?,
      selfieUrl: json['selfie_url'] as String?,
      avgRating: json['avg_rating'] is num
          ? (json['avg_rating'] as num).toDouble()
          : null,
      totalRatings: json['total_ratings'] is num
          ? (json['total_ratings'] as num).toInt()
          : 0,
      vehicle: vehicleRaw is Map
          ? TripVehicleDetails.fromJson(Map<String, dynamic>.from(vehicleRaw))
          : null,
      cellphoneVisible: cellphoneVisible,
    );
  }
}

class TripVehicleDetails {
  const TripVehicleDetails({
    this.vehicleId,
    this.make,
    this.model,
    this.colour,
    this.registrationNumber,
    this.category,
  });

  final String? vehicleId;
  final String? make;
  final String? model;
  final String? colour;
  final String? registrationNumber;
  final String? category;

  factory TripVehicleDetails.fromJson(Map<String, dynamic> json) {
    return TripVehicleDetails(
      vehicleId: json['vehicle_id'] as String?,
      make: json['make'] as String?,
      model: json['model'] as String?,
      colour: json['colour'] as String?,
      registrationNumber: json['registration_number'] as String?,
      category: json['category'] as String?,
    );
  }
}
