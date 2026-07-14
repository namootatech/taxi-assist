import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

String safeMessage(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  final s = error.toString();
  return s.isEmpty ? 'Something went wrong. Please try again.' : s;
}

/// Maps exceptions to rider-facing copy. In debug, appends the raw error so
/// signup/login failures are not a black box in logcat + toast.
String userFacingError(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';

  if (error is AuthException) {
    final mapped = _mapAuthException(error);
    return _withDebugDetail(mapped, error);
  }

  if (error is PostgrestException) {
    final mapped = _mapPostgrestException(error);
    return _withDebugDetail(mapped, error);
  }

  final s = error.toString().toLowerCase();
  if (s.contains('socketexception') ||
      s.contains('failed host lookup') ||
      s.contains('network') ||
      s.contains('connection refused') ||
      s.contains('clientexception')) {
    return _withDebugDetail(
      'Can\'t connect right now. Check your signal and try again.',
      error,
    );
  }
  if (s.contains('timeout')) {
    return _withDebugDetail(
      'That took too long. Try again in a moment.',
      error,
    );
  }
  if (s.contains('row-level security') ||
      s.contains('rls') ||
      s.contains('42501')) {
    return _withDebugDetail(
      'We could not save this with your account. Contact support if it continues.',
      error,
    );
  }
  if (s.contains('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (s.contains('profile not approved')) {
    return 'Your profile is not approved yet. Complete verification first.';
  }
  if (s.contains('user already registered') ||
      s.contains('already been registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (s.contains('weak password') || s.contains('password should be')) {
    return 'Choose a stronger password (at least 8 characters).';
  }
  if (s.contains('email rate limit') || s.contains('over_email_send_rate')) {
    return 'Too many emails sent. Wait a minute and try again.';
  }

  return _withDebugDetail(
    'Something went wrong. Please try again.',
    error,
  );
}

String _mapAuthException(AuthException error) {
  final message = error.message.toLowerCase();
  final code = (error.code ?? '').toLowerCase();

  if (message.contains('invalid login credentials') ||
      code == 'invalid_credentials') {
    return 'Email or password is incorrect.';
  }
  if (message.contains('user already registered') ||
      message.contains('already been registered') ||
      code == 'user_already_exists') {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (message.contains('email not confirmed') ||
      code == 'email_not_confirmed') {
    return 'Confirm your email before signing in.';
  }
  if (message.contains('weak password') ||
      code == 'weak_password' ||
      error is AuthWeakPasswordException) {
    return 'Choose a stronger password (at least 8 characters).';
  }
  if (message.contains('rate limit') ||
      message.contains('email rate') ||
      code.contains('rate_limit')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (message.contains('signup is disabled') ||
      code == 'signup_disabled') {
    return 'New accounts are temporarily closed. Try again later.';
  }
  if (message.trim().isNotEmpty) {
    // Prefer the server message when we don't have a friendlier mapping.
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

String _mapPostgrestException(PostgrestException error) {
  final message = error.message.toLowerCase();
  final code = (error.code ?? '').toLowerCase();
  if (message.contains('row-level security') ||
      message.contains('violates row-level security') ||
      code == '42501') {
    return 'We could not save your profile. Try signing in, or contact support.';
  }
  if (message.contains('duplicate') ||
      code == '23505') {
    return 'An account with these details already exists. Sign in instead.';
  }
  if (error.message.trim().isNotEmpty) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

String _withDebugDetail(String friendly, Object error) {
  if (!kDebugMode) return friendly;
  final detail = error.toString();
  if (detail.isEmpty || friendly.contains(detail)) return friendly;
  return '$friendly\n($detail)';
}
