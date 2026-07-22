/// Daily target that applies from a local calendar day forward.
class DailyTargetPeriod {
  const DailyTargetPeriod({
    required this.id,
    required this.habitType,
    required this.target,
    required this.effectiveFromLocalYear,
    required this.effectiveFromLocalMonth,
    required this.effectiveFromLocalDay,
    required this.createdAtUtc,
  });

  final String id;
  final String habitType;
  final int target;
  final int effectiveFromLocalYear;
  final int effectiveFromLocalMonth;
  final int effectiveFromLocalDay;
  final DateTime createdAtUtc;

  DateTime get effectiveFromLocalDate => DateTime(
        effectiveFromLocalYear,
        effectiveFromLocalMonth,
        effectiveFromLocalDay,
      );

  Map<String, Object?> toRecord() => <String, Object?>{
        'id': id,
        'habitType': habitType,
        'target': target,
        'effectiveFromLocalYear': effectiveFromLocalYear,
        'effectiveFromLocalMonth': effectiveFromLocalMonth,
        'effectiveFromLocalDay': effectiveFromLocalDay,
        'createdAtUtc': createdAtUtc.millisecondsSinceEpoch,
      };

  static DailyTargetPeriod fromRecord(Map<String, Object?> record) {
    return DailyTargetPeriod(
      id: record['id']! as String,
      habitType: record['habitType']! as String,
      target: record['target']! as int,
      effectiveFromLocalYear: record['effectiveFromLocalYear']! as int,
      effectiveFromLocalMonth: record['effectiveFromLocalMonth']! as int,
      effectiveFromLocalDay: record['effectiveFromLocalDay']! as int,
      createdAtUtc: DateTime.fromMillisecondsSinceEpoch(
        record['createdAtUtc']! as int,
        isUtc: true,
      ),
    );
  }
}
