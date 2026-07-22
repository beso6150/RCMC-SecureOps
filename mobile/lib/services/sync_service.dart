import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/core/sync/conflict_mapper.dart';
import 'package:rcmc_secureops/core/sync/idempotency.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/core/sync/sync_queue_models.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/incidents_api_service.dart';
import 'package:rcmc_secureops/services/mobile_api_service.dart';
import 'package:rcmc_secureops/services/sqlite_service.dart';
import 'package:rcmc_secureops/services/violations_api_service.dart';
import 'package:uuid/uuid.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  final engine = SyncService(
    dio: ref.watch(dioProvider),
    hive: ref.watch(hiveCacheServiceProvider),
    sqlite: ref.watch(sqliteServiceProvider),
    mobileApi: ref.watch(mobileApiServiceProvider),
  );
  ref.onDispose(engine.dispose);
  return engine;
});

final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((results) {
    if (results.isEmpty) return false;
    return !results.every((r) => r == ConnectivityResult.none);
  });
});

final connectivityAwareOnlineProvider = Provider<bool>((ref) {
  return ref
      .watch(connectivityProvider)
      .maybeWhen(data: (v) => v, orElse: () => true);
});

final syncStatusTickProvider = StreamProvider<int>((ref) {
  return Stream.periodic(const Duration(seconds: 5), (i) => i);
});

/// Offline sync engine with a single-flight mutex.
class SyncService {
  SyncService({
    required this.dio,
    required this.hive,
    required this.sqlite,
    required this.mobileApi,
    IdempotencyKeyGenerator? keys,
    SyncConflictMapper? conflictMapper,
  }) : keys = keys ?? IdempotencyKeyGenerator(),
       conflictMapper = conflictMapper ?? const SyncConflictMapper();

  final Dio dio;
  final HiveCacheService hive;
  final SqliteService sqlite;
  final MobileApiService mobileApi;
  final IdempotencyKeyGenerator keys;
  final SyncConflictMapper conflictMapper;
  final _uuid = const Uuid();

  bool _syncing = false;
  Timer? _periodic;
  final _listeners = <void Function()>[];

  bool get isSyncing => _syncing;

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notify() {
    for (final l in List.of(_listeners)) {
      l();
    }
  }

  /// Start ~180s foreground periodic sync.
  void startPeriodicSync({Duration interval = const Duration(seconds: 180)}) {
    _periodic?.cancel();
    _periodic = Timer.periodic(interval, (_) {
      unawaited(runSync(trigger: 'periodic'));
    });
  }

  void stopPeriodicSync() {
    _periodic?.cancel();
    _periodic = null;
  }

  void dispose() {
    stopPeriodicSync();
    _listeners.clear();
  }

  Future<void> enqueue({
    required String entityType,
    required Map<String, dynamic> payload,
    String? operationType,
    String? endpoint,
    String httpMethod = 'POST',
    String? localEntityId,
    List<String> attachmentPaths = const [],
    String? dependencyLocalId,
  }) async {
    final op = operationType ?? entityType;
    if (OfflinePolicy.isForbiddenOffline(op) &&
        op != 'violation_create' &&
        op != 'incident_create') {
      // Still allow legacy hive enqueue for known offline-ok ops below.
    }

    final id = payload['clientSyncId']?.toString() ?? _uuid.v4();
    await hive.enqueueSync({
      'id': id,
      'entityType': entityType,
      'payload': payload,
      'createdAt': DateTime.now().toIso8601String(),
    });
    await sqlite.enqueueEvent(
      id: id,
      entityType: entityType,
      payloadJson: jsonEncode(payload),
    );

    final item = SyncQueueItem(
      localId: id,
      operationType: op,
      entityType: entityType,
      localEntityId: localEntityId,
      endpoint: endpoint ?? _defaultEndpoint(entityType),
      httpMethod: httpMethod,
      payloadJson: jsonEncode(payload),
      attachmentPathsJson: jsonEncode(attachmentPaths),
      idempotencyKey: keys.forQueueItem(
        localId: id,
        operationType: op,
        entityType: entityType,
      ),
      status: SyncQueueStatus.pending,
      createdAt: DateTime.now(),
      dependencyLocalId: dependencyLocalId,
    );
    await sqlite.insertSyncQueueItem(item);
    _notify();
  }

