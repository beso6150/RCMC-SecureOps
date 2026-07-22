import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/models/violation.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/services/uploads_api_service.dart';
import 'package:rcmc_secureops/services/violations_api_service.dart';
import 'package:uuid/uuid.dart';

final violationsRepositoryProvider = Provider<ViolationsRepository>((ref) {
  return ViolationsRepository(
    api: ref.watch(violationsApiServiceProvider),
    uploads: ref.watch(uploadsApiServiceProvider),
    hive: ref.watch(hiveCacheServiceProvider),
    sync: ref.watch(syncServiceProvider),
  );
});

class ViolationsRepository {
  ViolationsRepository({
    required this.api,
    required this.uploads,
    required this.hive,
    required this.sync,
  });

  final ViolationsApiService api;
  final UploadsApiService uploads;
  final HiveCacheService hive;
  final SyncService sync;
  final _uuid = const Uuid();

  List<ViolationRecord> readLocal() {
    return hive.violations.values
        .whereType<Map>()
        .map((e) => ViolationRecord.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> _upsertLocal(ViolationRecord record) async {
    final key = record.clientSyncId ?? record.id;
    await hive.violations.put(key, record.toJson());
  }

  Future<void> cacheRemoteList(List<ViolationRecord> records) async {
    for (final record in records) {
      final existingKey = record.clientSyncId ?? record.id;
      final existing = hive.violations.get(existingKey);
      if (existing is Map && existing['pendingSync'] == true) {
        continue;
      }
      await _upsertLocal(record.copyWith(pendingSync: false, localOnly: false));
    }
  }

  Future<ViolationRecord> _uploadAttachments(ViolationRecord record) async {
    if (record.attachments.isEmpty) return record;
    final next = <ViolationAttachment>[];
    for (final attachment in record.attachments) {
      final localPath = attachment.localPath ?? attachment.imagePath;
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
        mimeType: attachment.mimeType,
        folder: 'violations',
      );
      next.add(
        ViolationAttachment(
          id: attachment.id,
          fileName: uploaded.fileName,
          storageKey: uploaded.storageKey,
          imagePath: uploaded.url,
          localPath: localPath,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
        ),
      );
    }
    final primary = next.isNotEmpty ? next.first.storageKey : record.imagePath;
    return record.copyWith(attachments: next, imagePath: primary);
  }

  Future<List<ViolationRecord>> fetchAndCache({
    String? status,
    String? search,
    String? parkingCode,
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
      parkingCode: parkingCode,
    );
    await cacheRemoteList(remote);
    await hive.setLastSyncAt(DateTime.now());
    return readLocal();
  }

  Future<ViolationRecord> getById(String id) async {
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

  Future<ViolationRecord> create({
    required ViolationRecord draft,
    required bool online,
  }) async {
    final clientSyncId = draft.clientSyncId ?? _uuid.v4();
    var localRecord = ViolationRecord(
      id: draft.id.isEmpty ? clientSyncId : draft.id,
      plateNumber: draft.plateNumber,
      arabicPlate: draft.arabicPlate,
      englishPlate: draft.englishPlate,
      ocrResult: draft.ocrResult,
      ocrConfidence: draft.ocrConfidence,
      vehicleColor: draft.vehicleColor,
      violationType: draft.violationType,
      parkingCode: draft.parkingCode,
      status: draft.status,
      notes: draft.notes,
      imagePath: draft.imagePath,
      gpsLatitude: draft.gpsLatitude,
      gpsLongitude: draft.gpsLongitude,
      createdAt: draft.createdAt,
      closedAt: draft.closedAt,
      clientSyncId: clientSyncId,
      pendingSync: !online,
      localOnly: !online,
      createdBy: draft.createdBy,
      supervisor: draft.supervisor,
      cctvOperator: draft.cctvOperator,
      attachments: draft.attachments,
      responseDurationMs: draft.responseDurationMs,
    );

    await _upsertLocal(localRecord);

    if (!online) {
      await sync.enqueue(
        entityType: 'violation_create',
        payload: localRecord.toCreatePayload(),
      );
      return localRecord;
    }

    try {
      localRecord = await _uploadAttachments(localRecord);
      await _upsertLocal(localRecord);
      final created = await api.create(localRecord.toCreatePayload());
      final merged = created.copyWith(pendingSync: false, localOnly: false);
      await hive.violations.delete(clientSyncId);
      await _upsertLocal(merged);
      return merged;
    } catch (_) {
      final pending = localRecord.copyWith(pendingSync: true, localOnly: true);
      await _upsertLocal(pending);
      await sync.enqueue(
        entityType: 'violation_create',
        payload: pending.toCreatePayload(),
      );
      return pending;
    }
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
        final local = hive.violations.get(clientSyncId);
        if (local is! Map) continue;
        final record = ViolationRecord.fromJson(
          Map<String, dynamic>.from(local),
        );
        final synced = record.copyWith(
          id: serverId ?? record.id,
          pendingSync: false,
          localOnly: false,
        );
        await hive.violations.delete(clientSyncId);
        await _upsertLocal(synced);
      }
      await sync.clearViolationQueue();
      await hive.setLastSyncAt(DateTime.now());
      return results.length;
    }
    return sync.flushPendingViolations(api);
  }
}
