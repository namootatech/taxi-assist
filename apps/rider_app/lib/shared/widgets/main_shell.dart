import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/theme_mode_provider.dart';
import '../../features/emergency/emergency_contacts_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/invite/invite_friends_screen.dart';
import '../../features/media/media_summary_screen.dart';
import '../../features/payments/payment_methods_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/support/support_screen.dart';
import '../../features/trip/active_trip_screen.dart';
import '../../features/trips/trip_history_screen.dart';
import '../../features/wallet/wallet_screen.dart';
import '../providers/app_providers.dart';

/// Main shell: bottom tabs + drawer for secondary destinations.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  void _openDrawerDestination(Widget screen, String title) {
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title)),
          body: screen,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final index = ref.watch(mainShellTabIndexProvider);

    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Taxi Assist Rider'),
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        actions: [
          IconButton(
            tooltip: 'Switch theme',
            onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
            icon: const Icon(Icons.brightness_6),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
              child: Text(
                'More',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            ListTile(
              leading: const Icon(Icons.directions_car_outlined),
              title: const Text('Active trip'),
              onTap: () => _openDrawerDestination(
                const ActiveTripHubScreen(),
                'Active trip',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text('Trip history'),
              onTap: () => _openDrawerDestination(
                const TripHistoryScreen(),
                'Trip history',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.credit_card_outlined),
              title: const Text('Payment methods'),
              onTap: () => _openDrawerDestination(
                const PaymentMethodsScreen(),
                'Payment methods',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.emergency_outlined),
              title: const Text('Emergency contacts'),
              onTap: () => _openDrawerDestination(
                const EmergencyContactsScreen(),
                'Emergency contacts',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard_outlined),
              title: const Text('Invite friends'),
              onTap: () => _openDrawerDestination(
                const InviteFriendsScreen(),
                'Invite friends',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.support_agent_outlined),
              title: const Text('Support'),
              onTap: () => _openDrawerDestination(
                const SupportScreen(),
                'Support',
              ),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign out'),
              onTap: () async {
                Navigator.of(context).pop();
                await ref.read(supabaseServiceProvider).signOut();
              },
            ),
          ],
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: switch (index) {
          0 => const HomeScreen(key: ValueKey(0)),
          1 => const WalletScreen(key: ValueKey(1)),
          2 => const MediaSummaryScreen(key: ValueKey(2)),
          3 => const ProfileScreen(key: ValueKey(3)),
          _ => const HomeScreen(key: ValueKey(0)),
        },
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index.clamp(0, 3),
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
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Wallet',
          ),
          NavigationDestination(
            icon: Icon(Icons.play_circle_outline),
            selectedIcon: Icon(Icons.play_circle),
            label: 'Media',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
