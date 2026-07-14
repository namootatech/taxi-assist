import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/observability/app_sentry.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/trip_auth_header.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  var _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      AppLog.d('ui.register', 'validation_failed');
      return;
    }
    setState(() => _loading = true);
    final emailDomain = _email.text.contains('@')
        ? _email.text.trim().toLowerCase().split('@').last
        : 'invalid';
    AppLog.i('ui.register', 'submit_started', {'emailDomain': emailDomain});
    AppSentry.action('rider.register.started', data: {'emailDomain': emailDomain});
    try {
      final response = await ref.read(supabaseServiceProvider).signUp(
            email: _email.text,
            password: _password.text,
            profileData: {
              'full_name': _name.text.trim(),
              'cellphone': _phone.text.trim(),
              'profile_type': 'RIDER',
            },
          );
      AppLog.i('ui.register', 'sign_up_ok', {
        'hasSession': response.session != null,
        'userId': response.user?.id,
      });
      AppSentry.action('rider.register.auth_ok');

      if (response.session == null) {
        AppLog.w('ui.register', 'needs_email_confirmation');
        if (mounted) {
          showAppToast(
            'Account created. Check your email to confirm, then sign in.',
            long: true,
          );
          Navigator.of(context).popUntil((r) => r.isFirst);
        }
        return;
      }

      await ref.read(currentRiderProvider.notifier).refresh();
      if (mounted) {
        showAppToast('Account created. Complete verification to book trips.');
        Navigator.of(context).popUntil((r) => r.isFirst);
      }
    } catch (e, st) {
      AppLog.e('ui.register', 'failed', error: e, stackTrace: st, data: {
        'emailDomain': emailDomain,
      });
      AppSentry.action(
        'rider.register.failed',
        data: {'errorType': e.runtimeType.toString()},
        level: SentryLevel.error,
      );
      await AppSentry.captureException(e, stackTrace: st, hint: 'rider.register');
      showAppToast(userFacingError(e), long: true);
    } finally {
      AppSentry.action('rider.register.completed');
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.screenPadding,
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TripAuthHeader(
                  title: 'Start riding',
                  subtitle:
                      'Create your rider account — verification is optional, so you can book right away.',
                ),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  textInputAction: TextInputAction.next,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  decoration: const InputDecoration(labelText: 'Cellphone'),
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  validator: (v) =>
                      v == null || v.trim().length < 9 ? 'Enter a valid phone' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || !v.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  textInputAction: TextInputAction.next,
                  validator: (v) =>
                      v == null || v.length < 8 ? 'At least 8 characters' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirm,
                  decoration: const InputDecoration(labelText: 'Confirm password'),
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) {
                    if (!_loading) _submit();
                  },
                  validator: (v) => v != _password.text ? 'Passwords do not match' : null,
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
                      : const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
