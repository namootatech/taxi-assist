import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/toast.dart';
import '../../shared/models/document_types.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/models/vehicle_draft.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/document_upload_service.dart';
import '../../shared/services/supabase_service.dart';
import 'onboarding_state.dart';

final onboardingNotifierProvider = StateNotifierProvider.autoDispose
    .family<OnboardingNotifier, OnboardingState, String>((ref, profileId) {
  final profile = ref.read(currentDriverProvider).valueOrNull;
  if (profile == null || profile.id != profileId) {
    throw ArgumentError('Onboarding requires profile id $profileId');
  }
  return OnboardingNotifier(ref, profile);
});

class OnboardingNotifier extends StateNotifier<OnboardingState> {
  OnboardingNotifier(this._ref, DriverProfile profile)
      : _profileId = profile.id,
        super(OnboardingState.fromProfile(profile));

  final Ref _ref;
  final String _profileId;

  SupabaseService get _svc => _ref.read(supabaseServiceProvider);
  DocumentUploadService get _upload => _ref.read(documentUploadServiceProvider);

  void replaceVehicleDraft(VehicleDraft v) {
    state = state.copyWith(vehicleDraft: v);
  }

  void setSelfiePath(String? path) => state = state.copyWith(selfiePath: path);
  void setIdDocPath(String? path) => state = state.copyWith(idDocPath: path);
  void setLicenseDocPath(String? path) =>
      state = state.copyWith(licenseDocPath: path);
  void setProofResidencePath(String? path) =>
      state = state.copyWith(proofResidencePath: path);
  void setBankStatementPath(String? path) =>
      state = state.copyWith(bankStatementPath: path);

  void setVehiclePhotoFrontPath(String? path) =>
      state = state.copyWith(vehiclePhotoFrontPath: path);
  void setVehiclePhotoLeftPath(String? path) =>
      state = state.copyWith(vehiclePhotoLeftPath: path);
  void setVehiclePhotoRightPath(String? path) =>
      state = state.copyWith(vehiclePhotoRightPath: path);
  void setVehiclePhotoRearPath(String? path) =>
      state = state.copyWith(vehiclePhotoRearPath: path);
  void setVehiclePhotoSpeedoPath(String? path) =>
      state = state.copyWith(vehiclePhotoSpeedoPath: path);
  void setNatisPath(String? path) => state = state.copyWith(natisPath: path);
  void setDoubleDiscPath(String? path) =>
      state = state.copyWith(doubleDiscPath: path);
  void setInsurancePath(String? path) =>
      state = state.copyWith(insurancePath: path);
  void setCkPath(String? path) => state = state.copyWith(ckPath: path);
  void setDirectorApprovalPath(String? path) =>
      state = state.copyWith(directorApprovalPath: path);

  void setDob(DateTime? d) => state = state.copyWith(dob: d);

  void setPdpExpiry(DateTime? d) => state = state.copyWith(pdpExpiry: d);

  void setSex(String v) => state = state.copyWith(sex: v);

  void savePersonalFromForm({
    required String fullName,
    required String idNumber,
    required DateTime? dob,
    required String sex,
    required String residentialAddress,
    required String licenseNumber,
    required String licenseCode,
    required String pdpNumber,
    required DateTime? pdpExpiry,
    required String bankAccountHolder,
    required String bankName,
    required String bankAccountNumber,
    required String bankBranchCode,
  }) {
    state = state.copyWith(
      fullName: fullName,
      idNumber: idNumber,
      dob: dob,
      sex: sex,
      residentialAddress: residentialAddress,
      licenseNumber: licenseNumber,
      licenseCode: licenseCode,
      pdpNumber: pdpNumber,
      pdpExpiry: pdpExpiry,
      bankAccountHolder: bankAccountHolder,
      bankName: bankName,
      bankAccountNumber: bankAccountNumber,
      bankBranchCode: bankBranchCode,
      clearError: true,
    );
  }

