import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';

class PaymentMethodsScreen extends ConsumerWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment methods')),
      body: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          const ListTile(
            leading: Icon(Icons.payments_outlined),
            title: Text('Cash'),
            subtitle: Text('Default for MVP'),
            trailing: Icon(Icons.check),
          ),
          const ListTile(
            leading: Icon(Icons.credit_card),
            title: Text('Add card'),
            subtitle: Text('Payfast / Paystack integration coming soon'),
            trailing: Icon(Icons.chevron_right),
          ),
          Text(
            'Saved cards use token references only — no card numbers stored in the app.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
