import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/core/rbac/route_guard.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/repositories/dashboard_repository.dart';
import 'package:rcmc_secureops/services/push_notification_service.dart';
import 'package:rcmc_secureops/services/realtime_socket_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';

final opsStatsProvider = FutureProvider<DashboardSummary>((ref) async {
  final repo = ref.watch(dashboardRepositoryProvider);
  final online = ref.watch(connectivityAwareOnlineProvider);
  final cached = repo.readCached(isConnected: online);

  if (!online) {
    return cached ?? DashboardSummary(isConnected: false, syncHealthy: false);
  }

  try {
    return await repo.fetchAndCache(isConnected: online);
  } catch (_) {
    if (cached != null) {
      return cached.copyWith(isConnected: online, syncHealthy: false);
    }
    rethrow;
  }
});

final unreadNotificationsCountProvider = Provider<int>((ref) {
  final stats = ref
      .watch(opsStatsProvider)
      .maybeWhen(data: (s) => s.unreadNotifications, orElse: () => 0);
  final local = ref.watch(notificationsControllerProvider);
  final localUnread = local.items.where((e) => e.isUnread).length;
  return localUnread > stats ? localUnread : stats;
});

String formatLastSyncAr(DateTime? at) {
  if (at == null) return 'لم تتم المزامنة بعد';
  return DateFormat('yyyy/MM/dd HH:mm', 'ar').format(at);
}

/// Boots Socket.IO when authenticated and refreshes dashboard/notifications live.
final realtimeBootstrapProvider = Provider<void>((ref) {
  final auth = ref.watch(authControllerProvider);
  final socket = ref.watch(realtimeSocketServiceProvider);
  final push = ref.watch(pushNotificationServiceProvider);
  final online = ref.watch(connectivityAwareOnlineProvider);

  if (auth.status != AuthStatus.authenticated) {
    socket.dispose();
    return;
  }

  unawaited(socket.connect());
  unawaited(push.init());

  // Connectivity restore → sync.
  ref.listen<AsyncValue<bool>>(connectivityProvider, (prev, next) {
    final wasOffline =
        prev?.maybeWhen(data: (v) => !v, orElse: () => false) ?? false;
    final nowOnline = next.maybeWhen(data: (v) => v, orElse: () => false);
    if (wasOffline && nowOnline) {
      unawaited(ref.read(syncServiceProvider).runSync(trigger: 'connectivity'));
    }
  });

  socket.onNotificationNew = (data) {
    ref.invalidate(opsStatsProvider);
    ref.read(notificationsControllerProvider.notifier).refresh(silent: true);
    final title = data['title']?.toString() ?? 'إشعار جديد';
    final body = data['body']?.toString() ?? '';
    unawaited(
      push.showLocal(
        title: title,
        body: body,
        payload: RouteGuard.sanitizeDeepLink(data['actionUrl']?.toString()),
      ),
    );
  };
  socket.onTaskUpdated = (_) {
    ref.invalidate(opsStatsProvider);
    ref.read(tasksControllerProvider.notifier).refresh(silent: true);
  };
  socket.onDashboardRefresh = (_) {
    ref.invalidate(opsStatsProvider);
  };

  // Ensure online flag is observed (avoids unused warning in some trees).
  if (!online) {
    // Offline — local notifications still work while app is alive.
  }
});

enum NotificationListFilter { all, unread, read }

class NotificationsListState {
  const NotificationsListState({
    this.items = const [],
    this.filter = NotificationListFilter.all,
    this.search = '',
    this.isLoading = false,
    this.errorMessage,
    this.isOnline = true,
  });

  final List<AppNotification> items;
  final NotificationListFilter filter;
  final String search;
  final bool isLoading;
  final String? errorMessage;
  final bool isOnline;

  List<AppNotification> get visible {
    return items.where((n) {
      if (search.isNotEmpty) {
        final q = search.trim();
        final hay = '${n.title}${n.body}${n.sender?.fullName ?? ''}';
        if (!hay.contains(q)) return false;
      }
      switch (filter) {
        case NotificationListFilter.unread:
          return n.isUnread;
        case NotificationListFilter.read:
          return !n.isUnread;
        case NotificationListFilter.all:
          return true;
      }
    }).toList();
  }

