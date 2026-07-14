import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  var _loading = false;
  var _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (!email.contains('@')) {
      AppLog.d('ui.forgotPassword', 'invalid_email');
      showAppToast('Enter a valid email');
      return;
    }
    setState(() => _loading = true);
    final emailDomain = email.split('@').last;
    AppLog.i('ui.forgotPassword', 'submit_started', {'emailDomain': emailDomain});
    try {
      await ref.read(supabaseServiceProvider).resetPasswordForEmail(email);
      AppLog.i('ui.forgotPassword', 'sent', {'emailDomain': emailDomain});
      setState(() => _sent = true);
    } catch (e, st) {
      AppLog.e('ui.forgotPassword', 'failed',
          error: e, stackTrace: st, data: {'emailDomain': emailDomain});
      showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: _sent
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.mark_email_read_outlined, size: 48),
                    const SizedBox(height: 16),
                    Text(
                      'Check your email for a reset link.',
                      style: Theme.of(context).textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Back to sign in'),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _email,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) {
                        if (!_loading) _submit();
                      },
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Send reset link'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
