/// Stable smoking trigger identifiers for analytics (M3).
///
/// Display labels live in presentation/l10n — never store Turkish strings as IDs.
enum SmokingTrigger {
  habit,
  craving,
  stress,
  coffeeTea,
  afterMeal,
  social,
  other;

  /// Storage key (snake_case) for forward-compatible persistence.
  String get storageId => switch (this) {
    SmokingTrigger.habit => 'habit',
    SmokingTrigger.craving => 'craving',
    SmokingTrigger.stress => 'stress',
    SmokingTrigger.coffeeTea => 'coffee_tea',
    SmokingTrigger.afterMeal => 'after_meal',
    SmokingTrigger.social => 'social',
    SmokingTrigger.other => 'other',
  };

  static SmokingTrigger? tryParse(String? value) {
    if (value == null || value.isEmpty) return null;
    for (final trigger in SmokingTrigger.values) {
      if (trigger.storageId == value || trigger.name == value) {
        return trigger;
      }
    }
    return null;
  }
}

/// How an active delay session ended.
enum DelayOutcome {
  /// User smoked while delaying — duration still valuable.
  smoked,

  /// Urge passed without smoking.
  completed,

  /// Accidental start cancelled — not a successful resistance.
  cancelled;

  String get storageId => name;

  static DelayOutcome fromStorage(String value) {
    return DelayOutcome.values.firstWhere(
      (e) => e.name == value,
      orElse: () => DelayOutcome.cancelled,
    );
  }
}