  void back() {
    if (state.stepIndex <= 0) return;
    state = state.copyWith(stepIndex: state.stepIndex - 1, clearError: true);
  }

  Future<String> _uploadDriverDoc({
    required String uid,
    required String localPath,
    required String docType,
  }) async {
    final bytes = await File(localPath).readAsBytes();
    final storagePath = DocumentUploadService.driverDocumentPath(
      authUid: uid,
      documentType: docType,
      filePath: localPath,
    );
    final ct = DocumentUploadService.contentTypeForPath(localPath);
    await _upload.uploadAndRecord(
      bucket: SupabaseService.bucketDriverDocuments,
      storagePath: storagePath,
      bytes: bytes,
      contentType: ct,
      entityType: EntityTypes.driver,
      entityId: _profileId,
      documentType: docType,
    );
    return storagePath;
  }

  Future<String> _uploadVehicleFile({
    required String uid,
    required String vehicleId,
    required String localPath,
    required String slot,
    required String documentType,
    DateTime? expiry,
    required bool useVehiclePhotoBucket,
  }) async {
    final bytes = await File(localPath).readAsBytes();
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
    final ct = DocumentUploadService.contentTypeForPath(localPath);
    final bucket = useVehiclePhotoBucket
        ? SupabaseService.bucketVehiclePhotos
        : SupabaseService.bucketDriverDocuments;
    await _upload.uploadAndRecord(
      bucket: bucket,
      storagePath: storagePath,
      bytes: bytes,
      contentType: ct,
      entityType: EntityTypes.vehicle,
      entityId: vehicleId,
      documentType: documentType,
      expiryDate: expiry,
    );
    return storagePath;
  }

