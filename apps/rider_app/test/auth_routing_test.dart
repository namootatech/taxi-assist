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
    test('pending riders need photo and phone to book', () {
      const profile = RiderProfile(
        id: '1',
        status: RiderProfileStatus.pending,
      );
      expect(profile.canBook, isFalse);
      expect(profile.bookingBlockedReason, contains('profile photo'));
    });

    test('complete pending riders can book', () {
      const profile = RiderProfile(
        id: '1',
        status: RiderProfileStatus.pending,
        cellphone: '0821234567',
        selfieUrl: 'uid/rider/photo.jpg',
      );
      expect(profile.canBook, isTrue);
      expect(profile.bookingBlockedReason, isNull);
    });

    test('suspended riders cannot book', () {
      const profile = RiderProfile(
        id: '1',
        status: RiderProfileStatus.suspended,
        cellphone: '0821234567',
        selfieUrl: 'uid/rider/photo.jpg',
      );
      expect(profile.canBook, isFalse);
    });
  });
}
