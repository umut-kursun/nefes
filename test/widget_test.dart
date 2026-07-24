import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nefes/app.dart';
import 'package:nefes/core/di/providers.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:sembast/sembast_memory.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpHome(WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      'has_completed_onboarding': true,
      'daily_target': 15,
      'average_per_day': 20,
    });
    final prefs = await SharedPreferences.getInstance();
    final factory = newDatabaseFactoryMemory();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          databaseFactoryProvider.overrideWithValue(factory),
        ],
        child: const NefesApp(),
      ),
    );

    // Avoid pumpAndSettle — HomeViewModel has a 1s ticker.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  }

  testWidgets('Home shows Turkish labels including M3 actions', (tester) async {
    await pumpHome(tester);

    expect(find.text(AppStrings.appName), findsOneWidget);
    expect(find.text(AppStrings.iSmoked), findsOneWidget);
    expect(
      find.text(AppStrings.sinceLastCigarette.toUpperCase()),
      findsOneWidget,
    );
    expect(find.text(AppStrings.emptyTodayHistory), findsOneWidget);
    expect(find.text(AppStrings.todayProgress(0, 15)), findsOneWidget);
    expect(find.text(AppStrings.delayNow), findsOneWidget);
    expect(find.text(AppStrings.delayHint), findsOneWidget);
    expect(find.text(AppStrings.navToday), findsWidgets);
    expect(find.text(AppStrings.navHistory), findsOneWidget);
    expect(find.text(AppStrings.navInsights), findsOneWidget);
    expect(find.text(AppStrings.navSettings), findsOneWidget);
  });

  testWidgets('Today actions remain visible at phone and desktop widths', (
    tester,
  ) async {
    for (final width in [360.0, 390.0, 412.0, 430.0, 1024.0, 1440.0]) {
      await tester.binding.setSurfaceSize(Size(width, 900));
      addTearDown(() async {
        await tester.binding.setSurfaceSize(null);
      });

      await pumpHome(tester);

      expect(
        find.text(AppStrings.iSmoked),
        findsOneWidget,
        reason: 'primary missing at width $width',
      );
      expect(
        find.text(AppStrings.delayNow),
        findsOneWidget,
        reason: 'secondary missing at width $width',
      );

      expect(
        tester.getSize(find.text(AppStrings.iSmoked)).height,
        greaterThan(0),
        reason: 'primary zero height @$width',
      );
      expect(
        tester.getSize(find.text(AppStrings.delayNow)).height,
        greaterThan(0),
        reason: 'secondary zero height @$width',
      );
    }
  });

  testWidgets('Home logs a smoke via primary action without blocking modal', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(412, 915));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    await pumpHome(tester);

    final primary = find.text(AppStrings.iSmoked);
    await tester.ensureVisible(primary);
    await tester.tap(primary);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Capture-first: no mandatory trigger modal / skip button.
    expect(find.text(AppStrings.triggerSkip), findsNothing);
    expect(find.text(AppStrings.whyOptional), findsOneWidget);
    expect(find.text(AppStrings.todayProgress(1, 15)), findsOneWidget);
    expect(find.text(AppStrings.emptyTodayHistory), findsNothing);
    // Primary action remains visible after logging (timeline also uses the label).
    expect(find.text(AppStrings.iSmoked), findsWidgets);
    // Allow snapshot stream to mark undo available; snackbar action is best-effort.
    await tester.pump(const Duration(milliseconds: 400));
    // Undo stays available via overflow menu even if snackbar action raced.
    await tester.ensureVisible(find.byTooltip(AppStrings.smokedEarlier));
    await tester.tap(find.byTooltip(AppStrings.smokedEarlier));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.undoLast), findsWidgets);
  });
}
