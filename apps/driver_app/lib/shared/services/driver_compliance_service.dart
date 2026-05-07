import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/driver_enums.dart';
import '../models/driver_profile.dart';

/// Reserved for document + vehicle approval depth (business-logic.md).
///
/// Main shell gating for Prompt 2 uses [DriverProfile] in [resolveDestination].
class DriverComplianceService {
  DriverComplianceService(this._client);

  final SupabaseClient _client;

  static const mockApproved = bool.fromEnvironment(
    'MOCK_DRIVER_APPROVED',
    defaultValue: false,
  );

  /// Future: vehicle APPROVED + critical docs non-expired. Not used in Prompt 2 UI routing.
  Future<bool> isReadyForMainShell(String userId, DriverProfile? profile) async {
    if (mockApproved) return true;
    if (_client.auth.currentUser?.id != userId) return false;
    if (profile == null) return false;
    if (profile.status != DriverProfileStatus.approved) return false;
    final vid = profile.currentVehicleId;
    return vid != null && vid.isNotEmpty;
  }
}
