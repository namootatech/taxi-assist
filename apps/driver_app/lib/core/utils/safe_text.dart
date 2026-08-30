import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_session_recovery.dart';

// User-facing error string fallback (may include provider messages).
String safeMessage(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  if (isInvalidRefreshTokenError(error)) {
    return 'Your session expired. Please sign in again.';
  }
  if (error is AuthException) {
    final mapped = _mapAuthMessage(error);
    if (mapped != null) return mapped;
  }
  final s = error.toString();
  return s.isEmpty ? 'Something went wrong. Please try again.' : s;
}

/// Driver-facing errors — no stack traces, table names, or backend jargon.
String userFacingError(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  if (isInvalidRefreshTokenError(error)) {
    return 'Your session expired. Please sign in again.';
  }
  if (error is AuthException) {
    final mapped = _mapAuthMessage(error);
    if (mapped != null) return mapped;
  }
  final s = error.toString().toLowerCase();
  if (s.contains('socketexception') ||
      s.contains('failed host lookup') ||
      s.contains('network') ||
      s.contains('connection refused') ||
      s.contains('network is unreachable')) {
    return 'Can\'t connect right now. Check your signal and try again.';
  }
  if (s.contains('timeout')) {
    return 'That took too long. Try again in a moment.';
  }
  if (s.contains('row-level security') ||
      s.contains('violates row-level') ||
      s.contains('rls')) {
    return 'We could not save this upload with your account. If it keeps happening, contact support.';
  }
  if (s.contains('bucket') && s.contains('not found')) {
    return 'File storage is not set up yet. Please contact support.';
  }
  if (s.contains('storage') &&
      (s.contains('403') || s.contains('unauthorized'))) {
    return 'Upload was denied. Sign out and back in, or try again.';
  }
  return 'Something went wrong. Please try again.';
}

String? _mapAuthMessage(AuthException error) {
  final message = error.message.toLowerCase();
  final code = (error.code ?? '').toLowerCase();
  if (message.contains('invalid login credentials') ||
      code == 'invalid_credentials') {
    return 'Email or password is incorrect.';
  }
  if (message.contains('email not confirmed') ||
      code == 'email_not_confirmed') {
    return 'Confirm your email before signing in.';
  }
  return null;
}
