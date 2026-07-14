import 'package:flutter_test/flutter_test.dart';
import 'package:taxi_assist_rider/features/auth/auth_routing.dart';
import 'package:taxi_assist_rider/shared/models/rider_profile.dart';

void main() {
  group('resolveRiderDestination', () {
    test('pending riders enter the main app', () {
      expect(
        resolveRiderDestination(
          hasSession: true,
          status: RiderProfileStatus.pending,
        ),
        AuthDestination.mainShell,
      );
      expect(
        resolveRiderDestination(
          hasSession: true,
          status: RiderProfileStatus.pending,
          registrationSubmitted: true,
        ),
        AuthDestination.mainShell,
      );
    });

    test('approved riders enter the main app', () {
      expect(
        resolveRiderDestination(
          hasSession: true,
          status: RiderProfileStatus.approved,
        ),
        AuthDestination.mainShell,
      );
    });

    test('blocked riders are gated', () {
      expect(
        resolveRiderDestination(
          hasSession: true,
          status: RiderProfileStatus.suspended,
        ),
        AuthDestination.accountBlocked,
      );
    });

    test('missing profile still enters the main app', () {
      expect(resolveDestination(null), AuthDestination.mainShell);
    });
  });

  group('RiderProfile.canBook', () {
    test('pending riders can book', () {
      const profile = RiderProfile(
        id: '1',
        status: RiderProfileStatus.pending,
      );
      expect(profile.canBook, isTrue);
    });

    test('suspended riders cannot book', () {
      const profile = RiderProfile(
        id: '1',
        status: RiderProfileStatus.suspended,
      );
      expect(profile.canBook, isFalse);
    });
  });
}
