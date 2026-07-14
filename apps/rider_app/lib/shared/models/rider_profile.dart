/// Rider row in `profiles` — `profile_type = RIDER`.
class RiderProfile {
  const RiderProfile({
    required this.id,
    this.fullName,
    this.cellphone,
    this.email,
    this.selfieUrl,
    required this.status,
    this.profileType = 'RIDER',
    this.registrationSubmitted = false,
  });

  final String id;
  final String? fullName;
  final String? cellphone;
  final String? email;
  final String? selfieUrl;
  final RiderProfileStatus status;
  final String profileType;
  final bool registrationSubmitted;

  bool get isApproved => status == RiderProfileStatus.approved;

  bool get hasCellphone {
    final phone = cellphone?.trim() ?? '';
    return phone.length >= 9;
  }

  bool get hasProfilePhoto {
    final url = selfieUrl?.trim() ?? '';
    return url.isNotEmpty;
  }

  /// Active riders may book only with cellphone + profile photo.
  bool get canBook =>
      profileType == 'RIDER' &&
      status != RiderProfileStatus.rejected &&
      status != RiderProfileStatus.suspended &&
      status != RiderProfileStatus.deactivated &&
      hasCellphone &&
      hasProfilePhoto;

  /// Human-readable reason when [canBook] is false (null if account is fine).
  String? get bookingBlockedReason {
    if (profileType != 'RIDER') return 'Rider profile required';
    if (status == RiderProfileStatus.rejected ||
        status == RiderProfileStatus.suspended ||
        status == RiderProfileStatus.deactivated) {
      return 'Your account cannot book trips right now. Contact support.';
    }
    final missing = <String>[];
    if (!hasProfilePhoto) missing.add('a profile photo');
    if (!hasCellphone) missing.add('a cellphone number');
    if (missing.isEmpty) return null;
    if (missing.length == 1) {
      return 'Add ${missing.first} in Profile before you can book.';
    }
    return 'Add ${missing.join(' and ')} in Profile before you can book.';
  }

  bool get isVerificationPending =>
      status == RiderProfileStatus.pending && !isApproved;

  factory RiderProfile.fromJson(Map<String, dynamic> json) {
    return RiderProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      cellphone: json['cellphone'] as String?,
      email: json['email'] as String?,
      selfieUrl: json['selfie_url'] as String?,
      status: RiderProfileStatus.fromDb(json['status'] as String?),
      profileType: (json['profile_type'] as String?) ?? 'RIDER',
      registrationSubmitted: json['registration_submitted'] == true,
    );
  }
}

enum RiderProfileStatus {
  pending,
  approved,
  rejected,
  suspended,
  deactivated;

  static RiderProfileStatus fromDb(String? raw) {
    return switch (raw?.toUpperCase()) {
      'APPROVED' => RiderProfileStatus.approved,
      'REJECTED' => RiderProfileStatus.rejected,
      'SUSPENDED' => RiderProfileStatus.suspended,
      'DEACTIVATED' => RiderProfileStatus.deactivated,
      _ => RiderProfileStatus.pending,
    };
  }
}
