import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/supabase_client.dart';
import '../models/driver_enums.dart';

class VehicleOnboardingFeeInfo {
  const VehicleOnboardingFeeInfo({
    required this.category,
    required this.annualFeeCents,
    required this.status,
    this.waivedUntil,
    this.paidUntil,
    required this.paymentRequired,
  });

  final String category;
  final int annualFeeCents;
  final String status;
  final DateTime? waivedUntil;
  final DateTime? paidUntil;
  final bool paymentRequired;

  factory VehicleOnboardingFeeInfo.fromJson(Map<String, dynamic> json) {
    return VehicleOnboardingFeeInfo(
      category: json['category'] as String? ?? '',
      annualFeeCents: (json['annual_fee_cents'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'waived_first_year',
      waivedUntil: json['waived_until'] != null
          ? DateTime.tryParse(json['waived_until'] as String)
          : null,
      paidUntil: json['paid_until'] != null
          ? DateTime.tryParse(json['paid_until'] as String)
          : null,
      paymentRequired: json['payment_required'] as bool? ?? false,
    );
  }

  String get statusLabel => switch (status) {
        'waived_first_year' => 'First year free',
        'paid' => 'Paid',
        'due' => 'Payment due',
        'overdue' => 'Overdue',
        _ => status,
      };

  String formatZar(int cents) =>
      'R${(cents / 100).toStringAsFixed(2)}';
}

final vehicleOnboardingFeeProvider =
    FutureProvider.family<VehicleOnboardingFeeInfo?, String>((ref, vehicleId) async {
  if (vehicleId.isEmpty) return null;
  final res = await supabaseClient.rpc(
    'get_vehicle_onboarding_fee_status',
    params: {'p_vehicle_id': vehicleId},
  );
  final map = Map<String, dynamic>.from(res as Map);
  if (map['ok'] != true) return null;
  return VehicleOnboardingFeeInfo.fromJson(map);
});

final categoryOnboardingFeeProvider =
    FutureProvider.family<int, VehicleCategory>((ref, category) async {
  final res = await supabaseClient.rpc(
    'get_vehicle_onboarding_fee',
    params: {'p_category': vehicleCategoryToApi(category)},
  );
  final map = Map<String, dynamic>.from(res as Map);
  return (map['annual_fee_cents'] as num?)?.toInt() ?? 0;
});

class OnboardingPaymentService {
  const OnboardingPaymentService(this._client);

  final SupabaseClient _client;

  Future<void> startCheckout({required String vehicleId}) async {
    final res = await _client.functions.invoke(
      'driver-onboarding-checkout',
      body: {'vehicle_id': vehicleId},
    );

    if (res.status != 200) {
      throw StateError('Could not start payment (${res.status})');
    }

    final data = Map<String, dynamic>.from(res.data as Map);
    if (data['ok'] != true) {
      throw StateError(data['error']?.toString() ?? 'Payment unavailable');
    }

    final url = Uri.parse(data['checkout_url'] as String);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw StateError('Could not open Payfast checkout');
    }
  }

  Future<bool> canSubmitRegistration(String profileId) async {
    final res = await _client.rpc(
      'driver_can_submit_registration',
      params: {'p_profile_id': profileId},
    );
    final map = Map<String, dynamic>.from(res as Map);
    return map['can_submit'] as bool? ?? true;
  }
}

final onboardingPaymentServiceProvider = Provider<OnboardingPaymentService>(
  (ref) => OnboardingPaymentService(supabaseClient),
);
