import '../../shared/models/rider_profile.dart';

/// Post-login UX branch for riders.
enum AuthDestination {
  /// Signed out — show landing / login.
  login,

  /// No `profiles` row yet — finish sign-up (Wave 2).
  completeRegistration,

  /// PENDING — profile or documents under review.
  pendingVerification,

  /// Submitted registration; awaiting admin approval.
  waitingApproval,

  /// Approved profile still needs ID uploads.
  documentUpload,

  /// Rejected / suspended / deactivated.
  accountBlocked,

  /// Full app shell.
  mainShell,
}

AuthDestination resolveRiderDestination({
  required bool hasSession,
  RiderProfileStatus? status,
  bool registrationSubmitted = false,
}) {
  const mockApproved = bool.fromEnvironment(
    'MOCK_RIDER_APPROVED',
    defaultValue: false,
  );
  if (mockApproved) return AuthDestination.mainShell;
  if (!hasSession) return AuthDestination.login;
  if (status == null) return AuthDestination.completeRegistration;

  switch (status) {
    case RiderProfileStatus.rejected:
    case RiderProfileStatus.suspended:
    case RiderProfileStatus.deactivated:
      return AuthDestination.accountBlocked;
    case RiderProfileStatus.approved:
      return AuthDestination.mainShell;
    case RiderProfileStatus.pending:
      if (registrationSubmitted) return AuthDestination.waitingApproval;
      return AuthDestination.documentUpload;
  }
}

AuthDestination resolveDestination(RiderProfile? profile) {
  if (profile == null) {
    return AuthDestination.completeRegistration;
  }
  return resolveRiderDestination(
    hasSession: true,
    status: profile.status,
    registrationSubmitted: profile.registrationSubmitted,
  );
}
