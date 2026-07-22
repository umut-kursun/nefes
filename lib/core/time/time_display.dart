import 'package:intl/intl.dart';

/// Formats UTC instants and durations for local Turkish display.
abstract final class TimeDisplay {
  static final _timeFormat = DateFormat.Hm();

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
}
