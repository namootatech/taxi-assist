import '../../shared/models/bank_details.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/models/vehicle_draft.dart';

class OnboardingState {
  const OnboardingState({
    this.stepIndex = 0,
    this.isBusy = false,
    this.errorMessage,
    this.fullName = '',
    this.idNumber = '',
    this.dob,
    this.sex = '',
    this.residentialAddress = '',
    this.licenseNumber = '',
    this.licenseCode = '',
    this.pdpNumber = '',
    this.pdpExpiry,
    this.bankAccountHolder = '',
    this.bankName = '',
    this.bankAccountNumber = '',
    this.bankBranchCode = '',
    this.selfiePath,
    this.idDocPath,
    this.licenseDocPath,
    this.proofResidencePath,
    this.bankStatementPath,
    this.vehicleDraft = const VehicleDraft(),
    this.vehiclePhotoFrontPath,
    this.vehiclePhotoLeftPath,
    this.vehiclePhotoRightPath,
    this.vehiclePhotoRearPath,
    this.vehiclePhotoSpeedoPath,
    this.natisPath,
    this.doubleDiscPath,
    this.insurancePath,
    this.ckPath,
    this.directorApprovalPath,
    this.vehicleId,
  });

  final int stepIndex;
  final bool isBusy;
  final String? errorMessage;

  final String fullName;
  final String idNumber;
  final DateTime? dob;
  final String sex;
  final String residentialAddress;
  final String licenseNumber;
  final String licenseCode;
  final String pdpNumber;
  final DateTime? pdpExpiry;

  final String bankAccountHolder;
  final String bankName;
  final String bankAccountNumber;
  final String bankBranchCode;

  final String? selfiePath;
  final String? idDocPath;
  final String? licenseDocPath;
  final String? proofResidencePath;
  final String? bankStatementPath;

  final VehicleDraft vehicleDraft;

  final String? vehiclePhotoFrontPath;
  final String? vehiclePhotoLeftPath;
  final String? vehiclePhotoRightPath;
  final String? vehiclePhotoRearPath;
  final String? vehiclePhotoSpeedoPath;
  final String? natisPath;
  final String? doubleDiscPath;
  final String? insurancePath;
  final String? ckPath;
  final String? directorApprovalPath;

  final String? vehicleId;

  factory OnboardingState.fromProfile(DriverProfile p) {
    final b = p.bankDetails;
    return OnboardingState(
      fullName: p.fullName ?? '',
      idNumber: p.idNumber ?? '',
      dob: p.dob,
      sex: p.sex ?? '',
      residentialAddress: p.residentialAddress ?? '',
      licenseNumber: p.licenseNumber ?? '',
      licenseCode: p.licenseCode ?? '',
      pdpNumber: p.pdpNumber ?? '',
      pdpExpiry: p.pdpExpiry,
      bankAccountHolder: b?.accountHolder ?? '',
      bankName: b?.bankName ?? '',
      bankAccountNumber: b?.accountNumber ?? '',
      bankBranchCode: b?.branchCode ?? '',
    );
  }

  BankDetails bankDetailsFromForm() {
    return BankDetails(
      accountHolder:
          bankAccountHolder.trim().isEmpty ? null : bankAccountHolder.trim(),
      bankName: bankName.trim().isEmpty ? null : bankName.trim(),
      accountNumber:
          bankAccountNumber.trim().isEmpty ? null : bankAccountNumber.trim(),
      branchCode: bankBranchCode.trim().isEmpty ? null : bankBranchCode.trim(),
    );
  }

  String? validateStep1() {
    if (fullName.trim().isEmpty) return 'Enter your full name';
    if (idNumber.trim().isEmpty) return 'Enter your ID number';
    if (dob == null) return 'Select your date of birth';
    if (residentialAddress.trim().isEmpty) return 'Enter your residential address';
    if (licenseNumber.trim().isEmpty) return 'Enter your license number';
    if (licenseCode.trim().isEmpty) return 'Enter your license code';
    if (selfiePath == null) return 'Add a selfie photo';
    if (idDocPath == null) return 'Add a photo of your ID';
    if (licenseDocPath == null) return 'Add a photo of your driver\'s license';
    if (proofResidencePath == null) return 'Add proof of residence';
    final bank = bankDetailsFromForm();
    if (bank.accountNumber == null || bank.bankName == null) {
      return 'Enter bank name and account number (bank statement is optional)';
    }
    return null;
  }

