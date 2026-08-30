import 'package:supabase_flutter/supabase_flutter.dart';

/// True for expired/revoked/missing refresh tokens that should clear local auth.
bool isInvalidRefreshTokenError(Object error) {
  if (error is AuthException) {
    final code = (error.code ?? '').toLowerCase();
    final message = error.message.toLowerCase();
    if (code == 'refresh_token_not_found' ||
        code == 'invalid_grant' ||
        code.contains('refresh_token')) {
      return true;
    }
    if (message.contains('refresh token') ||
        message.contains('invalid refresh')) {
      return true;
    }
  }
  final s = error.toString().toLowerCase();
  return s.contains('refresh_token_not_found') ||
      s.contains('invalid refresh token') ||
      s.contains('refresh token not found');
}

/// After [Supabase.initialize], drop a locally saved session whose refresh
/// token the server no longer accepts (common after uninstall/reinstall,
/// shared-device installs, or long idle).
Future<void> recoverSupabaseSessionOnLaunch() async {
  final auth = Supabase.instance.client.auth;
  if (auth.currentSession == null) return;

  try {
    await auth.refreshSession();
  } catch (e) {
    if (isInvalidRefreshTokenError(e)) {
      try {
        await auth.signOut(scope: SignOutScope.local);
      } catch (_) {
        // Local clear best-effort.
      }
    }
  }
}
