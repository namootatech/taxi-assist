import 'driver_enums.dart';

enum VehicleOwnerKind { privateVehicle, companyVehicle }

/// In-memory Step 2 form → JSON for `vehicles` insert.
class VehicleDraft {
  const VehicleDraft({
    this.ownerKind = VehicleOwnerKind.privateVehicle,
    this.ownerFullName = '',
    this.ownerIdNumber = '',
    this.ownerAddress = '',
    this.companyCipc = '',
    this.companyName = '',
    this.companyAddress = '',
    this.registrationNumber = '',
    this.colour = '',
    this.make = '',
    this.model = '',
    this.category = VehicleCategory.sedan,
    this.vin = '',
    this.speedometerReading = '',
    this.doubleDiscExpiry,
    this.insuranceExpiry,
  });

  final VehicleOwnerKind ownerKind;
  final String ownerFullName;
  final String ownerIdNumber;
  final String ownerAddress;
  final String companyCipc;
  final String companyName;
  final String companyAddress;
  final String registrationNumber;
  final String colour;
  final String make;
  final String model;
  final VehicleCategory category;
  final String vin;
  final String speedometerReading;
  final DateTime? doubleDiscExpiry;
  final DateTime? insuranceExpiry;

  VehicleDraft copyWith({
    VehicleOwnerKind? ownerKind,
    String? ownerFullName,
    String? ownerIdNumber,
    String? ownerAddress,
    String? companyCipc,
    String? companyName,
    String? companyAddress,
    String? registrationNumber,
    String? colour,
    String? make,
    String? model,
    VehicleCategory? category,
    String? vin,
    String? speedometerReading,
    DateTime? doubleDiscExpiry,
    DateTime? insuranceExpiry,
  }) {
    return VehicleDraft(
      ownerKind: ownerKind ?? this.ownerKind,
      ownerFullName: ownerFullName ?? this.ownerFullName,
      ownerIdNumber: ownerIdNumber ?? this.ownerIdNumber,
      ownerAddress: ownerAddress ?? this.ownerAddress,
      companyCipc: companyCipc ?? this.companyCipc,
      companyName: companyName ?? this.companyName,
      companyAddress: companyAddress ?? this.companyAddress,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      colour: colour ?? this.colour,
      make: make ?? this.make,
      model: model ?? this.model,
      category: category ?? this.category,
      vin: vin ?? this.vin,
      speedometerReading: speedometerReading ?? this.speedometerReading,
      doubleDiscExpiry: doubleDiscExpiry ?? this.doubleDiscExpiry,
      insuranceExpiry: insuranceExpiry ?? this.insuranceExpiry,
    );
  }

  /// Server expects `owner_type` e.g. PRIVATE | COMPANY; JSONB owner/company blobs.
  Map<String, dynamic> toVehicleInsertRow({
    required String linkedDriverProfileId,
  }) {
    final ownerType =
        ownerKind == VehicleOwnerKind.privateVehicle ? 'PRIVATE' : 'COMPANY';
    final row = <String, dynamic>{
      'owner_type': ownerType,
      'registration_number': registrationNumber.trim(),
      'colour': colour.trim(),
      'make': make.trim(),
      'model': model.trim(),
      'category': vehicleCategoryToApi(category),
      'vin': vin.trim(),
      'speedometer_reading': speedometerReading.trim().isEmpty
          ? null
          : num.tryParse(speedometerReading.trim()),
      'status': 'PENDING',
      'linked_driver_id': linkedDriverProfileId,
      if (ownerKind == VehicleOwnerKind.privateVehicle)
        'owner_details': {
          'full_name': ownerFullName.trim(),
          'id_number': ownerIdNumber.trim(),
          'address': ownerAddress.trim(),
        },
      if (ownerKind == VehicleOwnerKind.companyVehicle)
        'company_details': {
          'cipc': companyCipc.trim(),
          'name': companyName.trim(),
          'address': companyAddress.trim(),
        },
    };
    return row;
  }
}
