import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/documents/documents_screen.dart';
import '../../features/earnings/earnings_screen.dart';
import '../../features/home/home_dashboard_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/trip/models/trip.dart';
import '../../features/trip/models/trip_status.dart';
import '../../features/trip/trip_hub_screen.dart';
import '../../features/trip/trip_providers.dart';
import '../providers/app_providers.dart';

/// Main shell: five tabs after full driver approval (prompt 1 + business-logic.md).
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  @override
  Widget build(BuildContext context) {
    final index = ref.watch(mainShellTabIndexProvider);

    ref.listen<AsyncValue<Trip?>>(currentTripProvider, (prev, next) {
      final trip = next.asData?.value;
      final prevTrip = prev?.asData?.value;
      if (trip != null &&
          trip.status == TripStatus.requested &&
          prevTrip?.tripId != trip.tripId) {
        ref.read(mainShellTabIndexProvider.notifier).state = 1;
      }
    });

    return Scaffold(
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: switch (index) {
          0 => const HomeDashboardScreen(key: ValueKey(0)),
          1 => const TripHubScreen(key: ValueKey(1)),
          2 => const ProfileScreen(key: ValueKey(2)),
          3 => const DocumentsScreen(key: ValueKey(3)),
          _ => const EarningsScreen(key: ValueKey(4)),
        },
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) {
          ref.read(mainShellTabIndexProvider.notifier).state = i;
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.route_outlined),
            selectedIcon: Icon(Icons.route),
            label: 'Trips',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Documents',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Earnings',
          ),
        ],
      ),
    );
  }
}