  String _defaultEndpoint(String entityType) {
    switch (entityType) {
      case 'violation_create':
        return '/violations';
      case 'incident_create':
        return '/incidents';
      case 'task_update':
        return '/tasks';
      case 'message_send':
        return '/communications/messages';
      case 'referral_draft':
        return '/cctv-operations/referrals';
      case 'handover_draft':
        return '/shifts/handover';
      case 'patrol_visit':
        return '/field-operations/patrols/visits';
      default:
        return '/mobile/sync/batch';
    }
  }

  Future<SyncRunResult> runSync({String trigger = 'manual'}) async {
    if (_syncing) {
      return const SyncRunResult(skipped: true, flushed: 0, pulled: false);
    }
    _syncing = true;
    _notify();
    var flushed = 0;
    var pulled = false;
    String? conflictMessage;
    try {
      // Refresh readiness / bootstrap (best-effort).
      try {
        final boot = await mobileApi.bootstrap();
        if (boot != null) {
          final perms = boot['permissions'];
          final user = hive.readCachedUser();
          if (user != null && perms is List) {
            user['permissions'] = perms
                .map((e) => e.toString())
                .toList(growable: false);
            await hive.cacheUser(user);
          }
        }
      } catch (_) {
        // Endpoint may not exist yet — continue with domain APIs.
      }

      flushed += await _flushPendingQueue();
      pulled = await _pullRemote();
      await hive.setLastSyncAt(DateTime.now());
      return SyncRunResult(
        flushed: flushed,
        pulled: pulled,
        conflictMessage: conflictMessage,
      );
    } finally {
      _syncing = false;
      _notify();
    }
  }

  Future<int> _flushPendingQueue() async {
    final pending = await sqlite.listSyncQueue(
      statuses: const [SyncQueueStatus.pending, SyncQueueStatus.failed],
    );
    if (pending.isEmpty) {
      // Legacy hive flush paths still used by repositories.
      return 0;
    }

    var flushed = 0;
    final batchable = <SyncQueueItem>[];

    for (final item in pending) {
      if (item.dependencyLocalId != null) {
        final dep = await sqlite.getSyncQueueItem(item.dependencyLocalId!);
        if (dep != null && dep.status != SyncQueueStatus.synced) {
          continue;
        }
      }

      final attachments = _parsePaths(item.attachmentPathsJson);
      if (attachments.isNotEmpty ||
          item.endpoint == '/mobile/sync/batch' ||
          item.operationType == 'photo_upload') {
        batchable.add(item);
        continue;
      }

      final ok = await _flushSingle(item);
      if (ok) flushed++;
    }

    if (batchable.isNotEmpty) {
      flushed += await _flushBatch(batchable);
    }

    return flushed;
  }

