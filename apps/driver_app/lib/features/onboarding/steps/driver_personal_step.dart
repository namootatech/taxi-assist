import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../onboarding_notifier.dart';
import '../onboarding_pick_helpers.dart';

class DriverPersonalStep extends ConsumerStatefulWidget {
  const DriverPersonalStep({super.key, required this.profileId});

  final String profileId;

  @override
  ConsumerState<DriverPersonalStep> createState() =>
      _DriverPersonalStepState();
}

class _DriverPersonalStepState extends ConsumerState<DriverPersonalStep> {
  late final TextEditingController _name;
  late final TextEditingController _idNumber;
  late final TextEditingController _address;
  late final TextEditingController _license;
  late final TextEditingController _code;
  late final TextEditingController _pdp;
  late final TextEditingController _bankHolder;
  late final TextEditingController _bankName;
  late final TextEditingController _bankAcct;
  late final TextEditingController _bankBranch;

  final _df = DateFormat.yMMMd();

  @override
  void initState() {
    super.initState();
    _name = TextEditingController();
    _idNumber = TextEditingController();
    _address = TextEditingController();
    _license = TextEditingController();
    _code = TextEditingController();
    _pdp = TextEditingController();
    _bankHolder = TextEditingController();
    _bankName = TextEditingController();
    _bankAcct = TextEditingController();
    _bankBranch = TextEditingController();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final s = ref.read(onboardingNotifierProvider(widget.profileId));
      _name.text = s.fullName;
      _idNumber.text = s.idNumber;
      _address.text = s.residentialAddress;
      _license.text = s.licenseNumber;
      _code.text = s.licenseCode;
      _pdp.text = s.pdpNumber;
      _bankHolder.text = s.bankAccountHolder;
      _bankName.text = s.bankName;
      _bankAcct.text = s.bankAccountNumber;
      _bankBranch.text = s.bankBranchCode;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _idNumber.dispose();
    _address.dispose();
    _license.dispose();
    _code.dispose();
    _pdp.dispose();
    _bankHolder.dispose();
    _bankName.dispose();
    _bankAcct.dispose();
    _bankBranch.dispose();
    super.dispose();
  }

  /// Keeps typed form values in [OnboardingState] so rebuilds / picker return do not wipe fields.
  void _persistDraftToNotifier() {
    final st = ref.read(onboardingNotifierProvider(widget.profileId));
    ref.read(onboardingNotifierProvider(widget.profileId).notifier).savePersonalFromForm(
          fullName: _name.text,
          idNumber: _idNumber.text,
          dob: st.dob,
          sex: st.sex,
          residentialAddress: _address.text,
          licenseNumber: _license.text,
          licenseCode: _code.text,
          pdpNumber: _pdp.text,
          pdpExpiry: st.pdpExpiry,
          bankAccountHolder: _bankHolder.text,
          bankName: _bankName.text,
          bankAccountNumber: _bankAcct.text,
          bankBranchCode: _bankBranch.text,
        );
  }

