import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/driver_enums.dart';
import '../../../shared/models/vehicle_draft.dart';
import '../onboarding_notifier.dart';
import '../onboarding_pick_helpers.dart';

class VehicleStep extends ConsumerStatefulWidget {
  const VehicleStep({super.key, required this.profileId});

  final String profileId;

  @override
  ConsumerState<VehicleStep> createState() => _VehicleStepState();
}

class _VehicleStepState extends ConsumerState<VehicleStep> {
  late final TextEditingController _reg;
  late final TextEditingController _colour;
  late final TextEditingController _make;
  late final TextEditingController _model;
  late final TextEditingController _vin;
  late final TextEditingController _speedo;
  late final TextEditingController _ownerName;
  late final TextEditingController _ownerId;
  late final TextEditingController _ownerAddr;
  late final TextEditingController _coCipc;
  late final TextEditingController _coName;
  late final TextEditingController _coAddr;

  final _df = DateFormat.yMMMd();

  void _bind(VehicleDraft v) {
    _reg.text = v.registrationNumber;
    _colour.text = v.colour;
    _make.text = v.make;
    _model.text = v.model;
    _vin.text = v.vin;
    _speedo.text = v.speedometerReading;
    _ownerName.text = v.ownerFullName;
    _ownerId.text = v.ownerIdNumber;
    _ownerAddr.text = v.ownerAddress;
    _coCipc.text = v.companyCipc;
    _coName.text = v.companyName;
    _coAddr.text = v.companyAddress;
  }

