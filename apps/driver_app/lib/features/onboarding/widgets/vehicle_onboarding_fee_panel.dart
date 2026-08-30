import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/driver_enums.dart';
import '../../../shared/services/onboarding_payment_service.dart';

class VehicleOnboardingFeePanel extends ConsumerWidget {
  const VehicleOnboardingFeePanel({
    super.key,
    required this.profileId,
    required this.category,
    this.vehicleId,
  });

  final String profileId;
  final VehicleCategory category;
  final String? vehicleId;

  static final _df = DateFormat.yMMMd();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final feeAsync = ref.watch(categoryOnboardingFeeProvider(category));
    final statusAsync = vehicleId != null && vehicleId!.isNotEmpty
        ? ref.watch(vehicleOnboardingFeeProvider(vehicleId!))
        : const AsyncValue<VehicleOnboardingFeeInfo?>.data(null);

    return feeAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
      data: (feeCents) {
        final status = statusAsync.valueOrNull;
        final paymentRequired = status?.paymentRequired ?? false;
        final waivedUntil = status?.waivedUntil;
        final paidUntil = status?.paidUntil;

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Annual platform onboarding fee',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  '${vehicleCategoryLabel(category)} · R${(feeCents / 100).toStringAsFixed(2)} / year',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 8),
                if (status == null || status.status == 'waived_first_year') ...[
                  Text(
                    'Your first year on Trip is free.'
                    '${waivedUntil != null ? ' Waived until ${_df.format(waivedUntil)}.' : ''}',
                    style: TextStyle(color: scheme.primary),
                  ),
                ] else if (status.status == 'paid') ...[
                  Text(
                    'Onboarding fee paid'
                    '${paidUntil != null ? ' until ${_df.format(paidUntil)}.' : '.'}',
                    style: TextStyle(color: scheme.primary),
                  ),
                ] else if (paymentRequired) ...[
                  Text(
                    'Annual onboarding fee is due before you can submit for review.',
                    style: TextStyle(color: scheme.error),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: vehicleId == null
                        ? null
                        : () async {
                            try {
                              await ref
                                  .read(onboardingPaymentServiceProvider)
                                  .startCheckout(vehicleId: vehicleId!);
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('$e')),
                                );
                              }
                            }
                          },
                    icon: const Icon(Icons.payments_outlined),
                    label: Text('Pay R${(feeCents / 100).toStringAsFixed(2)} with Payfast'),
                  ),
                ] else ...[
                  Text(
                    status.statusLabel,
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
