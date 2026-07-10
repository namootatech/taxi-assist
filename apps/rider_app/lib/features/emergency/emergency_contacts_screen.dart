import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

class EmergencyContactsScreen extends ConsumerStatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  ConsumerState<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends ConsumerState<EmergencyContactsScreen> {
  List<Map<String, dynamic>> _contacts = [];
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await ref.read(supabaseServiceProvider).fetchEmergencyContacts();
    if (mounted) {
      setState(() {
        _contacts = rows;
        _loading = false;
      });
    }
  }

  Future<void> _addOrEdit([Map<String, dynamic>? existing]) async {
    if (_contacts.length >= 5 && existing == null) {
      showAppToast('Maximum 5 emergency contacts');
      return;
    }
    final name = TextEditingController(text: existing?['full_name'] as String?);
    final phone = TextEditingController(text: existing?['cellphone'] as String?);
    final relation = TextEditingController(text: existing?['relationship'] as String?);

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Add contact' : 'Edit contact'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
            TextField(controller: relation, decoration: const InputDecoration(labelText: 'Relationship')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
        ],
      ),
    );

    if (ok != true) return;

    await ref.read(supabaseServiceProvider).upsertEmergencyContact({
      if (existing != null) 'contact_id': existing['contact_id'],
      'full_name': name.text.trim(),
      'cellphone': phone.text.trim(),
      'relationship': relation.text.trim(),
    });
    await _load();
  }

  Future<void> _delete(String contactId) async {
    await ref.read(supabaseServiceProvider).deleteEmergencyContact(contactId);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency contacts'),
        actions: [
          IconButton(
            onPressed: _contacts.length >= 5 ? null : () => _addOrEdit(),
            icon: const Icon(Icons.add),
            tooltip: 'Add contact',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: AppSpacing.screenPadding,
              itemCount: _contacts.length,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (context, i) {
                final c = _contacts[i];
                return ListTile(
                  title: Text('${c['full_name']}'),
                  subtitle: Text('${c['cellphone']} · ${c['relationship'] ?? ''}'),
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'edit') _addOrEdit(c);
                      if (v == 'delete') _delete('${c['contact_id']}');
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
