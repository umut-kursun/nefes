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
    expect(find.text(AppStrings.sinceLastCigarette.toUpperCase()), findsOneWidget);
    expect(find.text(AppStrings.emptyTodayHistory), findsOneWidget);
    expect(find.textContaining('/ 15'), findsOneWidget);
    expect(find.text(AppStrings.delayNow), findsOneWidget);
    expect(find.text(AppStrings.navToday), findsWidgets);
    expect(find.text(AppStrings.navHistory), findsOneWidget);
    expect(find.text(AppStrings.navInsights), findsOneWidget);
    expect(find.text(AppStrings.navSettings), findsOneWidget);
  });

  testWidgets('Home logs a smoke via primary action', (tester) async {
    await pumpHome(tester);

    await tester.tap(find.text(AppStrings.iSmoked));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Optional trigger sheet may appear; skip if present.
    final skip = find.text(AppStrings.triggerSkip);
    if (skip.evaluate().isNotEmpty) {
      await tester.tap(skip);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.textContaining('1 / 15'), findsOneWidget);
    expect(find.text(AppStrings.emptyTodayHistory), findsNothing);
    expect(find.text(AppStrings.undoLast), findsOneWidget);
  });
}
