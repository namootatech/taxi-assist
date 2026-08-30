import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:taxi_assist_driver/core/utils/supabase_session_recovery.dart';

void main() {
  test('detects refresh_token_not_found AuthApiException', () {
    final error = AuthApiException(
      'Invalid Refresh Token: Refresh Token Not Found',
      statusCode: '400',
      code: 'refresh_token_not_found',
    );
    expect(isInvalidRefreshTokenError(error), isTrue);
  });

  test('ignores unrelated auth errors', () {
    const error = AuthException('Invalid login credentials');
    expect(isInvalidRefreshTokenError(error), isFalse);
  });
}
