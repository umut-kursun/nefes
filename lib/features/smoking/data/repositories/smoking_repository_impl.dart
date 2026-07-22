import 'package:nefes/features/smoking/data/datasources/smoking_local_data_source.dart';
import 'package:nefes/features/smoking/domain/entities/smoking_log_event.dart';
import 'package:nefes/features/smoking/repository/smoking_repository.dart';

class SmokingRepositoryImpl implements SmokingRepository {
  SmokingRepositoryImpl(this._dataSource);

  final SmokingLocalDataSource _dataSource;

  @override
  Future<void> append(SmokingLogEvent event) {
    return _dataSource.append(event);
  }

  @override
  Future<void> appendAll(List<SmokingLogEvent> events) {
    return _dataSource.appendAll(events);
  }

  @override
  Future<List<SmokingLogEvent>> getAllEvents() {
    return _dataSource.getAllEvents();
  }

  @override
  Future<void> replaceAllEvents(List<SmokingLogEvent> events) {
    return _dataSource.replaceAllEvents(events);
  }

  @override
  Stream<List<SmokingLogEvent>> watchAllEvents() {
    return _dataSource.watchAllEvents();
  }

  @override
  Stream<List<SmokingLogEvent>> watchActiveSmokeEvents() {
    return _dataSource.watchActiveSmokeEvents();
  }

  @override
  Future<List<SmokingLogEvent>> getSmokeEventsBetweenUtc({
    required DateTime fromUtc,
    required DateTime toUtc,
  }) {
    return _dataSource.getSmokeEventsBetweenUtc(
      fromUtc: fromUtc,
      toUtc: toUtc,
    );
  }
}
