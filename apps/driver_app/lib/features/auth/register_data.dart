/// Draft registration payload carried into simulated OTP step.
class RegisterDraft {
  const RegisterDraft({
    required this.fullName,
    required this.cellphone,
    required this.idNumber,
    required this.dob,
    required this.email,
    required this.password,
  });

  final String fullName;
  final String cellphone;
  final String idNumber;
  final DateTime dob;
  final String email;
  final String password;

  Map<String, dynamic> toProfileRow() {
    final now = DateTime.now();
    var age = now.year - dob.year;
    if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) {
      age--;
    }
    return {
      'full_name': fullName.trim(),
      'cellphone': cellphone.trim(),
      'id_number': idNumber.trim(),
      'dob': dob.toIso8601String().split('T').first,
      'age': age,
    };
  }
}
