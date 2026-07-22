import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/models/incident.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/incidents_api_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/services/uploads_api_service.dart';
import 'package:uuid/uuid.dart';

final incidentsRepositoryProvider = Provider<IncidentsRepository>((ref) {
  return IncidentsRepository(
    api: ref.watch(incidentsApiServiceProvider),
    uploads: ref.watch(uploadsApiServiceProvider),
    hive: ref.watch(hiveCacheServiceProvider),
    sync: ref.watch(syncServiceProvider),
  );
});

class IncidentsRepository {
  IncidentsRepository({
    required this.api,
    required this.uploads,
    required this.hive,
    required this.sync,
  });

  final IncidentsApiService api;
  final UploadsApiService uploads;
  final HiveCacheService hive;
  final SyncService sync;
  final _uuid = const Uuid();

  List<IncidentRecord> readLocal() {
    return hive.incidents.values
        .whereType<Map>()
        .map((e) => IncidentRecord.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> _upsertLocal(IncidentRecord record) async {
    final key = record.clientSyncId ?? record.id;
    await hive.incidents.put(key, record.toJson());
  }

  Future<void> cacheRemoteList(List<IncidentRecord> records) async {
    for (final record in records) {
      final existingKey = record.clientSyncId ?? record.id;
      final existing = hive.incidents.get(existingKey);
      if (existing is Map && existing['pendingSync'] == true) {
        continue;
      }
      await _upsertLocal(record.copyWith(pendingSync: false, localOnly: false));
    }
  }

  Future<IncidentRecord> _uploadAttachments(IncidentRecord record) async {
    if (record.attachments.isEmpty) return record;
    final next = <IncidentAttachment>[];
    for (final attachment in record.attachments) {
      final localPath = attachment.localPath;
      final needsUpload =
          attachment.storageKey.startsWith('local/') &&
          localPath != null &&
          localPath.isNotEmpty;
      if (!needsUpload) {
        next.add(attachment);
        continue;
      }
      final uploaded = await uploads.uploadLocalFile(
        localPath: localPath,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        folder: 'incidents',
      );
      next.add(
        IncidentAttachment(
          id: attachment.id,
          fileName: uploaded.fileName,
          storageKey: uploaded.storageKey,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          localPath: localPath,
          kind: attachment.kind,
        ),
      );
    }
    return record.copyWith(attachments: next);
  }

  Future<List<IncidentRecord>> fetchAndCache({
    String? status,
    String? search,
    String? typeCode,
  }) async {
    final since = hive.lastSyncAt();
    if (since != null) {
      try {
        final pulled = await api.syncPull(since);
        await cacheRemoteList(pulled);
      } catch (_) {
        // Fall through to full list fetch.
      }
    }

    final remote = await api.list(
      status: status,
      search: search,
      typeCode: typeCode,
    );
    await cacheRemoteList(remote);
    await hive.setLastSyncAt(DateTime.now());
    return readLocal();
  }

  Future<List<IncidentTypeOption>> loadTypes({required bool online}) async {
    final cached = hive.readIncidentTypes();
    if (!online) return cached;
    try {
      final remote = await api.listTypes();
      await hive.cacheIncidentTypes(remote.map((e) => e.toJson()).toList());
      return remote;
    } catch (_) {
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<IncidentRecord> getById(String id) async {
    final localMatches = readLocal()
        .where((e) => e.id == id || e.clientSyncId == id)
        .toList();
    if (localMatches.isNotEmpty && localMatches.first.pendingSync) {
      return localMatches.first;
    }
    try {
      final remote = await api.getById(id);
      await _upsertLocal(remote);
      return remote;
    } catch (_) {
      if (localMatches.isNotEmpty) return localMatches.first;
      rethrow;
    }
  }

  Future<IncidentRecord> create({
    required IncidentRecord draft,
    required bool online,
  }) async {
    final clientSyncId = draft.clientSyncId ?? _uuid.v4();
    var localRecord = draft.copyWith(
      id: draft.id.isEmpty ? clientSyncId : draft.id,
      clientSyncId: clientSyncId,
      pendingSync: !online,
      localOnly: !online,
    );

    await _upsertLocal(localRecord);

    if (!online) {
      await sync.enqueue(
        entityType: 'incident_create',
        payload: localRecord.toCreatePayload(),
      );
      return localRecord;
    }

    try {
      localRecord = await _uploadAttachments(localRecord);
      await _upsertLocal(localRecord);
      final created = await api.create(localRecord.toCreatePayload());
      final merged = created.copyWith(pendingSync: false, localOnly: false);
      await hive.incidents.delete(clientSyncId);
      await _upsertLocal(merged);
      return merged;
    } catch (_) {
      final pending = localRecord.copyWith(pendingSync: true, localOnly: true);
      await _upsertLocal(pending);
      await sync.enqueue(
        entityType: 'incident_create',
        payload: pending.toCreatePayload(),
      );
      return pending;
    }
  }

  Future<IncidentRecord> closeIncident(String id, {String? notes}) async {
    final closed = await api.close(id, notes: notes);
    await _upsertLocal(closed.copyWith(pendingSync: false, localOnly: false));
    return closed;
  }

  Future<IncidentRecord> startIncident(String id) async {
    final started = await api.start(id);
    await _upsertLocal(started);
    return started;
  }

  Future<IncidentRecord> addComment(String id, String body) async {
    final updated = await api.addComment(id, body);
    await _upsertLocal(updated);
    return updated;
  }

  Future<String> downloadAndOpenPdf(String id) async {
    return api.downloadPdf(id);
  }

  Future<int> syncPending() async {
    final pendingLocals = readLocal().where((e) => e.pendingSync).toList();
    if (pendingLocals.isNotEmpty) {
      final items = <Map<String, dynamic>>[];
      for (final pending in pendingLocals) {
        final prepared = await _uploadAttachments(pending);
        await _upsertLocal(
          prepared.copyWith(pendingSync: true, localOnly: true),
        );
        items.add(prepared.toCreatePayload());
      }
      final results = await api.syncPush(items);
      for (final result in results) {
        final clientSyncId = result['clientSyncId']?.toString();
        final serverId = result['serverId']?.toString();
        if (clientSyncId == null) continue;
        final local = hive.incidents.get(clientSyncId);
        if (local is! Map) continue;
        final record = IncidentRecord.fromJson(
          Map<String, dynamic>.from(local),
        );
        final synced = record.copyWith(
          id: serverId ?? record.id,
          pendingSync: false,
          localOnly: false,
        );
        await hive.incidents.delete(clientSyncId);
        await _upsertLocal(synced);
      }
      await sync.clearIncidentQueue();
      await hive.setLastSyncAt(DateTime.now());
      return results.length;
    }
    return sync.flushPendingIncidents(api);
  }
}