  @override
  void initState() {
    super.initState();
    _reg = TextEditingController();
    _colour = TextEditingController();
    _make = TextEditingController();
    _model = TextEditingController();
    _vin = TextEditingController();
    _speedo = TextEditingController();
    _ownerName = TextEditingController();
    _ownerId = TextEditingController();
    _ownerAddr = TextEditingController();
    _coCipc = TextEditingController();
    _coName = TextEditingController();
    _coAddr = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final s = ref.read(onboardingNotifierProvider(widget.profileId));
      _bind(s.vehicleDraft);
      setState(() {});
    });
  }

  @override
  void dispose() {
    _reg.dispose();
    _colour.dispose();
    _make.dispose();
    _model.dispose();
    _vin.dispose();
    _speedo.dispose();
    _ownerName.dispose();
    _ownerId.dispose();
    _ownerAddr.dispose();
    _coCipc.dispose();
    _coName.dispose();
    _coAddr.dispose();
    super.dispose();
  }

  void _pushVehicleDraft(VehicleDraft v) {
    ref.read(onboardingNotifierProvider(widget.profileId).notifier).replaceVehicleDraft(v);
  }

  void _syncDraftFromControllers() {
    final cur =
        ref.read(onboardingNotifierProvider(widget.profileId)).vehicleDraft;
    _pushVehicleDraft(
      cur.copyWith(
        registrationNumber: _reg.text,
        colour: _colour.text,
        make: _make.text,
        model: _model.text,
        vin: _vin.text,
        speedometerReading: _speedo.text,
        ownerFullName: _ownerName.text,
        ownerIdNumber: _ownerId.text,
        ownerAddress: _ownerAddr.text,
        companyCipc: _coCipc.text,
        companyName: _coName.text,
        companyAddress: _coAddr.text,
      ),
    );
  }

  Future<void> _pickVehicleExpiry(
    BuildContext context, {
    required bool isDoubleDisc,
  }) async {
    final st = ref.read(onboardingNotifierProvider(widget.profileId));
    final now = DateTime.now();
    final initial = isDoubleDisc
        ? (st.vehicleDraft.doubleDiscExpiry ?? now.add(const Duration(days: 180)))
        : (st.vehicleDraft.insuranceExpiry ?? now.add(const Duration(days: 365)));
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now,
      lastDate: DateTime(now.year + 10),
    );
    if (d == null || !mounted) return;
    final v = st.vehicleDraft;
    _pushVehicleDraft(
      isDoubleDisc
          ? v.copyWith(doubleDiscExpiry: d)
          : v.copyWith(insuranceExpiry: d),
    );
    setState(() {});
  }

  String _shortPath(String? p) {
    if (p == null || p.isEmpty) return 'Not selected';
    final i = p.lastIndexOf('/');
    return i >= 0 ? p.substring(i + 1) : p;
  }

  Widget _photoTile(
    BuildContext context,
    ColorScheme scheme, {
    required String title,
    required String? path,
    required VoidCallback onPick,
  }) {
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

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(onboardingNotifierProvider(widget.profileId));
    final n = ref.read(onboardingNotifierProvider(widget.profileId).notifier);
    final v = st.vehicleDraft;
    final scheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Vehicle', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          SegmentedButton<VehicleOwnerKind>(
            segments: const [
              ButtonSegment(
                value: VehicleOwnerKind.privateVehicle,
                label: Text('Private'),
              ),
              ButtonSegment(
                value: VehicleOwnerKind.companyVehicle,
                label: Text('Company'),
              ),
            ],
            selected: {v.ownerKind},
            onSelectionChanged: (s) {
              final cur = ref
                  .read(onboardingNotifierProvider(widget.profileId))
                  .vehicleDraft;
              _pushVehicleDraft(cur.copyWith(ownerKind: s.first));
            },
          ),
          const SizedBox(height: 16),
          if (v.ownerKind == VehicleOwnerKind.privateVehicle) ...[
            TextField(
              controller: _ownerName,
              decoration: const InputDecoration(
                labelText: 'Owner full name',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _ownerId,
              decoration: const InputDecoration(
                labelText: 'Owner ID number',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _ownerAddr,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Owner address',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
          ] else ...[
            TextField(
              controller: _coName,
              decoration: const InputDecoration(
                labelText: 'Company name',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _coCipc,
              decoration: const InputDecoration(
                labelText: 'CIPC / registration',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _coAddr,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Company address',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _syncDraftFromControllers(),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _reg,
            decoration: const InputDecoration(
              labelText: 'Registration number',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _colour,
            decoration: const InputDecoration(
              labelText: 'Colour',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _make,
            decoration: const InputDecoration(
              labelText: 'Make',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _model,
            decoration: const InputDecoration(
              labelText: 'Model',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<VehicleCategory>(
            value: v.category,
            decoration: const InputDecoration(
              labelText: 'Category',
              border: OutlineInputBorder(),
            ),
            items: VehicleCategory.values
                .map(
                  (c) => DropdownMenuItem(
                    value: c,
                    child: Text(vehicleCategoryToApi(c)),
                  ),
                )
                .toList(),
            onChanged: (c) {
              if (c != null) {
                final cur = ref
                    .read(onboardingNotifierProvider(widget.profileId))
                    .vehicleDraft;
                _pushVehicleDraft(cur.copyWith(category: c));
              }
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _vin,
            decoration: const InputDecoration(
              labelText: 'VIN',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _speedo,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Speedometer reading',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _syncDraftFromControllers(),
          ),
          const SizedBox(height: 16),
          Text('Vehicle photos', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          _photoTile(
            context,
            scheme,
            title: 'Front',
            path: st.vehiclePhotoFrontPath,
            onPick: () async {
              final p = await pickImageFromSheet(context);
              if (p != null) n.setVehiclePhotoFrontPath(p);
            },
          ),
          _photoTile(
            context,
            scheme,
            title: 'Left',
            path: st.vehiclePhotoLeftPath,
            onPick: () async {
              final p = await pickImageFromSheet(context);
              if (p != null) n.setVehiclePhotoLeftPath(p);
            },
          ),
          _photoTile(
            context,
            scheme,
            title: 'Right',
            path: st.vehiclePhotoRightPath,
            onPick: () async {
              final p = await pickImageFromSheet(context);
              if (p != null) n.setVehiclePhotoRightPath(p);
            },
          ),
          _photoTile(
            context,
            scheme,
            title: 'Rear',
            path: st.vehiclePhotoRearPath,
            onPick: () async {
              final p = await pickImageFromSheet(context);
              if (p != null) n.setVehiclePhotoRearPath(p);
            },
          ),
          _photoTile(
            context,
            scheme,
            title: 'Speedometer',
            path: st.vehiclePhotoSpeedoPath,
            onPick: () async {
              final p = await pickImageFromSheet(context);
              if (p != null) n.setVehiclePhotoSpeedoPath(p);
            },
          ),
          const SizedBox(height: 16),
          Text('Documents', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          _photoTile(
            context,
            scheme,
            title: 'NATIS (photo/PDF)',
            path: st.natisPath,
            onPick: () async {
              final p = await pickRegistrationFile();
              if (p != null) n.setNatisPath(p);
            },
          ),
          _photoTile(
            context,
            scheme,
            title: 'Double disc (photo/PDF)',
            path: st.doubleDiscPath,
            onPick: () async {
              final p = await pickRegistrationFile();
              if (p != null) n.setDoubleDiscPath(p);
            },
          ),
          ListTile(
            shape: RoundedRectangleBorder(
              side: BorderSide(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(8),
            ),
            title: const Text('Double disc expiry'),
            subtitle: Text(
              v.doubleDiscExpiry == null
                  ? 'Tap to choose'
                  : _df.format(v.doubleDiscExpiry!),
            ),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickVehicleExpiry(context, isDoubleDisc: true),
          ),
          const SizedBox(height: 8),
          _photoTile(
            context,
            scheme,
            title: 'Insurance (photo/PDF)',
            path: st.insurancePath,
            onPick: () async {
              final p = await pickRegistrationFile();
              if (p != null) n.setInsurancePath(p);
            },
          ),
          ListTile(
            shape: RoundedRectangleBorder(
              side: BorderSide(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(8),
            ),
            title: const Text('Insurance expiry'),
            subtitle: Text(
              v.insuranceExpiry == null
                  ? 'Tap to choose'
                  : _df.format(v.insuranceExpiry!),
            ),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickVehicleExpiry(context, isDoubleDisc: false),
          ),
          if (v.ownerKind == VehicleOwnerKind.companyVehicle) ...[
            const SizedBox(height: 12),
            _photoTile(
              context,
              scheme,
              title: 'CK document',
              path: st.ckPath,
              onPick: () async {
                final p = await pickRegistrationFile();
                if (p != null) n.setCkPath(p);
              },
            ),
            _photoTile(
              context,
              scheme,
              title: 'Director approval',
              path: st.directorApprovalPath,
              onPick: () async {
                final p = await pickRegistrationFile();
                if (p != null) n.setDirectorApprovalPath(p);
              },
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: st.isBusy
                ? null
                : () => n.completeStep2(),
            child: const Text('Save & continue'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
