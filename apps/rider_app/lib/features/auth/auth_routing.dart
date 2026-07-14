import '../../shared/models/rider_profile.dart';

/// Post-login UX branch for riders.
///
/// Verification / document upload is **optional**. Active riders (including
/// PENDING) go straight to the main app. Only blocked accounts are gated.
enum AuthDestination {
  /// Signed out — show landing / login.
  login,

  /// No `profiles` row yet — still enter the app (profile may be provisioning).
  completeRegistration,

  /// Kept for backwards-compatible routing tests; maps to [mainShell].
  pendingVerification,

  /// Kept for backwards-compatible routing tests; maps to [mainShell].
  waitingApproval,

  /// Optional documents flow (reachable from Profile, not a hard gate).
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

  // No profile row yet — still allow the main app (trigger may be catching up).
  if (status == null) return AuthDestination.mainShell;

  switch (status) {
    case RiderProfileStatus.rejected:
    case RiderProfileStatus.suspended:
    case RiderProfileStatus.deactivated:
      return AuthDestination.accountBlocked;
    case RiderProfileStatus.approved:
    case RiderProfileStatus.pending:
      // Verification is optional; pending/submitted docs must not block the app.
      return AuthDestination.mainShell;
  }
}

AuthDestination resolveDestination(RiderProfile? profile) {
  if (profile == null) {
    return AuthDestination.mainShell;
  }
  return resolveRiderDestination(
    hasSession: true,
    status: profile.status,
    registrationSubmitted: profile.registrationSubmitted,
  );
}
