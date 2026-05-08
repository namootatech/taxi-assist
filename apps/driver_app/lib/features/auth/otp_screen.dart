import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import 'register_data.dart';

/// Simulated cellphone OTP — no SMS (Prompt 2). Use `123456` or any 6 digits.
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.draft});

  final RegisterDraft draft;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _code = TextEditingController();
  var _loading = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      showAppToast('Enter the 6-digit code');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(supabaseServiceProvider).signUp(
            email: widget.draft.email,
            password: widget.draft.password,
            profileData: widget.draft.toProfileRow(),
          );
      await ref.read(currentDriverProvider.notifier).refresh();
      showAppToast(
        'Account created. Confirm your email if you\'re asked — then sign in.',
        long: true,
      );
      if (mounted) {
        Navigator.of(context).popUntil((r) => r.isFirst);
      }
    } catch (e) {
      showAppToast(safeMessage(e), long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _resendSimulated() {
    showAppToast('OTP simulated — no SMS sent.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify phone')),
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Enter the code we would send to ${widget.draft.cellphone}. '
                'Pilot mode: use 123456 or any six digits.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _code,
                decoration: const InputDecoration(
                  labelText: '6-digit code',
                ),
                keyboardType: TextInputType.number,
                maxLength: 6,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _loading ? null : _verify,
                child: _loading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Verify and create account'),
              ),
              TextButton(
                onPressed: _loading ? null : _resendSimulated,
                child: const Text('Resend code (simulated)'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
