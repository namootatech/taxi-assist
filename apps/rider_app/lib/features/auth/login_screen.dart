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
import 'forgot_password_screen.dart';
import 'register_screen.dart';

/// Email/password sign-in for riders.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      AppLog.d('ui.login', 'validation_failed');
      return;
    }
    setState(() => _loading = true);
    final emailDomain = _email.text.contains('@')
        ? _email.text.trim().toLowerCase().split('@').last
        : 'invalid';
    AppLog.i('ui.login', 'submit_started', {'emailDomain': emailDomain});
    try {
      AppSentry.action('rider.login.started');
      await ref.read(supabaseServiceProvider).signIn(
            email: _email.text,
            password: _password.text,
          );
      AppLog.i('ui.login', 'auth_ok');
      AppSentry.action('rider.login.auth_ok');
      await ref.read(currentRiderProvider.notifier).refresh();
      if (mounted) Navigator.of(context).pop();
    } catch (e, st) {
      AppLog.e('ui.login', 'failed', error: e, stackTrace: st, data: {
        'emailDomain': emailDomain,
      });
      AppSentry.action(
        'rider.login.failed',
        data: {'errorType': e.runtimeType.toString()},
        level: SentryLevel.error,
      );
      await AppSentry.captureException(e, stackTrace: st, hint: 'rider.login');
      showAppToast(userFacingError(e), long: true);
    } finally {
      AppSentry.action('rider.login.completed');
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.screenPadding,
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TripAuthHeader(
                  title: 'Welcome back',
                  subtitle: 'Sign in to book trips and manage your Taxi Assist wallet.',
                ),
                TextFormField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Enter your email';
                    }
                    if (!v.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) {
                    if (!_loading) _submit();
                  },
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Enter your password';
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    ),
                    child: const Text('Forgot password?'),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => const RegisterScreen(),
                    ),
                  ),
                  child: const Text('Create an account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
