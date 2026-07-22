/// Stable habit type identifiers for multi-habit readiness.
///
/// Smoking is the only fully implemented module in V1.
enum HabitType {
  smoking;

  String get storageId => name;

  static HabitType fromStorage(String? value) {
    if (value == null || value.isEmpty) return HabitType.smoking;
    for (final type in HabitType.values) {
      if (type.storageId == value || type.name == value) return type;
    }
    // Unknown future types fall back safely to smoking for V1 UI.
    return HabitType.smoking;
  }
}

/// Catalog entry for a habit module (labels live in l10n/presentation).
class HabitModule {
  const HabitModule({
    required this.type,
    required this.isAvailable,
  });

  final HabitType type;
  final bool isAvailable;

  static const smoking = HabitModule(
    type: HabitType.smoking,
    isAvailable: true,
  );

  static const all = [smoking];
}