  Future<void> completeStep1() async {
    final err = state.validateStep1();
    if (err != null) {
      showAppToast(err);
      return;
    }

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final uid = _svc.auth.currentUser?.id;
      if (uid == null) throw StateError('Not signed in');

      final selfieStorage = await _uploadDriverDoc(
        uid: uid,
        localPath: state.selfiePath!,
        docType: DocumentTypes.selfie,
      );
      await _uploadDriverDoc(
        uid: uid,
        localPath: state.idDocPath!,
        docType: DocumentTypes.id,
      );
      await _uploadDriverDoc(
        uid: uid,
        localPath: state.licenseDocPath!,
        docType: DocumentTypes.driversLicense,
      );
      await _uploadDriverDoc(
        uid: uid,
        localPath: state.proofResidencePath!,
        docType: DocumentTypes.proofOfResidence,
      );

      if (state.bankStatementPath != null) {
        await _uploadDriverDoc(
          uid: uid,
          localPath: state.bankStatementPath!,
          docType: DocumentTypes.bankStatement,
        );
      }

      final selfieUrl = _upload.publicUrlForPath(
        SupabaseService.bucketDriverDocuments,
        selfieStorage,
      );

      final bank = state.bankDetailsFromForm();
      final patch = <String, dynamic>{
        'full_name': state.fullName.trim(),
        'id_number': state.idNumber.trim(),
        if (state.dob != null)
          'dob': state.dob!.toIso8601String().split('T').first,
        if (state.sex.trim().isNotEmpty) 'sex': state.sex.trim(),
        'residential_address': state.residentialAddress.trim(),
        'license_number': state.licenseNumber.trim(),
        'license_code': state.licenseCode.trim(),
        if (state.pdpNumber.trim().isNotEmpty)
          'pdp_number': state.pdpNumber.trim(),
        if (state.pdpExpiry != null)
          'pdp_expiry': state.pdpExpiry!.toIso8601String().split('T').first,
        if (bank.toJson().isNotEmpty) 'bank_details': bank.toJson(),
        'selfie_url': selfieUrl,
        'status': 'PENDING',
      };

      await _svc.updateProfile(patch);
      state = state.copyWith(stepIndex: 1, isBusy: false);
      showAppToast('Step 1 saved');
    } catch (e) {
      state = state.copyWith(isBusy: false, errorMessage: '$e');
      showAppToast('Could not complete step 1: $e', long: true);
    }
  }

  Future<void> completeStep2() async {
    final err = state.validateStep2();
    if (err != null) {
      showAppToast(err);
      return;
    }

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final uid = _svc.auth.currentUser?.id;
      if (uid == null) throw StateError('Not signed in');

      final row = await _svc.insertVehicle(
        state.vehicleDraft.toVehicleInsertRow(
          linkedDriverProfileId: _profileId,
        ),
      );
      final vehicleId = (row['vehicle_id'] ?? row['id']) as String?;
      if (vehicleId == null || vehicleId.isEmpty) {
        throw StateError('Server did not return vehicle_id');
      }

      final v = state.vehicleDraft;

      Future<void> photo(String? path, String slot, String docType) {
        return _uploadVehicleFile(
          uid: uid,
          vehicleId: vehicleId,
          localPath: path!,
          slot: slot,
          documentType: docType,
          useVehiclePhotoBucket: true,
        );
      }

      await photo(
        state.vehiclePhotoFrontPath,
        'front',
        DocumentTypes.vehiclePhotoFront,
      );
      await photo(
        state.vehiclePhotoLeftPath,
        'left',
        DocumentTypes.vehiclePhotoLeft,
      );
      await photo(
        state.vehiclePhotoRightPath,
        'right',
        DocumentTypes.vehiclePhotoRight,
      );
      await photo(
        state.vehiclePhotoRearPath,
        'rear',
        DocumentTypes.vehiclePhotoRear,
      );
      await photo(
        state.vehiclePhotoSpeedoPath,
        'speedo',
        DocumentTypes.vehiclePhotoSpeedo,
      );

      await _uploadVehicleFile(
        uid: uid,
        vehicleId: vehicleId,
        localPath: state.natisPath!,
        slot: 'natis',
        documentType: DocumentTypes.natis,
        useVehiclePhotoBucket: false,
      );
      await _uploadVehicleFile(
        uid: uid,
        vehicleId: vehicleId,
        localPath: state.doubleDiscPath!,
        slot: 'doubledisc',
        documentType: DocumentTypes.doubleDisc,
        expiry: v.doubleDiscExpiry,
        useVehiclePhotoBucket: false,
      );
      await _uploadVehicleFile(
        uid: uid,
        vehicleId: vehicleId,
        localPath: state.insurancePath!,
        slot: 'insurance',
        documentType: DocumentTypes.insurance,
        expiry: v.insuranceExpiry,
        useVehiclePhotoBucket: false,
      );

      if (v.ownerKind == VehicleOwnerKind.companyVehicle) {
        await _uploadVehicleFile(
          uid: uid,
          vehicleId: vehicleId,
          localPath: state.ckPath!,
          slot: 'ck',
          documentType: DocumentTypes.ck,
          useVehiclePhotoBucket: false,
        );
        await _uploadVehicleFile(
          uid: uid,
          vehicleId: vehicleId,
          localPath: state.directorApprovalPath!,
          slot: 'director',
          documentType: DocumentTypes.directorApproval,
          useVehiclePhotoBucket: false,
        );
      }

      state = state.copyWith(
        stepIndex: 2,
        isBusy: false,
        vehicleId: vehicleId,
      );
      showAppToast('Step 2 saved');
    } catch (e) {
      state = state.copyWith(isBusy: false, errorMessage: '$e');
      showAppToast('Could not complete step 2: $e', long: true);
    }
  }

  Future<void> submitRegistration() async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _svc.updateProfile({
        'registration_submitted': true,
        'status': 'PENDING',
      });
      await _ref.read(currentDriverProvider.notifier).refresh();
      state = state.copyWith(isBusy: false);
      showAppToast('Registration submitted — awaiting review');
    } catch (e) {
      state = state.copyWith(isBusy: false, errorMessage: '$e');
      showAppToast('Submit failed: $e', long: true);
    }
  }
}
