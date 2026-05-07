// Lightweight SA-oriented checks (business-logic §6). Server remains authoritative.

bool isValidSaCellphone(String raw) {
  final d = raw.replaceAll(RegExp(r'\s'), '');
  if (d.isEmpty) return false;
  final n = d.startsWith('+27') ? d.substring(3) : (d.startsWith('0') ? d.substring(1) : d);
  return RegExp(r'^[1-9]\d{8}$').hasMatch(n);
}

bool isAtLeastAge(DateTime dob, int minYears) {
  final now = DateTime.now();
  var age = now.year - dob.year;
  if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) {
    age--;
  }
  return age >= minYears;
}

/// 13-digit SA ID format only; full Luhn/DOB embedded checks can be added later.
bool isLikelySaIdNumber(String raw) {
  final s = raw.replaceAll(RegExp(r'\s'), '');
  return RegExp(r'^\d{13}$').hasMatch(s);
}
