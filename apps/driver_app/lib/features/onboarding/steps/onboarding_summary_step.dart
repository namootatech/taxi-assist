import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/driver_enums.dart';
import '../../../shared/models/vehicle_draft.dart';
import '../../../shared/services/onboarding_payment_service.dart';
import '../onboarding_notifier.dart';

class OnboardingSummaryStep extends ConsumerWidget {
  const OnboardingSummaryStep({super.key, required this.profileId});

  final String profileId;

  static final _df = DateFormat.yMMMd();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(onboardingNotifierProvider(profileId));
    final n = ref.read(onboardingNotifierProvider(profileId).notifier);
    final v = st.vehicleDraft;
    final scheme = Theme.of(context).colorScheme;

    final feeAsync = st.vehicleId != null
        ? ref.watch(vehicleOnboardingFeeProvider(st.vehicleId!))
        : const AsyncValue<VehicleOnboardingFeeInfo?>.data(null);

    Widget section(String title, List<Widget> lines) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...lines,
          ],
        ),
      );
    }

    Widget line(String k, String val) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 120,
                child: Text(
                  k,
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ),
              Expanded(child: Text(val)),
            ],
          ),
        );

    final docSlots = <String, String?>{
      'Selfie': st.selfiePath,
      'ID': st.idDocPath,
      'License': st.licenseDocPath,
      'Proof of residence': st.proofResidencePath,
      if (st.bankStatementPath != null)
        'Bank statement': st.bankStatementPath,
      'NATIS': st.natisPath,
      'Double disc': st.doubleDiscPath,
      'Insurance': st.insurancePath,
      if (v.ownerKind == VehicleOwnerKind.companyVehicle) ...{
        'CK': st.ckPath,
        'Director approval': st.directorApprovalPath,
      },
    };

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Review & submit',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'We’ll review your documents and notify you.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          section('Driver', [
            line('Name', st.fullName.trim()),
            line('ID number', st.idNumber.trim()),
            if (st.dob != null) line('DOB', _df.format(st.dob!)),
            line('Address', st.residentialAddress.trim()),
            line('License', '${st.licenseNumber.trim()} (${st.licenseCode.trim()})'),
            if (st.pdpNumber.trim().isNotEmpty)
              line('PDP', st.pdpNumber.trim()),
          ]),
          section('Bank', [
            line('Bank', st.bankName.trim()),
            line('Account', st.bankAccountNumber.trim()),
          ]),
          section('Vehicle', [
            line('Owner', v.ownerKind == VehicleOwnerKind.privateVehicle ? 'Private' : 'Company'),
            line('Registration', v.registrationNumber.trim()),
            line('Vehicle', '${v.make.trim()} ${v.model.trim()}'),
            line('Category', vehicleCategoryLabel(v.category)),
            if (st.vehicleId != null) line('Vehicle ID', st.vehicleId!),
          ]),
          feeAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (fee) {
              if (fee == null) return const SizedBox.shrink();
              return section('Onboarding fee', [
                line('Annual fee', fee.formatZar(fee.annualFeeCents)),
                line('Status', fee.statusLabel),
                if (fee.waivedUntil != null)
                  line('Waived until', _df.format(fee.waivedUntil!)),
                if (fee.paidUntil != null)
                  line('Paid until', _df.format(fee.paidUntil!)),
              ]);
            },
          ),
          section('Uploads', [
            ...docSlots.entries.map(
              (e) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(child: Text(e.key)),
                    Chip(
                      label: const Text('PENDING'),
                      visualDensity: VisualDensity.compact,
                      backgroundColor: scheme.secondaryContainer,
                    ),
                  ],
                ),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: st.isBusy ? null : () => n.submitRegistration(),
            child: const Text('Send for review'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
