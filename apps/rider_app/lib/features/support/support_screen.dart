import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _subject = TextEditingController();
  final _body = TextEditingController();
  var _loading = false;
  List<Map<String, dynamic>> _tickets = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final rows = await ref.read(supabaseServiceProvider).fetchSupportTickets();
    if (mounted) setState(() => _tickets = rows);
  }

  Future<void> _submit() async {
    if (_subject.text.trim().isEmpty || _body.text.trim().isEmpty) {
      showAppToast('Subject and message required');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(supabaseServiceProvider).insertSupportTicket(
            subject: _subject.text,
            body: _body.text,
          );
      _subject.clear();
      _body.clear();
      showAppToast('Ticket submitted');
      await _load();
    } catch (e) {
      showAppToast('$e', long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      body: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          TextField(
            controller: _subject,
            decoration: const InputDecoration(labelText: 'Subject'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            decoration: const InputDecoration(labelText: 'Message'),
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: const Text('Submit ticket'),
          ),
          const Divider(height: 32),
          Text('Your tickets', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_tickets.isEmpty)
            const Text('No tickets yet')
          else
            ..._tickets.map(
              (t) => ListTile(
                title: Text('${t['subject']}'),
                subtitle: Text('${t['status']} · ${t['created_at']}'),
              ),
            ),
        ],
      ),
    );
  }
}
