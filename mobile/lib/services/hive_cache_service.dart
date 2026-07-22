import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/models/incident.dart';

final hiveCacheServiceProvider = Provider<HiveCacheService>((ref) {
  return HiveCacheService();
});

/// Offline-first local cache (Hive).
class HiveCacheService {
  static const String userBox = 'user_cache';
  static const String metaBox = 'meta_cache';
  static const String syncQueueBox = 'sync_queue';
  static const String violationsBox = 'violations_cache';
  static const String incidentsBox = 'incidents_cache';
  static const String incidentTypesBox = 'incident_types_cache';
  static const String notificationsBox = 'notifications_cache';
  static const String tasksBox = 'tasks_cache';
  static const String dashboardBox = 'dashboard_cache';
  static const String settingsBox = 'settings_cache';

  Future<void> init() async {
    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<dynamic>(userBox),
      Hive.openBox<dynamic>(metaBox),
      Hive.openBox<dynamic>(syncQueueBox),
      Hive.openBox<dynamic>(violationsBox),
      Hive.openBox<dynamic>(incidentsBox),
      Hive.openBox<dynamic>(incidentTypesBox),
      Hive.openBox<dynamic>(notificationsBox),
      Hive.openBox<dynamic>(tasksBox),
      Hive.openBox<dynamic>(dashboardBox),
      Hive.openBox<dynamic>(settingsBox),
    ]);
  }

  Box<dynamic> get users => Hive.box<dynamic>(userBox);
  Box<dynamic> get meta => Hive.box<dynamic>(metaBox);
  Box<dynamic> get syncQueue => Hive.box<dynamic>(syncQueueBox);
  Box<dynamic> get violations => Hive.box<dynamic>(violationsBox);
  Box<dynamic> get incidents => Hive.box<dynamic>(incidentsBox);
  Box<dynamic> get incidentTypes => Hive.box<dynamic>(incidentTypesBox);
  Box<dynamic> get notifications => Hive.box<dynamic>(notificationsBox);
  Box<dynamic> get tasks => Hive.box<dynamic>(tasksBox);
  Box<dynamic> get dashboard => Hive.box<dynamic>(dashboardBox);
  Box<dynamic> get settings => Hive.box<dynamic>(settingsBox);

  Future<void> cacheUser(Map<String, dynamic> user) async {
    await users.put(StorageKeys.cachedUser, user);
  }

  Map<String, dynamic>? readCachedUser() {
    final raw = users.get(StorageKeys.cachedUser);
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return null;
  }

  Future<void> clearUser() async {
    await users.delete(StorageKeys.cachedUser);
  }

  Future<void> setLastSyncAt(DateTime at) async {
    await meta.put(StorageKeys.lastSyncAt, at.toIso8601String());
  }

  DateTime? lastSyncAt() {
    final raw = meta.get(StorageKeys.lastSyncAt);
    if (raw is String) return DateTime.tryParse(raw);
    return null;
  }

  Future<void> enqueueSync(Map<String, dynamic> payload) async {
    await syncQueue.add(payload);
  }

  List<Map<String, dynamic>> pendingSyncItems() {
    return syncQueue.values
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<void> clearSyncQueue() async {
    await syncQueue.clear();
  }

  Future<void> cacheIncidentTypes(List<Map<String, dynamic>> types) async {
    await incidentTypes.clear();
    for (var i = 0; i < types.length; i++) {
      await incidentTypes.put(types[i]['id']?.toString() ?? '$i', types[i]);
    }
  }

  List<IncidentTypeOption> readIncidentTypes() {
    return incidentTypes.values
        .whereType<Map>()
        .map((e) => IncidentTypeOption.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  }

  Future<void> cacheDashboard(Map<String, dynamic> summary) async {
    await dashboard.put('summary', summary);
  }

  DashboardSummary? readDashboard({required bool isConnected}) {
    final raw = dashboard.get('summary');
    if (raw is! Map) return null;
    return DashboardSummary.fromJson(
      Map<String, dynamic>.from(raw),
      isConnected: isConnected,
      cachedLastSync: lastSyncAt(),
    );
  }

  Future<void> cacheNotifications(List<AppNotification> items) async {
    await notifications.clear();
    for (final item in items) {
      await notifications.put(item.id, item.toJson());
    }
  }

  Future<void> upsertNotification(AppNotification item) async {
    await notifications.put(item.id, item.toJson());
  }

  List<AppNotification> readNotifications() {
    return notifications.values
        .whereType<Map>()
        .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> cacheTasks(List<OpsTask> items) async {
    await tasks.clear();
    for (final item in items) {
      await tasks.put(item.id, item.toJson());
    }
  }

  Future<void> upsertTask(OpsTask item) async {
    await tasks.put(item.id, item.toJson());
  }

  List<OpsTask> readTasks() {
    return tasks.values
        .whereType<Map>()
        .map((e) => OpsTask.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> setSetting(String key, dynamic value) async {
    await settings.put(key, value);
  }

  T? readSetting<T>(String key) {
    final raw = settings.get(key);
    if (raw is T) return raw;
    return null;
  }
}
