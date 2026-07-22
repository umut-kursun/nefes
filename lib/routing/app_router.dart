import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nefes/features/history/presentation/day_detail_page.dart';
import 'package:nefes/features/history/presentation/history_page.dart';
import 'package:nefes/features/insights/presentation/insights_page.dart';
import 'package:nefes/features/settings/presentation/settings_page.dart';
import 'package:nefes/features/shell/presentation/app_shell.dart';
import 'package:nefes/features/smoking/presentation/home/home_view.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/today',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/today',
                name: 'today',
                builder: (context, state) => const HomeView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                name: 'history',
                builder: (context, state) => const HistoryPage(),
                routes: [
                  GoRoute(
                    path: 'day/:date',
                    name: 'historyDay',
                    builder: (context, state) {
                      return DayDetailPage(
                        dateParam: state.pathParameters['date'] ?? '',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/insights',
                name: 'insights',
                builder: (context, state) => const InsightsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                name: 'settings',
                builder: (context, state) => const SettingsPage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
