String safeMessage(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  final s = error.toString();
  return s.isEmpty ? 'Something went wrong. Please try again.' : s;
}

String userFacingError(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  final s = error.toString().toLowerCase();
  if (s.contains('socketexception') ||
      s.contains('failed host lookup') ||
      s.contains('network') ||
      s.contains('connection refused')) {
    return 'Can\'t connect right now. Check your signal and try again.';
  }
  if (s.contains('timeout')) {
    return 'That took too long. Try again in a moment.';
  }
  if (s.contains('row-level security') || s.contains('rls')) {
    return 'We could not save this with your account. Contact support if it continues.';
  }
  if (s.contains('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (s.contains('profile not approved')) {
    return 'Your profile is not approved yet. Complete verification first.';
  }
  return 'Something went wrong. Please try again.';
}
