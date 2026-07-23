import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/shell/presentation/pwa_update_banner.dart';

/// App shell — calm bottom nav / rail with restrained selected state.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

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

          // Icons must be written as literal Icons.* here so Flutter Web
          // tree-shaking keeps the glyphs in MaterialIcons.
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
                    indicatorColor: AppColors.navSelectedFill,
                    selectedIconTheme: const IconThemeData(
                      color: AppColors.forest,
                      size: 22,
                    ),
                    unselectedIconTheme: const IconThemeData(
                      color: AppColors.textMuted,
                      size: 22,
                    ),
                    selectedLabelTextStyle: const TextStyle(
                      color: AppColors.forest,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    unselectedLabelTextStyle: const TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                    destinations: const [
                      NavigationRailDestination(
                        icon: Icon(Icons.wb_sunny_outlined),
                        selectedIcon: Icon(Icons.wb_sunny),
                        label: Text(AppStrings.navToday),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.calendar_today_outlined),
                        selectedIcon: Icon(Icons.calendar_today),
                        label: Text(AppStrings.navHistory),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.auto_graph_outlined),
                        selectedIcon: Icon(Icons.auto_graph),
                        label: Text(AppStrings.navInsights),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.tune_outlined),
                        selectedIcon: Icon(Icons.tune),
                        label: Text(AppStrings.navSettings),
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
                  destinations: const [
                    NavigationDestination(
                      icon: Icon(Icons.wb_sunny_outlined),
                      selectedIcon: Icon(Icons.wb_sunny),
                      label: AppStrings.navToday,
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.calendar_today_outlined),
                      selectedIcon: Icon(Icons.calendar_today),
                      label: AppStrings.navHistory,
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.auto_graph_outlined),
                      selectedIcon: Icon(Icons.auto_graph),
                      label: AppStrings.navInsights,
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.tune_outlined),
                      selectedIcon: Icon(Icons.tune),
                      label: AppStrings.navSettings,
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
