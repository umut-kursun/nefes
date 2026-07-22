import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/shell/presentation/pwa_update_banner.dart';

/// Top-level app scaffold — bottom [NavigationBar] on mobile, side
/// [NavigationRail] on wide layouts, wrapping a go_router
/// [StatefulNavigationShell] so each tab keeps its own navigation stack.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = <_ShellDestination>[
    _ShellDestination(
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      label: AppStrings.navToday,
    ),
    _ShellDestination(
      icon: Icons.history_outlined,
      selectedIcon: Icons.history,
      label: AppStrings.navHistory,
    ),
    _ShellDestination(
      icon: Icons.insights_outlined,
      selectedIcon: Icons.insights,
      label: AppStrings.navInsights,
    ),
    _ShellDestination(
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings,
      label: AppStrings.navSettings,
    ),
  ];

  void _onDestinationSelected(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PwaUpdateBannerHost(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= AppBreakpoints.dashboardWide;

          if (isWide) {
            return Scaffold(
              body: Row(
                children: [
                  NavigationRail(
                    selectedIndex: navigationShell.currentIndex,
                    onDestinationSelected: _onDestinationSelected,
                    labelType: NavigationRailLabelType.all,
                    destinations: [
                      for (final d in _destinations)
                        NavigationRailDestination(
                          icon: Icon(d.icon),
                          selectedIcon: Icon(d.selectedIcon),
                          label: Text(d.label),
                        ),
                    ],
                  ),
                  const VerticalDivider(width: 1, thickness: 1),
                  Expanded(child: navigationShell),
                ],
              ),
            );
          }

          return Scaffold(
            body: navigationShell,
            bottomNavigationBar: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: _onDestinationSelected,
              destinations: [
                for (final d in _destinations)
                  NavigationDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.selectedIcon),
                    label: d.label,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ShellDestination {
  const _ShellDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
