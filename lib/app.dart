import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/routing/app_router.dart';
import 'package:nefes/theme/app_theme.dart';

/// Root application widget for NEFES (Flutter Web PWA).
class NefesApp extends ConsumerWidget {
  const NefesApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
