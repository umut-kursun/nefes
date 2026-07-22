import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/shell/presentation/pwa_update_banner.dart';

/// App shell — calm bottom nav / rail with restrained selected state.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = <_ShellDestination>[
    _ShellDestination(
      icon: Icons.wb_sunny_outlined,
      selectedIcon: Icons.wb_sunny,
      label: AppStrings.navToday,
    ),
    _ShellDestination(
      icon: Icons.calendar_today_outlined,
      selectedIcon: Icons.calendar_today,
      label: AppStrings.navHistory,
    ),
    _ShellDestination(
      icon: Icons.auto_graph_outlined,
      selectedIcon: Icons.auto_graph,
      label: AppStrings.navInsights,
    ),
    _ShellDestination(
      icon: Icons.tune_outlined,
      selectedIcon: Icons.tune,
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
              backgroundColor: AppColors.canvasLight,
              body: Row(
                children: [
                  NavigationRail(
                    selectedIndex: navigationShell.currentIndex,
                    onDestinationSelected: _onDestinationSelected,
                    labelType: NavigationRailLabelType.all,
                    backgroundColor: AppColors.surfaceLight,
                    destinations: [
                      for (final d in _destinations)
                        NavigationRailDestination(
                          icon: Icon(d.icon),
                          selectedIcon: Icon(d.selectedIcon),
                          label: Text(d.label),
                        ),
                    ],
                  ),
                  const VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: AppColors.divider,
                  ),
                  Expanded(child: navigationShell),
                ],
              ),
            );
          }

          return Scaffold(
            backgroundColor: AppColors.canvasLight,
            body: navigationShell,
            bottomNavigationBar: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surfaceLight,
                border: Border(
                  top: BorderSide(color: AppColors.divider, width: 1),
                ),
              ),
              child: SafeArea(
                top: false,
                child: NavigationBar(
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
              ),
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
