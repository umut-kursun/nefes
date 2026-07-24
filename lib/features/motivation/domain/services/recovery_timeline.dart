import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/motivation/domain/entities/recovery_milestone.dart';

/// Established recovery thresholds for the Today “Vücudunda olanlar” feed.
///
/// Copy stays calm and non-diagnostic — general timeline facts only.
abstract final class RecoveryTimeline {
  static const List<RecoveryMilestone> milestones = [
    RecoveryMilestone(
      id: 'r_20m',
      at: Duration(minutes: 20),
      timeLabel: AppStrings.recoveryLabel20m,
      body: AppStrings.recoveryBody20m,
    ),
    RecoveryMilestone(
      id: 'r_2h',
      at: Duration(hours: 2),
      timeLabel: AppStrings.recoveryLabel2h,
      body: AppStrings.recoveryBody2h,
    ),
    RecoveryMilestone(
      id: 'r_8h',
      at: Duration(hours: 8),
      timeLabel: AppStrings.recoveryLabel8h,
      body: AppStrings.recoveryBody8h,
    ),
    RecoveryMilestone(
      id: 'r_12h',
      at: Duration(hours: 12),
      timeLabel: AppStrings.recoveryLabel12h,
      body: AppStrings.recoveryBody12h,
    ),
    RecoveryMilestone(
      id: 'r_24h',
      at: Duration(hours: 24),
      timeLabel: AppStrings.recoveryLabel24h,
      body: AppStrings.recoveryBody24h,
    ),
    RecoveryMilestone(
      id: 'r_48h',
      at: Duration(hours: 48),
      timeLabel: AppStrings.recoveryLabel48h,
      body: AppStrings.recoveryBody48h,
    ),
    RecoveryMilestone(
      id: 'r_72h',
      at: Duration(hours: 72),
      timeLabel: AppStrings.recoveryLabel72h,
      body: AppStrings.recoveryBody72h,
    ),
    RecoveryMilestone(
      id: 'r_1w',
      at: Duration(days: 7),
      timeLabel: AppStrings.recoveryLabel1w,
      body: AppStrings.recoveryBody1w,
    ),
  ];
}