  NotificationsListState copyWith({
    List<AppNotification>? items,
    NotificationListFilter? filter,
    String? search,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool? isOnline,
  }) {
    return NotificationsListState(
      items: items ?? this.items,
      filter: filter ?? this.filter,
      search: search ?? this.search,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

final notificationsControllerProvider =
    StateNotifierProvider<NotificationsController, NotificationsListState>((
      ref,
    ) {
      return NotificationsController(ref);
    });

class NotificationsController extends StateNotifier<NotificationsListState> {
  NotificationsController(this.ref) : super(const NotificationsListState()) {
    _sub = ref.listen<AsyncValue<bool>>(connectivityProvider, (_, next) {
      final online = next.maybeWhen(
        data: (v) => v,
        orElse: () => state.isOnline,
      );
      state = state.copyWith(isOnline: online);
      if (online) unawaited(refresh(silent: true));
    });
    unawaited(refresh());
  }

  final Ref ref;
  late final ProviderSubscription<AsyncValue<bool>> _sub;

  DashboardRepository get _repo => ref.read(dashboardRepositoryProvider);

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, clearError: true);
    }
    final online = ref.read(connectivityAwareOnlineProvider);
    state = state.copyWith(
      isOnline: online,
      items: _repo.hive.readNotifications(),
    );

    try {
      final items = await _repo.fetchNotifications(online: online);
      state = state.copyWith(items: items, isLoading: false);
      ref.invalidate(opsStatsProvider);
    } catch (e) {
      state = state.copyWith(
        items: _repo.hive.readNotifications(),
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  void setFilter(NotificationListFilter filter) {
    state = state.copyWith(filter: filter);
  }

  void setSearch(String value) {
    state = state.copyWith(search: value);
  }

  Future<void> markRead(String id) async {
    final updated = await _repo.markNotificationRead(id);
    final items = state.items
        .map((e) => e.id == id ? updated : e)
        .toList(growable: false);
    state = state.copyWith(items: items);
    ref.invalidate(opsStatsProvider);
  }

  Future<void> acknowledge(String id) async {
    final updated = await _repo.acknowledgeNotification(id);
    final items = state.items
        .map((e) => e.id == id ? updated : e)
        .toList(growable: false);
    state = state.copyWith(items: items);
    ref.invalidate(opsStatsProvider);
  }

  Future<void> markAllRead() async {
    await _repo.markAllNotificationsRead();
    await refresh(silent: true);
  }
}

enum TaskListFilter { assigned, pending, completed, overdue }

class TasksListState {
  const TasksListState({
    this.items = const [],
    this.filter = TaskListFilter.assigned,
    this.isLoading = false,
    this.errorMessage,
    this.isOnline = true,
  });

  final List<OpsTask> items;
  final TaskListFilter filter;
  final bool isLoading;
  final String? errorMessage;
  final bool isOnline;

  List<OpsTask> get visible {
    return items.where((t) {
      switch (filter) {
        case TaskListFilter.pending:
          return t.status == OpsTaskStatus.pending ||
              t.status == OpsTaskStatus.inProgress;
        case TaskListFilter.completed:
          return t.status == OpsTaskStatus.completed;
        case TaskListFilter.overdue:
          return t.isOverdue || t.status == OpsTaskStatus.overdue;
        case TaskListFilter.assigned:
          return t.status != OpsTaskStatus.cancelled;
      }
    }).toList();
  }

  TasksListState copyWith({
    List<OpsTask>? items,
    TaskListFilter? filter,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool? isOnline,
  }) {
    return TasksListState(
      items: items ?? this.items,
      filter: filter ?? this.filter,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

final tasksControllerProvider =
    StateNotifierProvider<TasksController, TasksListState>((ref) {
      return TasksController(ref);
    });

class TasksController extends StateNotifier<TasksListState> {
  TasksController(this.ref) : super(const TasksListState()) {
    _sub = ref.listen<AsyncValue<bool>>(connectivityProvider, (_, next) {
      final online = next.maybeWhen(
        data: (v) => v,
        orElse: () => state.isOnline,
      );
      state = state.copyWith(isOnline: online);
      if (online) unawaited(refresh(silent: true));
    });
    unawaited(refresh());
  }

  final Ref ref;
  late final ProviderSubscription<AsyncValue<bool>> _sub;

  DashboardRepository get _repo => ref.read(dashboardRepositoryProvider);

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, clearError: true);
    }
    final online = ref.read(connectivityAwareOnlineProvider);
    state = state.copyWith(isOnline: online, items: _repo.hive.readTasks());

    try {
      final overdueOnly = state.filter == TaskListFilter.overdue;
      final items = await _repo.fetchTasks(
        online: online,
        overdue: overdueOnly,
      );
      state = state.copyWith(items: items, isLoading: false);
      ref.invalidate(opsStatsProvider);
    } catch (e) {
      state = state.copyWith(
        items: _repo.hive.readTasks(),
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  void setFilter(TaskListFilter filter) {
    state = state.copyWith(filter: filter);
    unawaited(refresh(silent: true));
  }

  Future<void> complete(String id) async {
    final updated = await _repo.completeTask(id);
    final items = state.items
        .map((e) => e.id == id ? updated : e)
        .toList(growable: false);
    state = state.copyWith(items: items);
    ref.invalidate(opsStatsProvider);
  }

  Future<void> accept(String id) async {
    final updated = await _repo.acceptTask(id);
    _replace(updated);
  }

  Future<void> start(String id) async {
    final updated = await _repo.startTask(id);
    _replace(updated);
  }

  Future<void> wait(String id, {String? reason}) async {
    final updated = await _repo.waitTask(id, reason: reason);
    _replace(updated);
  }

  Future<void> reject(String id, {String? reason}) async {
    final updated = await _repo.rejectTask(id, reason: reason);
    _replace(updated);
  }

  Future<void> uploadEvidence(String id, String filePath) async {
    await _repo.uploadTaskEvidence(id, filePath);
  }

  void _replace(OpsTask updated) {
    final items = state.items
        .map((e) => e.id == updated.id ? updated : e)
        .toList(growable: false);
    state = state.copyWith(items: items);
    ref.invalidate(opsStatsProvider);
  }
}

final notificationDetailProvider =
    FutureProvider.family<AppNotification, String>((ref, id) async {
      return ref.watch(dashboardRepositoryProvider).getNotification(id);
    });
