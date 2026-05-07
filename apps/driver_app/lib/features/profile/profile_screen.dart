import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/bank_details.dart';
import '../../shared/models/driver_enums.dart';
import '../../shared/models/driver_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../support/support_screen.dart';
import 'profile_providers.dart';

/// PRD §5.5: profile, linked vehicle, editable when approved.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  static bool _canEditProfile(DriverProfile? p) {
    if (p == null) return false;
    return p.status == DriverProfileStatus.approved;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncProfile = ref.watch(currentDriverProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: asyncProfile.when(
        data: (profile) {
          if (profile == null) {
            return const Center(child: Text('Not signed in.'));
          }
          return _ProfileBody(
            profile: profile,
            canEdit: _canEditProfile(profile),
            onSaved: () {
              ref.invalidate(currentDriverProvider);
              ref.invalidate(linkedVehicleProvider);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}

class _ProfileBody extends ConsumerStatefulWidget {
  const _ProfileBody({
    required this.profile,
    required this.canEdit,
    required this.onSaved,
  });

  final DriverProfile profile;
  final bool canEdit;
  final VoidCallback onSaved;

  @override
  ConsumerState<_ProfileBody> createState() => _ProfileBodyState();
}

class _ProfileBodyState extends ConsumerState<_ProfileBody> {
  late final TextEditingController _fullName;
  late final TextEditingController _cellphone;
  late final TextEditingController _email;
  late final TextEditingController _residential;
  late final TextEditingController _idNumber;
  late final TextEditingController _licenseNumber;
  late final TextEditingController _licenseCode;
  late final TextEditingController _pdpNumber;
  late final TextEditingController _pdpExpiry;
  late final TextEditingController _dob;
  late final TextEditingController _bankHolder;
  late final TextEditingController _bankName;
  late final TextEditingController _bankAccount;
  late final TextEditingController _bankBranch;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    final b = p.bankDetails ?? const BankDetails();
    _fullName = TextEditingController(text: p.fullName ?? '');
    _cellphone = TextEditingController(text: p.cellphone ?? '');
    _email = TextEditingController(text: p.email ?? '');
    _residential = TextEditingController(text: p.residentialAddress ?? '');
    _idNumber = TextEditingController(text: p.idNumber ?? '');
    _licenseNumber = TextEditingController(text: p.licenseNumber ?? '');
    _licenseCode = TextEditingController(text: p.licenseCode ?? '');
    _pdpNumber = TextEditingController(text: p.pdpNumber ?? '');
    _pdpExpiry = TextEditingController(
      text: p.pdpExpiry != null ? p.pdpExpiry!.toIso8601String().split('T').first : '',
    );
    _dob = TextEditingController(
      text: p.dob != null ? p.dob!.toIso8601String().split('T').first : '',
    );
    _bankHolder = TextEditingController(text: b.accountHolder ?? '');
    _bankName = TextEditingController(text: b.bankName ?? '');
    _bankAccount = TextEditingController(text: b.accountNumber ?? '');
    _bankBranch = TextEditingController(text: b.branchCode ?? '');
  }

  @override
  void dispose() {
    _fullName.dispose();
    _cellphone.dispose();
    _email.dispose();
    _residential.dispose();
    _idNumber.dispose();
    _licenseNumber.dispose();
    _licenseCode.dispose();
    _pdpNumber.dispose();
    _pdpExpiry.dispose();
    _dob.dispose();
    _bankHolder.dispose();
    _bankName.dispose();
    _bankAccount.dispose();
    _bankBranch.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!widget.canEdit || _saving) return;
    setState(() => _saving = true);
    try {
      final bank = BankDetails(
        accountHolder: _bankHolder.text.trim().isEmpty ? null : _bankHolder.text.trim(),
        bankName: _bankName.text.trim().isEmpty ? null : _bankName.text.trim(),
        accountNumber:
            _bankAccount.text.trim().isEmpty ? null : _bankAccount.text.trim(),
        branchCode: _bankBranch.text.trim().isEmpty ? null : _bankBranch.text.trim(),
      );
      final patch = <String, dynamic>{
        'full_name': _fullName.text.trim(),
        'cellphone': _cellphone.text.trim(),
        'email': _email.text.trim(),
        'residential_address': _residential.text.trim(),
        'id_number': _idNumber.text.trim(),
        'license_number': _licenseNumber.text.trim(),
        'license_code': _licenseCode.text.trim(),
        'pdp_number': _pdpNumber.text.trim(),
        if (_pdpExpiry.text.trim().isNotEmpty) 'pdp_expiry': _pdpExpiry.text.trim(),
        if (_dob.text.trim().isNotEmpty) 'dob': _dob.text.trim(),
        'bank_details': bank.toJson(),
      };
      await ref.read(supabaseServiceProvider).updateProfile(patch);
      if (mounted) showAppToast('Profile updated');
      widget.onSaved();
    } catch (e) {
      if (mounted) showAppToast('Could not save: $e', long: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    final scheme = Theme.of(context).colorScheme;
    final vehicleAsync = ref.watch(linkedVehicleProvider);

    return ListView(
      padding: AppSpacing.screenPadding.copyWith(bottom: 32),
      children: [
        if (!widget.canEdit)
          Card(
            color: scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                p.status == DriverProfileStatus.approved
                    ? 'Your account cannot be edited in this state.'
                    : 'Edits are available once your driver profile is approved.',
                style: TextStyle(color: scheme.onErrorContainer),
              ),
            ),
          ),
        if (!widget.canEdit) const SizedBox(height: 12),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Status'),
          subtitle: Text(profileStatusToApi(p.status)),
        ),
        const Divider(),
        Text('Personal', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _field(context, label: 'Full name', controller: _fullName, readOnly: !widget.canEdit),
        _field(context, label: 'Cellphone', controller: _cellphone, readOnly: !widget.canEdit),
        _field(context, label: 'Email', controller: _email, readOnly: !widget.canEdit),
        _field(context, label: 'Residential address', controller: _residential, readOnly: !widget.canEdit),
        _field(context, label: 'ID number', controller: _idNumber, readOnly: !widget.canEdit),
        _field(context, label: 'Date of birth (YYYY-MM-DD)', controller: _dob, readOnly: !widget.canEdit),
        _field(context, label: 'Licence number', controller: _licenseNumber, readOnly: !widget.canEdit),
        _field(context, label: 'Licence code', controller: _licenseCode, readOnly: !widget.canEdit),
        _field(context, label: 'PDP number', controller: _pdpNumber, readOnly: !widget.canEdit),
        _field(context, label: 'PDP expiry (YYYY-MM-DD)', controller: _pdpExpiry, readOnly: !widget.canEdit),
        const SizedBox(height: 16),
        Text('Bank details', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _field(context, label: 'Account holder', controller: _bankHolder, readOnly: !widget.canEdit),
        _field(context, label: 'Bank name', controller: _bankName, readOnly: !widget.canEdit),
        _field(context, label: 'Account number', controller: _bankAccount, readOnly: !widget.canEdit),
        _field(context, label: 'Branch code', controller: _bankBranch, readOnly: !widget.canEdit),
        const SizedBox(height: 16),
        Text('Linked vehicle', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        vehicleAsync.when(
          data: (v) {
            if (v == null) {
              return const Card(
                child: ListTile(
                  title: Text('No vehicle linked'),
                  subtitle: Text('Complete onboarding and link a vehicle to go online.'),
                ),
              );
            }
            final reg = '${v['registration_number'] ?? ''}';
            final make = '${v['make'] ?? ''} ${v['model'] ?? ''}'.trim();
            final status = '${v['status'] ?? ''}';
            return Card(
              child: ListTile(
                title: Text(make.isEmpty ? 'Vehicle' : make),
                subtitle: Text('$reg · $status'),
              ),
            );
          },
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text('Vehicle: $e'),
        ),
        const SizedBox(height: 24),
        if (widget.canEdit)
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save changes'),
          ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SupportScreen()),
            );
          },
          icon: const Icon(Icons.support_agent_outlined),
          label: const Text('Support'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () {
            ref.read(mainShellTabIndexProvider.notifier).state = 3;
          },
          icon: const Icon(Icons.folder_outlined),
          label: const Text('Documents'),
        ),
        const SizedBox(height: 16),
        FilledButton.tonal(
          onPressed: () async {
            await ref.read(supabaseServiceProvider).signOut();
            ref.invalidate(currentDriverProvider);
          },
          child: const Text('Sign out'),
        ),
      ],
    );
  }

  Widget _field(
    BuildContext context, {
    required String label,
    required TextEditingController controller,
    required bool readOnly,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: TextField(
        controller: controller,
        readOnly: readOnly,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }
}
