import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../../core/observability/app_sentry.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  var _loading = false;

  Future<void> _exchangeSession(String jwt) async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      AppSentry.action('driver.login.started');

      await ref.read(supabaseServiceProvider).signInWithClerkToken(token: jwt);

      AppSentry.action('driver.login.auth_ok');
      try {
        await ref.read(currentDriverProvider.notifier).refresh();
      } catch (e, st) {
        // If auth succeeded, treat profile refresh failures as non-blocking.
        await AppSentry.captureException(
          e,
          stackTrace: st,
          hint: 'driver.login.profile_refresh_failed',
        );
      }
      AppSentry.action('driver.login.completed');
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e, st) {
      AppSentry.action(
        'driver.login.failed',
        data: {'errorType': e.runtimeType.toString()},
        level: SentryLevel.error,
      );
      await AppSentry.captureException(e, stackTrace: st, hint: 'driver.login');
      showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: ClerkErrorListener(
          child: ClerkAuthBuilder(
            signedOutBuilder: (context, authState) {
              return const ClerkAuthentication();
            },
            signedInBuilder: (context, authState) {
              final auth = ClerkAuth.of(context);
              return FutureBuilder(
                future: auth.sessionToken(),
                builder: (context, snapshot) {
                  final token = snapshot.data?.jwt;
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (token == null || token.isEmpty) {
                    return const Center(child: Text('Could not load session token.'));
                  }
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _exchangeSession(token);
                  });
                  return const Center(child: CircularProgressIndicator());
                },
              );
            },
          ),
        ),
      ),
    );
  }
}
