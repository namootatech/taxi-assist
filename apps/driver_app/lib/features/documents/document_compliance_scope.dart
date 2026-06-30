import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/driver_enums.dart';
import '../../shared/providers/app_providers.dart';
import '../auth/auth_routing.dart';
import '../home/go_online_notifier.dart';
import 'document_providers.dart';

/// App-wide: resume + Realtime on `documents` → refresh profile, revalidate online
/// state, invalidate document list, optional modal when forced offline for documents.
class DocumentComplianceScope extends ConsumerStatefulWidget {
  const DocumentComplianceScope({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<DocumentComplianceScope> createState() =>
      _DocumentComplianceScopeState();
}

class _DocumentComplianceScopeState extends ConsumerState<DocumentComplianceScope>
    with WidgetsBindingObserver {
  RealtimeChannel? _documentsChannel;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _subscribeDocuments());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final ch = _documentsChannel;
    if (ch != null) {
      ref.read(supabaseClientProvider).removeChannel(ch);
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _onResumeCompliance();
    }
  }

  void _subscribeDocuments() {
    final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
    if (uid == null) return;

    final old = _documentsChannel;
    if (old != null) ref.read(supabaseClientProvider).removeChannel(old);

    try {
      final ch = ref.read(documentServiceProvider).subscribeMyDocuments(
            onEvent: (_) => _onDocumentSignal(),
          );
      setState(() => _documentsChannel = ch);
    } catch (_) {
      // Signed out between frame and subscribe.
    }
  }

  Future<void> _onDocumentSignal() async {
    if (!mounted) return;
    ref.invalidate(driverDocumentsProvider);
    if (_isOnboardingWizard()) return;
    await ref.read(currentDriverProvider.notifier).refresh();
    if (!mounted) return;
    await _revalidateOnlineMaybeDialog();
  }

  Future<void> _onResumeCompliance() async {
    final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
    if (uid == null) return;
    if (!mounted) return;
    ref.invalidate(driverDocumentsProvider);
    if (_isOnboardingWizard()) return;
    await ref.read(currentDriverProvider.notifier).refresh();
    if (!mounted) return;
    await _revalidateOnlineMaybeDialog();
  }

  bool _isOnboardingWizard() {
    final profile = ref.read(currentDriverProvider).valueOrNull;
    return resolveDestination(profile) == AuthDestination.onboardingWizard;
  }

  Future<void> _revalidateOnlineMaybeDialog() async {
    if (!mounted) return;
    final wasOnline = ref.read(currentDriverProvider).valueOrNull?.onlineStatus ==
        DriverOnlineStatus.online;
    await ref.read(goOnlineNotifierProvider.notifier).revalidateIfOnline();
    if (!mounted) return;
    final nowOffline = ref.read(currentDriverProvider).valueOrNull?.onlineStatus ==
        DriverOnlineStatus.offline;
    final reasons = ref.read(goOnlineNotifierProvider).lastPrecheckReasons;
    final docRelated = reasons.any(
      (r) => r.toLowerCase().contains('document'),
    );
    if (wasOnline && nowOffline && docRelated) {
      _showDocumentOfflineDialog(reasons);
    }
  }

  void _showDocumentOfflineDialog(List<String> reasons) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Documents required'),
        content: SingleChildScrollView(
          child: Text(
            reasons.isNotEmpty
                ? reasons.join('\n')
                : 'A required document is expired or was declined. '
                    'Renew it before going online again.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AuthState>>(authProvider, (prev, next) {
      final hasSession = next.asData?.value.session != null;
      final hadSession = prev?.asData?.value.session != null;
      if (!hadSession && hasSession) {
        _subscribeDocuments();
      } else if (hadSession && !hasSession) {
        final ch = _documentsChannel;
        if (ch != null) {
          ref.read(supabaseClientProvider).removeChannel(ch);
          if (mounted) setState(() => _documentsChannel = null);
        }
      }
    });

    return widget.child;
  }
}
