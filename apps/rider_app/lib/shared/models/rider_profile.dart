/// Rider row in `profiles` — `profile_type = RIDER`.
class RiderProfile {
  const RiderProfile({
    required this.id,
    this.fullName,
    this.cellphone,
    this.email,
    required this.status,
    this.profileType = 'RIDER',
    this.registrationSubmitted = false,
  });

  final String id;
  final String? fullName;
  final String? cellphone;
  final String? email;
  final RiderProfileStatus status;
  final String profileType;
  final bool registrationSubmitted;

  bool get isApproved => status == RiderProfileStatus.approved;

  /// Verification is optional — any active (non-blocked) rider may book.
  bool get canBook =>
      profileType == 'RIDER' &&
      status != RiderProfileStatus.rejected &&
      status != RiderProfileStatus.suspended &&
      status != RiderProfileStatus.deactivated;

  bool get isVerificationPending =>
      status == RiderProfileStatus.pending && !isApproved;

  factory RiderProfile.fromJson(Map<String, dynamic> json) {
    return RiderProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      cellphone: json['cellphone'] as String?,
      email: json['email'] as String?,
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
