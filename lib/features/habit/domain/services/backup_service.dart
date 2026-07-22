import 'dart:convert';

import 'package:nefes/features/habit/domain/entities/daily_target_period.dart';
import 'package:nefes/features/habit/domain/entities/habit_type.dart';
import 'package:nefes/features/habit/repository/target_history_repository.dart';
import 'package:nefes/features/smoking/data/mappers/smoking_log_mapper.dart';
import 'package:nefes/features/smoking/domain/entities/home_snapshot.dart';
import 'package:nefes/features/smoking/repository/settings_repository.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

/// Versioned local backup format.
class NefesBackupDocument {
  const NefesBackupDocument({
    required this.version,
    required this.exportedAtUtc,
    required this.settings,
    required this.events,
    required this.targets,
  });

  static const int currentVersion = 1;

  final int version;
  final DateTime exportedAtUtc;
  final AppSettings settings;
  final List<Map<String, Object?>> events;
  final List<Map<String, Object?>> targets;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'nefesBackupVersion': version,
        'exportedAtUtc': exportedAtUtc.toIso8601String(),
        'habitType': HabitType.smoking.storageId,
        'settings': <String, dynamic>{
          'hasCompletedOnboarding': settings.hasCompletedOnboarding,
          'dailyTarget': settings.dailyTarget,
          'averagePerDay': settings.averagePerDay,
        },
        'events': events,
        'targets': targets,
      };

  static NefesBackupDocument parse(String raw) {
    final decoded = jsonDecode(raw);
    if (decoded is! Map) {
      throw const FormatException('Geçersiz yedek dosyası.');
    }
    final map = Map<String, dynamic>.from(decoded);
    final version = map['nefesBackupVersion'];
    if (version is! int || version < 1 || version > currentVersion) {
      throw const FormatException('Desteklenmeyen yedek sürümü.');
    }
    final settingsMap = map['settings'];
    if (settingsMap is! Map) {
      throw const FormatException('Yedekte ayarlar eksik.');
    }
    final events = map['events'];
    final targets = map['targets'];
    if (events is! List || targets is! List) {
      throw const FormatException('Yedekte olay veya hedef listesi eksik.');
    }

    final settings = AppSettings(
      hasCompletedOnboarding:
          settingsMap['hasCompletedOnboarding'] as bool? ?? false,
      dailyTarget: settingsMap['dailyTarget'] as int? ?? 20,
      averagePerDay: settingsMap['averagePerDay'] as int?,
    );

    final exported = DateTime.tryParse(map['exportedAtUtc'] as String? ?? '') ??
        DateTime.now().toUtc();

    return NefesBackupDocument(
      version: version,
      exportedAtUtc: exported.isUtc ? exported : exported.toUtc(),
      settings: settings,
      events: events
          .whereType<Map>()
          .map((e) => Map<String, Object?>.from(e))
          .toList(),
      targets: targets
          .whereType<Map>()
          .map((e) => Map<String, Object?>.from(e))
          .toList(),
    );
  }
}

class BackupService {
  const BackupService({
    required this.smokingRepository,
    required this.settingsRepository,
    required this.targetHistoryRepository,
  });

  final SmokingRepository smokingRepository;
  final SettingsRepository settingsRepository;
  final TargetHistoryRepository targetHistoryRepository;

  Future<String> exportJson() async {
    final events = await smokingRepository.getAllEvents();
    final settings = await settingsRepository.getSettings();
    final targets = await targetHistoryRepository.getAll();
    final doc = NefesBackupDocument(
      version: NefesBackupDocument.currentVersion,
      exportedAtUtc: DateTime.now().toUtc(),
      settings: settings,
      events: events.map(SmokingLogMapper.toRecord).toList(),
      targets: targets.map((t) => t.toRecord()).toList(),
    );
    return const JsonEncoder.withIndent('  ').convert(doc.toJson());
  }

  /// Full replace after validation — never partial merge.
  Future<void> importReplace(String raw) async {
    final doc = NefesBackupDocument.parse(raw);
    // Validate events can be mapped.
    final events = doc.events.map(SmokingLogMapper.fromRecord).toList();
    final targets = doc.targets.map(DailyTargetPeriod.fromRecord).toList();

    await smokingRepository.replaceAllEvents(events);
    await targetHistoryRepository.replaceAll(targets);
    if (doc.settings.hasCompletedOnboarding) {
      await settingsRepository.completeOnboarding(
        averagePerDay: doc.settings.averagePerDay ?? doc.settings.dailyTarget,
        dailyTarget: doc.settings.dailyTarget,
      );
    } else {
      await settingsRepository.setDailyTarget(doc.settings.dailyTarget);
    }
  }
}
