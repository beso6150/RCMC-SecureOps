import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/services/dashboard_api_service.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/notifications_api_service.dart';
import 'package:rcmc_secureops/services/tasks_api_service.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(
    api: ref.watch(dashboardApiServiceProvider),
    notificationsApi: ref.watch(notificationsApiServiceProvider),
    tasksApi: ref.watch(tasksApiServiceProvider),
    hive: ref.watch(hiveCacheServiceProvider),
  );
});

class DashboardRepository {
  DashboardRepository({
    required this.api,
    required this.notificationsApi,
    required this.tasksApi,
    required this.hive,
  });

  final DashboardApiService api;
  final NotificationsApiService notificationsApi;
  final TasksApiService tasksApi;
  final HiveCacheService hive;

  DashboardSummary? readCached({required bool isConnected}) {
    return hive.readDashboard(isConnected: isConnected);
  }

  Future<DashboardSummary> fetchAndCache({required bool isConnected}) async {
    final summary = await api.fetchSummary(isConnected: isConnected);
    await hive.cacheDashboard(summary.toJson());
    await hive.setLastSyncAt(DateTime.now());
    return summary.copyWith(
      lastSyncAt: hive.lastSyncAt(),
      isConnected: isConnected,
    );
  }

  Future<List<AppNotification>> fetchNotifications({
    required bool online,
    String? status,
  }) async {
    if (!online) return hive.readNotifications();
    try {
      final remote = await notificationsApi.list(status: status);
      await hive.cacheNotifications(remote);
      return remote;
    } catch (_) {
      final cached = hive.readNotifications();
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<AppNotification> getNotification(String id) async {
    final local = hive.readNotifications().where((e) => e.id == id).toList();
    try {
      final remote = await notificationsApi.getById(id);
      await hive.upsertNotification(remote);
      return remote;
    } catch (_) {
      if (local.isNotEmpty) return local.first;
      rethrow;
    }
  }

  Future<AppNotification> markNotificationRead(String id) async {
    final updated = await notificationsApi.markRead(id);
    await hive.upsertNotification(updated);
    return updated;
  }

  Future<AppNotification> acknowledgeNotification(String id) async {
    final updated = await notificationsApi.acknowledge(id);
    await hive.upsertNotification(updated);
    return updated;
  }

  Future<void> markAllNotificationsRead() async {
    await notificationsApi.markAllRead();
    final items = hive.readNotifications().map(
      (e) => e.copyWith(
        status: AppNotificationStatus.read,
        readAt: DateTime.now(),
      ),
    );
    await hive.cacheNotifications(items.toList());
  }

  Future<List<OpsTask>> fetchTasks({
    required bool online,
    String? status,
    bool overdue = false,
  }) async {
    if (!online) return hive.readTasks();
    try {
      final remote = await tasksApi.list(
        status: status,
        overdue: overdue,
        mine: true,
      );
      await hive.cacheTasks(remote);
      return remote;
    } catch (_) {
      final cached = hive.readTasks();
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<OpsTask> completeTask(String id) async {
    final updated = await tasksApi.complete(id);
    await hive.upsertTask(updated);
    return updated;
  }

  Future<OpsTask> acceptTask(String id) async {
    final updated = await tasksApi.accept(id);
    await hive.upsertTask(updated);
    return updated;
  }

  Future<OpsTask> startTask(String id) async {
    final updated = await tasksApi.start(id);
    await hive.upsertTask(updated);
    return updated;
  }

  Future<OpsTask> waitTask(String id, {String? reason}) async {
    final updated = await tasksApi.wait(id, reason: reason);
    await hive.upsertTask(updated);
    return updated;
  }

  Future<OpsTask> rejectTask(String id, {String? reason}) async {
    final updated = await tasksApi.reject(id, reason: reason);
    await hive.upsertTask(updated);
    return updated;
  }

  Future<void> uploadTaskEvidence(String id, String filePath) async {
    await tasksApi.uploadEvidence(id: id, filePath: filePath);
  }
}
