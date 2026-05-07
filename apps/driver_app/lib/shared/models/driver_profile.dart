import 'bank_details.dart';
import 'driver_enums.dart';

/// Driver row in `profiles` — see business-logic.md §2.1 and tech-spec.md.
///
/// Assumes `profiles.id` = `auth.users.id`. Optional `driver_id` is a separate
/// business UUID when the backend uses it.
class DriverProfile {
  const DriverProfile({
    required this.id,
    this.driverId,
    this.fullName,
    this.idNumber,
    this.dob,
    this.age,
    this.sex,
    this.residentialAddress,
    this.licenseNumber,
    this.licenseCode,
    this.pdpNumber,
    this.pdpExpiry,
    this.cellphone,
    this.email,
    this.bankDetails,
    this.selfieUrl,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.approvedAt,
    this.lastOnlineAt,
    required this.onlineStatus,
    this.currentVehicleId,
    this.trainingCompleted = false,
    this.registrationSubmitted = false,
  });

  final String id;
  final String? driverId;
  final String? fullName;
  final String? idNumber;
  final DateTime? dob;
  final int? age;
  final String? sex;
  final String? residentialAddress;
  final String? licenseNumber;
  final String? licenseCode;
  final String? pdpNumber;
  final DateTime? pdpExpiry;
  final String? cellphone;
  final String? email;
  final BankDetails? bankDetails;
  final String? selfieUrl;
  final DriverProfileStatus status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? approvedAt;
  final DateTime? lastOnlineAt;
  final DriverOnlineStatus onlineStatus;
  final String? currentVehicleId;
  final bool trainingCompleted;
  /// After full onboarding wizard submit; drives routing while status is pending.
  final bool registrationSubmitted;

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? bankJson;
    final bankRaw = json['bank_details'];
    if (bankRaw is Map<String, dynamic>) {
      bankJson = bankRaw;
    }

    return DriverProfile(
      id: json['id'] as String,
      driverId: json['driver_id'] as String?,
      fullName: json['full_name'] as String?,
      idNumber: json['id_number'] as String?,
      dob: _parseDate(json['dob']),
      age: json['age'] as int?,
      sex: json['sex'] as String?,
      residentialAddress: json['residential_address'] as String?,
      licenseNumber: json['license_number'] as String?,
      licenseCode: json['license_code'] as String?,
      pdpNumber: json['pdp_number'] as String?,
      pdpExpiry: _parseDate(json['pdp_expiry']),
      cellphone: json['cellphone'] as String?,
      email: json['email'] as String?,
      bankDetails: BankDetails.fromJson(bankJson),
      selfieUrl: json['selfie_url'] as String?,
      status: parseProfileStatus(json['status'] as String?),
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
      approvedAt: _parseDate(json['approved_at']),
      lastOnlineAt: _parseDate(json['last_online_at']),
      onlineStatus: parseOnlineStatus(json['online_status'] as String?),
      currentVehicleId: json['current_vehicle_id'] as String?,
      trainingCompleted: json['training_completed'] as bool? ?? false,
      registrationSubmitted: json['registration_submitted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (driverId != null) 'driver_id': driverId,
        if (fullName != null) 'full_name': fullName,
        if (idNumber != null) 'id_number': idNumber,
        if (dob != null) 'dob': dob!.toIso8601String().split('T').first,
        if (age != null) 'age': age,
        if (sex != null) 'sex': sex,
        if (residentialAddress != null) 'residential_address': residentialAddress,
        if (licenseNumber != null) 'license_number': licenseNumber,
        if (licenseCode != null) 'license_code': licenseCode,
        if (pdpNumber != null) 'pdp_number': pdpNumber,
        if (pdpExpiry != null) 'pdp_expiry': pdpExpiry!.toIso8601String().split('T').first,
        if (cellphone != null) 'cellphone': cellphone,
        if (email != null) 'email': email,
        if (bankDetails != null && bankDetails!.toJson().isNotEmpty) 'bank_details': bankDetails!.toJson(),
        if (selfieUrl != null) 'selfie_url': selfieUrl,
        'status': profileStatusToApi(status),
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
        if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
        if (approvedAt != null) 'approved_at': approvedAt!.toIso8601String(),
        if (lastOnlineAt != null) 'last_online_at': lastOnlineAt!.toIso8601String(),
        'online_status': onlineStatusToApi(onlineStatus),
        if (currentVehicleId != null) 'current_vehicle_id': currentVehicleId,
        'training_completed': trainingCompleted,
        'registration_submitted': registrationSubmitted,
      };

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}
