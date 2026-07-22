import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/home/role_dashboards.dart';

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  int _selectedIndex(String location, List<NavDestinationSpec> destinations) {
    for (var i = 0; i < destinations.length; i++) {
      final path = destinations[i].path;
      if (location == path || location.startsWith('$path/')) {
        return i;
      }
    }
    return destinations.length - 1;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final destinations = navDestinationsForRole(user);
    final location = GoRouterState.of(context).uri.path;
    final index = _selectedIndex(location, destinations);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index.clamp(0, destinations.length - 1),
        onDestinationSelected: (i) {
          final path = destinations[i].path;
          if (location != path) {
            context.go(path);
          }
        },
        destinations: [
          for (final d in destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selectedIcon),
              label: d.label,
            ),
        ],
      ),
    );
  }
}
