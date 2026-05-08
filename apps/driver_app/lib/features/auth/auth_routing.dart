import '../../shared/models/driver_enums.dart';
import '../../shared/models/driver_profile.dart';

/// Post-login UX branch (Prompt 2 + PRD).
enum AuthDestination {
  /// No `profiles` row yet — finish sign-up / retry.
  completeRegistration,

  /// PENDING — full registration wizard (not yet submitted).
  onboardingWizard,

  /// PENDING — submitted; waiting on document/profile review (Realtime).
  onboardingAwaitingReview,

  /// Driver approved but must link vehicle.
  onboardingLinkVehicle,

  /// Driver approved + vehicle linked, but training still required.
  trainingRequired,

  /// Rejected / suspended / deactivated — show status screen.
  accountBlocked,

  /// Full app (approved + vehicle linked).
  mainShell,
}

/// Pure routing from profile + mock flag (test-friendly).
AuthDestination resolveDestination(DriverProfile? profile) {
  const mockApproved = bool.fromEnvironment(
    'MOCK_DRIVER_APPROVED',
    defaultValue: false,
  );
  if (mockApproved) return AuthDestination.mainShell;

  if (profile == null) return AuthDestination.completeRegistration;

  switch (profile.status) {
    case DriverProfileStatus.rejected:
    case DriverProfileStatus.suspended:
    case DriverProfileStatus.deactivated:
      return AuthDestination.accountBlocked;
    case DriverProfileStatus.pending:
      if (profile.registrationSubmitted) {
        return AuthDestination.onboardingAwaitingReview;
      }
      return AuthDestination.onboardingWizard;
    case DriverProfileStatus.approved:
      final vid = profile.currentVehicleId;
      if (vid == null || vid.isEmpty) {
        return AuthDestination.onboardingLinkVehicle;
      }
      if (!profile.trainingCompleted) {
        return AuthDestination.trainingRequired;
      }
      return AuthDestination.mainShell;
  }
}
