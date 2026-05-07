// User-facing error string fallback.
String safeMessage(Object? error) {
  if (error == null) return 'Something went wrong. Please try again.';
  final s = error.toString();
  return s.isEmpty ? 'Something went wrong. Please try again.' : s;
}
