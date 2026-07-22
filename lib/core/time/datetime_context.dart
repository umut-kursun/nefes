/// Temporal context captured at event write time (UTC + local projection).
class DateTimeContext {
  const DateTimeContext({
    required this.createdAtUtc,
    required this.localDay,
    required this.localMonth,
    required this.localYear,
    required this.localHour,
    required this.localMinute,
    required this.localWeekday,
    required this.timezone,
    required this.utcOffsetMinutes,
  });

  final DateTime createdAtUtc;
  final int localDay;
  final int localMonth;
  final int localYear;
  final int localHour;
  final int localMinute;
  final int localWeekday;
  final String timezone;
  final int utcOffsetMinutes;

  /// Builds context from a clock instant using the device/browser local zone.
  factory DateTimeContext.fromNow([DateTime? now]) {
    final local = now ?? DateTime.now();
    final utc = local.toUtc();
    final offset = local.timeZoneOffset;

    return DateTimeContext(
      createdAtUtc: utc,
      localDay: local.day,
      localMonth: local.month,
      localYear: local.year,
      localHour: local.hour,
      localMinute: local.minute,
      localWeekday: local.weekday,
      timezone: local.timeZoneName,
      utcOffsetMinutes: offset.inMinutes,
    );
  }
}
