import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

/// Ops can change this number or move to remote config later.
const String kDriverSupportPhoneDisplay = '0800 123 456';
const String kDriverSupportPhoneE164 = '+27800123456';

/// PRD §5.x: ticket form, FAQ, dial support.
class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _subject = TextEditingController();
  final _body = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final sub = _subject.text.trim();
    final body = _body.text.trim();
    if (sub.length < 3) {
      showAppToast('Please enter a subject (at least 3 characters).');
      return;
    }
    if (body.length < 10) {
      showAppToast('Please describe your issue (at least 10 characters).');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(supabaseServiceProvider).insertSupportTicket(
            subject: sub,
            body: body,
          );
      if (!mounted) return;
      showAppToast('Ticket sent. We will get back to you.');
      _subject.clear();
      _body.clear();
    } catch (e) {
      if (mounted) showAppToast('Could not send: $e', long: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _callSupport() async {
    final uri = Uri.parse('tel:$kDriverSupportPhoneE164');
    final ok = await launchUrl(uri);
    if (!ok && mounted) {
      showAppToast('Could not open the phone app.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      body: ListView(
        padding: AppSpacing.screenPadding.copyWith(bottom: 32),
        children: [
          Text(
            'Contact back-office',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _subject,
            decoration: const InputDecoration(
              labelText: 'Subject',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'Message',
              alignLabelWithHint: true,
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send message'),
          ),
          const SizedBox(height: 24),
          FilledButton.tonalIcon(
            onPressed: _callSupport,
            icon: const Icon(Icons.phone_outlined),
            label: const Text('Call support'),
          ),
          const SizedBox(height: 8),
          Text(
            kDriverSupportPhoneDisplay,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 28),
          Text('FAQ', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          const _FaqTile(
            q: 'When will my documents be reviewed?',
            a: 'Our team usually reviews uploads within a few business days. You will see status updates on the Documents screen.',
          ),
          const _FaqTile(
            q: 'Why can I not go online?',
            a: 'You need an approved profile, linked approved vehicle, valid critical documents, and completed training. The home screen lists any blockers.',
          ),
          const _FaqTile(
            q: 'When do I get paid?',
            a: 'Payouts are processed by back-office according to the payout schedule. Completed trip totals here are for your reference; paid amounts appear under Payout history.',
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  const _FaqTile({required this.q, required this.a});

  final String q;
  final String a;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        title: Text(q),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(a, style: Theme.of(context).textTheme.bodyMedium),
            ),
          ),
        ],
      ),
    );
  }
}
