/// Values for `documents.document_type` (business-logic §2.3, MVP set).
abstract final class DocumentTypes {
  static const selfie = 'SELFIE';
  static const id = 'ID';
  static const driversLicense = 'DRIVERS_LICENSE';
  static const proofOfResidence = 'PROOF_OF_RESIDENCE';
  static const bankStatement = 'BANK_STATEMENT';
  static const natis = 'NATIS';
  static const doubleDisc = 'DOUBLE_DISC';
  static const insurance = 'INSURANCE';
  static const ck = 'CK';
  static const directorApproval = 'DIRECTOR_APPROVAL';
  static const vehiclePhotoFront = 'VEHICLE_PHOTO_FRONT';
  static const vehiclePhotoLeft = 'VEHICLE_PHOTO_LEFT';
  static const vehiclePhotoRight = 'VEHICLE_PHOTO_RIGHT';
  static const vehiclePhotoRear = 'VEHICLE_PHOTO_REAR';
  static const vehiclePhotoSpeedo = 'VEHICLE_PHOTO_SPEEDO';
}

/// Values for `documents.entity_type`.
abstract final class EntityTypes {
  static const driver = 'DRIVER';
  static const vehicle = 'VEHICLE';
}