  String? validateStep2() {
    final v = vehicleDraft;
    if (v.registrationNumber.trim().isEmpty) return 'Enter vehicle registration';
    if (v.colour.trim().isEmpty) return 'Enter vehicle colour';
    if (v.make.trim().isEmpty) return 'Enter vehicle make';
    if (v.model.trim().isEmpty) return 'Enter vehicle model';
    if (v.vin.trim().isEmpty) return 'Enter VIN';
    if (v.speedometerReading.trim().isEmpty) {
      return 'Enter speedometer reading';
    }
    if (num.tryParse(v.speedometerReading.trim()) == null) {
      return 'Speedometer reading must be a number';
    }
    if (v.ownerKind == VehicleOwnerKind.privateVehicle) {
      if (v.ownerFullName.trim().isEmpty) return 'Enter owner full name';
      if (v.ownerIdNumber.trim().isEmpty) return 'Enter owner ID number';
      if (v.ownerAddress.trim().isEmpty) return 'Enter owner address';
    } else {
      if (v.companyName.trim().isEmpty) return 'Enter company name';
      if (v.companyCipc.trim().isEmpty) return 'Enter CIPC / registration';
      if (v.companyAddress.trim().isEmpty) return 'Enter company address';
      if (ckPath == null) return 'Upload CK document';
      if (directorApprovalPath == null) return 'Upload director approval';
    }
    if (vehiclePhotoFrontPath == null ||
        vehiclePhotoLeftPath == null ||
        vehiclePhotoRightPath == null ||
        vehiclePhotoRearPath == null ||
        vehiclePhotoSpeedoPath == null) {
      return 'Add all five vehicle photos';
    }
    if (natisPath == null) return 'Add NATIS / registration document';
    if (doubleDiscPath == null) return 'Add double disc document';
    if (insurancePath == null) return 'Add insurance document';
    if (v.doubleDiscExpiry == null) return 'Select double disc expiry';
    if (v.insuranceExpiry == null) return 'Select insurance expiry';
    return null;
  }

  OnboardingState copyWith({
    int? stepIndex,
    bool? isBusy,
    String? errorMessage,
    String? fullName,
    String? idNumber,
    DateTime? dob,
    String? sex,
    String? residentialAddress,
    String? licenseNumber,
    String? licenseCode,
    String? pdpNumber,
    DateTime? pdpExpiry,
    String? bankAccountHolder,
    String? bankName,
    String? bankAccountNumber,
    String? bankBranchCode,
    String? selfiePath,
    String? idDocPath,
    String? licenseDocPath,
    String? proofResidencePath,
    String? bankStatementPath,
    VehicleDraft? vehicleDraft,
    String? vehiclePhotoFrontPath,
    String? vehiclePhotoLeftPath,
    String? vehiclePhotoRightPath,
    String? vehiclePhotoRearPath,
    String? vehiclePhotoSpeedoPath,
    String? natisPath,
    String? doubleDiscPath,
    String? insurancePath,
    String? ckPath,
    String? directorApprovalPath,
    String? vehicleId,
    bool clearError = false,
  }) {
    return OnboardingState(
      stepIndex: stepIndex ?? this.stepIndex,
      isBusy: isBusy ?? this.isBusy,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      fullName: fullName ?? this.fullName,
      idNumber: idNumber ?? this.idNumber,
      dob: dob ?? this.dob,
      sex: sex ?? this.sex,
      residentialAddress: residentialAddress ?? this.residentialAddress,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      licenseCode: licenseCode ?? this.licenseCode,
      pdpNumber: pdpNumber ?? this.pdpNumber,
      pdpExpiry: pdpExpiry ?? this.pdpExpiry,
      bankAccountHolder: bankAccountHolder ?? this.bankAccountHolder,
      bankName: bankName ?? this.bankName,
      bankAccountNumber: bankAccountNumber ?? this.bankAccountNumber,
      bankBranchCode: bankBranchCode ?? this.bankBranchCode,
      selfiePath: selfiePath ?? this.selfiePath,
      idDocPath: idDocPath ?? this.idDocPath,
      licenseDocPath: licenseDocPath ?? this.licenseDocPath,
      proofResidencePath: proofResidencePath ?? this.proofResidencePath,
      bankStatementPath: bankStatementPath ?? this.bankStatementPath,
      vehicleDraft: vehicleDraft ?? this.vehicleDraft,
      vehiclePhotoFrontPath: vehiclePhotoFrontPath ?? this.vehiclePhotoFrontPath,
      vehiclePhotoLeftPath: vehiclePhotoLeftPath ?? this.vehiclePhotoLeftPath,
      vehiclePhotoRightPath: vehiclePhotoRightPath ?? this.vehiclePhotoRightPath,
      vehiclePhotoRearPath: vehiclePhotoRearPath ?? this.vehiclePhotoRearPath,
      vehiclePhotoSpeedoPath: vehiclePhotoSpeedoPath ?? this.vehiclePhotoSpeedoPath,
      natisPath: natisPath ?? this.natisPath,
      doubleDiscPath: doubleDiscPath ?? this.doubleDiscPath,
      insurancePath: insurancePath ?? this.insurancePath,
      ckPath: ckPath ?? this.ckPath,
      directorApprovalPath: directorApprovalPath ?? this.directorApprovalPath,
      vehicleId: vehicleId ?? this.vehicleId,
    );
  }
}