  List<String> _parsePaths(String jsonStr) {
    try {
      final raw = jsonDecode(jsonStr);
      if (raw is List) {
        return raw.map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return const [];
  }

  Future<bool> _flushSingle(SyncQueueItem item) async {
    var working = item.copyWith(
      status: SyncQueueStatus.syncing,
      lastAttemptAt: DateTime.now(),
      retryCount: item.retryCount + 1,
    );
    await sqlite.updateSyncQueueItem(working);

    try {
      final payload = jsonDecode(working.payloadJson);
      final data = payload is Map
          ? Map<String, dynamic>.from(payload)
          : <String, dynamic>{'payload': payload};

      final attachments = _parsePaths(working.attachmentPathsJson);
      Response<dynamic> response;
      if (attachments.isNotEmpty) {
        final form = FormData();
        data.forEach((k, v) => form.fields.add(MapEntry(k, '$v')));
        for (final path in attachments) {
          final file = File(path);
          if (await file.exists()) {
            form.files.add(
              MapEntry('files', await MultipartFile.fromFile(path)),
            );
          }
        }
        response = await dio.request<dynamic>(
          working.endpoint,
          data: form,
          options: Options(
            method: working.httpMethod,
            headers: {AppConfig.idempotencyHeader: working.idempotencyKey},
            extra: {AppConfig.extraIdempotencyKey: working.idempotencyKey},
            contentType: 'multipart/form-data',
          ),
        );
      } else {
        response = await dio.request<dynamic>(
          working.endpoint,
          data: data,
          options: Options(
            method: working.httpMethod,
            headers: {AppConfig.idempotencyHeader: working.idempotencyKey},
            extra: {AppConfig.extraIdempotencyKey: working.idempotencyKey},
          ),
        );
      }

      final body = response.data;
      String? serverId;
      if (body is Map && body['data'] is Map) {
        serverId = (body['data'] as Map)['id']?.toString();
      }

      working = working.copyWith(
        status: SyncQueueStatus.synced,
        syncedAt: DateTime.now(),
        serverEntityId: serverId,
        failureReason: null,
      );
      await sqlite.updateSyncQueueItem(working);
      await sqlite.markSynced(working.localId);
      return true;
    } on DioException catch (e) {
      final mapped = conflictMapper.map(
        statusCode: e.response?.statusCode,
        serverCode: _extractCode(e),
        serverMessage: e.message,
      );
      working = working.copyWith(
        status: mapped.status,
        failureReason: mapped.messageAr,
      );
      await sqlite.updateSyncQueueItem(working);
      return false;
    } catch (e) {
      working = working.copyWith(
        status: working.retryCount >= working.maxRetries
            ? SyncQueueStatus.failed
            : SyncQueueStatus.pending,
        failureReason: e.toString(),
      );
      await sqlite.updateSyncQueueItem(working);
      return false;
    }
  }

  String? _extractCode(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      return (data['error'] as Map)['code']?.toString();
    }
    return null;
  }

  Future<int> _flushBatch(List<SyncQueueItem> items) async {
    for (final item in items) {
      await sqlite.updateSyncQueueItem(
        item.copyWith(
          status: SyncQueueStatus.syncing,
          lastAttemptAt: DateTime.now(),
          retryCount: item.retryCount + 1,
        ),
      );
    }

    try {
      final batchKey = keys.generate();
      final payload = items
          .map(
            (e) => {
              'localId': e.localId,
              'operationType': e.operationType,
              'entityType': e.entityType,
              'endpoint': e.endpoint,
              'httpMethod': e.httpMethod,
              'idempotencyKey': e.idempotencyKey,
              'payload': jsonDecode(e.payloadJson),
            },
          )
          .toList();

      await mobileApi.pushBatch(items: payload, idempotencyKey: batchKey);

      var ok = 0;
      for (final item in items) {
        await sqlite.updateSyncQueueItem(
          item.copyWith(
            status: SyncQueueStatus.synced,
            syncedAt: DateTime.now(),
          ),
        );
        await sqlite.markSynced(item.localId);
        ok++;
      }
      return ok;
    } on DioException catch (e) {
      // Fall back to individual domain endpoints.
      if (e.response?.statusCode == 404 || e.response?.statusCode == 501) {
        var ok = 0;
        for (final item in items) {
          if (await _flushSingle(item)) ok++;
        }
        return ok;
      }
      final mapped = conflictMapper.map(
        statusCode: e.response?.statusCode,
        serverCode: _extractCode(e),
      );
      for (final item in items) {
        await sqlite.updateSyncQueueItem(
          item.copyWith(status: mapped.status, failureReason: mapped.messageAr),
        );
      }
      return 0;
    } catch (e) {
      debugPrint('batch sync failed: $e');
      var ok = 0;
      for (final item in items) {
        if (await _flushSingle(item)) ok++;
      }
      return ok;
    }
  }

  Future<bool> _pullRemote() async {
    try {
      final since = hive.lastSyncAt()?.toIso8601String();
      final data = await mobileApi.pullSync(since: since);
      if (data == null) return false;

      final notifications = data['notifications'];
      if (notifications is List) {
        // Cache raw maps via hive if shaped correctly — best-effort.
      }
      final tasks = data['tasks'];
      if (tasks is List) {
        // Same — domain refresh happens via repositories on UI pull.
      }
      if (data['dashboard'] is Map) {
        await hive.cacheDashboard(
          Map<String, dynamic>.from(data['dashboard'] as Map),
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<int> flushPendingViolations(ViolationsApiService api) async {
    final pending = hive
        .pendingSyncItems()
        .where((e) => e['entityType'] == 'violation_create')
        .toList();
    if (pending.isEmpty) return 0;

    final items = pending
        .map((e) => Map<String, dynamic>.from(e['payload'] as Map))
        .toList();

    final results = await api.syncPush(items);
    for (final item in pending) {
      final id = item['id']?.toString();
      if (id != null) {
        await sqlite.markSynced(id);
        final row = await sqlite.getSyncQueueItem(id);
        if (row != null) {
          await sqlite.updateSyncQueueItem(
            row.copyWith(
              status: SyncQueueStatus.synced,
              syncedAt: DateTime.now(),
            ),
          );
        }
      }
    }
    await clearViolationQueue();
    await hive.setLastSyncAt(DateTime.now());
    return results.length;
  }

  Future<int> flushPendingIncidents(IncidentsApiService api) async {
    final pending = hive
        .pendingSyncItems()
        .where((e) => e['entityType'] == 'incident_create')
        .toList();
    if (pending.isEmpty) return 0;

    final items = pending
        .map((e) => Map<String, dynamic>.from(e['payload'] as Map))
        .toList();

    final results = await api.syncPush(items);
    for (final item in pending) {
      final id = item['id']?.toString();
      if (id != null) {
        await sqlite.markSynced(id);
        final row = await sqlite.getSyncQueueItem(id);
        if (row != null) {
          await sqlite.updateSyncQueueItem(
            row.copyWith(
              status: SyncQueueStatus.synced,
              syncedAt: DateTime.now(),
            ),
          );
        }
      }
    }
    await clearIncidentQueue();
    await hive.setLastSyncAt(DateTime.now());
    return results.length;
  }

  Future<void> clearViolationQueue() async {
    final remaining = hive
        .pendingSyncItems()
        .where((e) => e['entityType'] != 'violation_create')
        .toList();
    await hive.clearSyncQueue();
    for (final item in remaining) {
      await hive.enqueueSync(item);
    }
  }

  Future<void> clearIncidentQueue() async {
    final remaining = hive
        .pendingSyncItems()
        .where((e) => e['entityType'] != 'incident_create')
        .toList();
    await hive.clearSyncQueue();
    for (final item in remaining) {
      await hive.enqueueSync(item);
    }
  }

  Future<int> flushPending() async {
    final result = await runSync(trigger: 'flushPending');
    return result.flushed;
  }

  Future<DateTime?> lastSyncAt() async => hive.lastSyncAt();

  Future<void> clearAllOfflineData() async {
    await hive.clearSyncQueue();
    await hive.clearUser();
    await sqlite.clearSyncQueue();
  }
}

class SyncRunResult {
  const SyncRunResult({
    this.skipped = false,
    required this.flushed,
    required this.pulled,
    this.conflictMessage,
  });

  final bool skipped;
  final int flushed;
  final bool pulled;
  final String? conflictMessage;
}