  Future<void> _pickDob() async {
    _persistDraftToNotifier();
    final st = ref.read(onboardingNotifierProvider(widget.profileId));
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: st.dob ?? DateTime(now.year - 25, now.month, now.day),
      firstDate: DateTime(1940),
      lastDate: now,
    );
    if (d != null && mounted) {
      ref.read(onboardingNotifierProvider(widget.profileId).notifier).setDob(d);
      setState(() {});
    }
  }

  Future<void> _pickPdpExpiry() async {
    _persistDraftToNotifier();
    final st = ref.read(onboardingNotifierProvider(widget.profileId));
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: st.pdpExpiry ?? now.add(const Duration(days: 365)),
      firstDate: now,
      lastDate: DateTime(now.year + 15),
    );
    if (d != null && mounted) {
      ref
          .read(onboardingNotifierProvider(widget.profileId).notifier)
          .setPdpExpiry(d);
      setState(() {});
    }
  }

  String _shortPath(String? p) {
    if (p == null || p.isEmpty) return 'Not selected';
    final i = p.lastIndexOf('/');
    return i >= 0 ? p.substring(i + 1) : p;
  }

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(onboardingNotifierProvider(widget.profileId));
    final scheme = Theme.of(context).colorScheme;
    OnboardingNotifier notifier() =>
        ref.read(onboardingNotifierProvider(widget.profileId).notifier);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Your details', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Full name',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _idNumber,
            decoration: const InputDecoration(
              labelText: 'ID number',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(
              side: BorderSide(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(8),
            ),
            title: const Text('Date of birth'),
            subtitle: Text(
              st.dob == null ? 'Tap to choose' : _df.format(st.dob!),
            ),
            trailing: const Icon(Icons.calendar_today),
            onTap: _pickDob,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: st.sex.isEmpty ? null : st.sex,
            decoration: const InputDecoration(
              labelText: 'Sex (optional)',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'MALE', child: Text('Male')),
              DropdownMenuItem(value: 'FEMALE', child: Text('Female')),
              DropdownMenuItem(value: 'OTHER', child: Text('Other')),
            ],
            onChanged: (v) {
              if (v != null) notifier().setSex(v);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _address,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Residential address',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _license,
            decoration: const InputDecoration(
              labelText: 'Driver license number',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _code,
            decoration: const InputDecoration(
              labelText: 'License code',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _pdp,
            decoration: const InputDecoration(
              labelText: 'PDP number (optional)',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(
              side: BorderSide(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(8),
            ),
            title: const Text('PDP expiry (optional)'),
            subtitle: Text(
              st.pdpExpiry == null ? 'Tap to choose' : _df.format(st.pdpExpiry!),
            ),
            trailing: const Icon(Icons.calendar_today),
            onTap: _pickPdpExpiry,
          ),
          const SizedBox(height: 16),
          Text('Bank details', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _bankHolder,
            decoration: const InputDecoration(
              labelText: 'Account holder',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bankName,
            decoration: const InputDecoration(
              labelText: 'Bank name',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bankAcct,
            decoration: const InputDecoration(
              labelText: 'Account number',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bankBranch,
            decoration: const InputDecoration(
              labelText: 'Branch code',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _persistDraftToNotifier(),
          ),
          const SizedBox(height: 24),
          Text('Documents', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          _docTile(
            context,
            title: 'Selfie',
            path: st.selfiePath,
            onPick: () async {
              _persistDraftToNotifier();
              final path = await pickImageFromSheet(context);
              if (path != null) {
                _persistDraftToNotifier();
                ref
                    .read(onboardingNotifierProvider(widget.profileId).notifier)
                    .setSelfiePath(path);
              }
            },
          ),
          _docTile(
            context,
            title: 'ID document (photo or PDF)',
            path: st.idDocPath,
            onPick: () async {
              _persistDraftToNotifier();
              final path = await pickPdfOrImageDocument(context);
              if (path != null) {
                _persistDraftToNotifier();
                ref
                    .read(onboardingNotifierProvider(widget.profileId).notifier)
                    .setIdDocPath(path);
              }
            },
          ),
          _docTile(
            context,
            title: 'Driver licence (photo or PDF)',
            path: st.licenseDocPath,
            onPick: () async {
              _persistDraftToNotifier();
              final path = await pickPdfOrImageDocument(context);
              if (path != null) {
                _persistDraftToNotifier();
                ref
                    .read(onboardingNotifierProvider(widget.profileId).notifier)
                    .setLicenseDocPath(path);
              }
            },
          ),
          _docTile(
            context,
            title: 'Proof of residence (photo or PDF)',
            path: st.proofResidencePath,
            onPick: () async {
              _persistDraftToNotifier();
              final path = await pickPdfOrImageDocument(context);
              if (path != null) {
                _persistDraftToNotifier();
                ref
                    .read(onboardingNotifierProvider(widget.profileId).notifier)
                    .setProofResidencePath(path);
              }
            },
          ),
          _docTile(
            context,
            title: 'Bank statement (optional)',
            path: st.bankStatementPath,
            onPick: () async {
              _persistDraftToNotifier();
              final path = await pickPdfOrImageDocument(context);
              if (path != null) {
                _persistDraftToNotifier();
                ref
                    .read(onboardingNotifierProvider(widget.profileId).notifier)
                    .setBankStatementPath(path);
              }
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: st.isBusy
                ? null
                : () async {
                    FocusScope.of(context).unfocus();
                    notifier().savePersonalFromForm(
                      fullName: _name.text,
                      idNumber: _idNumber.text,
                      dob: st.dob,
                      sex: st.sex,
                      residentialAddress: _address.text,
                      licenseNumber: _license.text,
                      licenseCode: _code.text,
                      pdpNumber: _pdp.text,
                      pdpExpiry: st.pdpExpiry,
                      bankAccountHolder: _bankHolder.text,
                      bankName: _bankName.text,
                      bankAccountNumber: _bankAcct.text,
                      bankBranchCode: _bankBranch.text,
                    );
                    await notifier().completeStep1();
                  },
            child: const Text('Save & continue'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _docTile(
    BuildContext context, {
    required String title,
    required String? path,
    required VoidCallback onPick,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        shape: RoundedRectangleBorder(
          side: BorderSide(color: scheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        title: Text(title),
        subtitle: Text(_shortPath(path)),
        trailing: IconButton(
          onPressed: onPick,
          icon: const Icon(Icons.add_a_photo),
        ),
      ),
    );
  }
}
