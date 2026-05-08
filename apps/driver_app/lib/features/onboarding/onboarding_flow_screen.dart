import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../shared/models/driver_profile.dart';
import 'onboarding_notifier.dart';
import 'steps/driver_personal_step.dart';
import 'steps/onboarding_summary_step.dart';
import 'steps/vehicle_step.dart';

/// Three-step onboarding wizard (Prompt 3).
class OnboardingFlowScreen extends ConsumerWidget {
  const OnboardingFlowScreen({super.key, required this.profile});

  final DriverProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(onboardingNotifierProvider(profile.id));
    final n = ref.read(onboardingNotifierProvider(profile.id).notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text('Registration · step ${st.stepIndex + 1} of 3'),
        leading: st.stepIndex > 0 && !st.isBusy
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: n.back,
              )
            : null,
      ),
      body: Stack(
        children: [
          Padding(
            padding: AppSpacing.screenPadding,
            child: AbsorbPointer(
              absorbing: st.isBusy,
              child: IndexedStack(
                index: st.stepIndex,
                children: [
                  DriverPersonalStep(profileId: profile.id),
                  VehicleStep(profileId: profile.id),
                  OnboardingSummaryStep(profileId: profile.id),
                ],
              ),
            ),
          ),
          if (st.isBusy) ...[
            ModalBarrier(
              dismissible: false,
              color: Colors.black.withOpacity(0.35),
            ),
            const Center(child: CircularProgressIndicator()),
          ],
        ],
      ),
    );
  }
}
