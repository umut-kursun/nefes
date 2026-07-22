import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_trigger.dart';

/// Presentation labels for [SmokingTrigger] (Turkish).
abstract final class SmokingTriggerLabels {
  static String label(SmokingTrigger trigger) => switch (trigger) {
    SmokingTrigger.habit => AppStrings.triggerHabit,
    SmokingTrigger.craving => AppStrings.triggerCraving,
    SmokingTrigger.stress => AppStrings.triggerStress,
    SmokingTrigger.coffeeTea => AppStrings.triggerCoffeeTea,
    SmokingTrigger.afterMeal => AppStrings.triggerAfterMeal,
    SmokingTrigger.social => AppStrings.triggerSocial,
    SmokingTrigger.other => AppStrings.triggerOther,
  };

  static const ordered = SmokingTrigger.values;
}
