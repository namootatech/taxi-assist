import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/sa_validation.dart';
import 'otp_screen.dart';
import 'register_data.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _id = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  DateTime? _dob;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _id.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial = _dob ?? DateTime(now.year - 25);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1940),
      lastDate: now,
    );
    if (picked != null) setState(() => _dob = picked);
  }

  void _continueToOtp() {
    if (!_formKey.currentState!.validate()) return;
    if (_dob == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select your date of birth')),
      );
      return;
    }
    if (!isAtLeastAge(_dob!, 21)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must be at least 21 years old.')),
      );
      return;
    }
    final draft = RegisterDraft(
      fullName: _name.text,
      cellphone: _phone.text,
      idNumber: _id.text,
      dob: _dob!,
      email: _email.text.trim(),
      password: _password.text,
    );
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OtpScreen(draft: draft),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dobLabel = _dob == null
        ? 'Date of birth'
        : DateFormat.yMMMd().format(_dob!);

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.screenPadding,
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(
                    labelText: 'Full name',
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  decoration: const InputDecoration(
                    labelText: 'Cellphone (e.g. 082… or +2782…)',
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Required';
                    if (!isValidSaCellphone(v)) {
                      return 'Enter a valid SA cellphone number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _id,
                  decoration: const InputDecoration(
                    labelText: 'ID number (13 digits)',
                  ),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Required';
                    if (!isLikelySaIdNumber(v)) return 'Enter 13 digits';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _pickDob,
                  child: Text(dobLabel),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Required';
                    if (!v.contains('@')) return 'Invalid email';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  validator: (v) {
                    if (v == null || v.length < 6) {
                      return 'At least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirm,
                  decoration: const InputDecoration(
                    labelText: 'Confirm password',
                  ),
                  obscureText: true,
                  validator: (v) {
                    if (v != _password.text) return 'Passwords do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _continueToOtp,
                  child: const Text('Continue — verify phone (simulated)'),
                ),
                const SizedBox(height: 8),
                Text(
                  'OTP is simulated for pilot: any 6-digit code is accepted.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
