import 'package:intl/intl.dart';

/// Formats UTC instants and durations for local Turkish display.
///
/// Month/weekday names are hand-rolled (not `DateFormat(..., 'tr_TR')`) so
/// these formatters never depend on `initializeDateFormatting` having run —
/// safe to call from any entry point, including widget tests.
abstract final class TimeDisplay {
  static final _timeFormat = DateFormat.Hm();

  static const _monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];

  static const _weekdayNames = [
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
    'Pazar',
  ];

  static String formatLocalHm(DateTime createdAtUtc) {
    return _timeFormat.format(createdAtUtc.toLocal());
  }

  /// Live timer: `HH:MM:SS` (hours can exceed 24).
  static String formatElapsedClock(Duration elapsed) {
    final totalSeconds = elapsed.inSeconds < 0 ? 0 : elapsed.inSeconds;
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;
    return '${hours.toString().padLeft(2, '0')}:'
        '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  /// History gap: `1 sa 18 dk` (omit zero parts sensibly).
  static String formatIntervalShort(Duration gap) {
    final totalMinutes = gap.inMinutes < 0 ? 0 : gap.inMinutes;
    if (totalMinutes < 1) {
      final seconds = gap.inSeconds < 0 ? 0 : gap.inSeconds;
      return '$seconds sn';
    }
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return '$hours sa $minutes dk';
    }
    if (hours > 0) {
      return '$hours sa';
    }
    return '$minutes dk';
  }

  /// Long local date: `22 Temmuz 2026`.
  static String formatLongDate(DateTime local) =>
      '${local.day} ${_monthNames[local.month - 1]} ${local.year}';

  /// Weekday date header: `22 Temmuz Çarşamba`.
  static String formatWeekdayDateHeader(DateTime local) =>
      '${local.day} ${_monthNames[local.month - 1]} '
      '${_weekdayNames[local.weekday - 1]}';

  /// Month + year for calendar headers: `Temmuz 2026`.
  static String formatMonthYear(DateTime local) =>
      '${_monthNames[local.month - 1]} ${local.year}';
}
