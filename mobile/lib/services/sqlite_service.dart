import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:rcmc_secureops/core/sync/sync_queue_models.dart';
import 'package:sqflite/sqflite.dart';

final sqliteServiceProvider = Provider<SqliteService>((ref) {
  return SqliteService();
});

/// Local SQLite store for structured offline data + SyncQueueItem.
class SqliteService {
  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'rcmc_secureops.db');
    return openDatabase(
      path,
      version: 2,
      onCreate: (db, version) async {
        await _createV1(db);
        await _createSyncQueue(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await _createSyncQueue(db);
        }
      },
    );
  }

  Future<void> _createV1(Database db) async {
    await db.execute('''
      CREATE TABLE sync_events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      )
    ''');
    await db.execute('''
      CREATE TABLE local_cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> _createSyncQueue(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue_items (
        localId TEXT PRIMARY KEY,
        operationType TEXT NOT NULL,
        entityType TEXT NOT NULL,
        localEntityId TEXT,
        serverEntityId TEXT,
        endpoint TEXT NOT NULL,
        httpMethod TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        attachmentPathsJson TEXT NOT NULL DEFAULT '[]',
        idempotencyKey TEXT NOT NULL,
        status TEXT NOT NULL,
        retryCount INTEGER NOT NULL DEFAULT 0,
        maxRetries INTEGER NOT NULL DEFAULT 5,
        createdAt TEXT NOT NULL,
        lastAttemptAt TEXT,
        syncedAt TEXT,
        failureReason TEXT,
        dependencyLocalId TEXT
      )
    ''');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created '
      'ON sync_queue_items(status, createdAt)',
    );
  }

  Future<void> upsertMeta(String key, String value) async {
    final db = await database;
    await db.insert('local_cache_meta', {
      'key': key,
      'value': value,
      'updated_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<String?> readMeta(String key) async {
    final db = await database;
    final rows = await db.query(
      'local_cache_meta',
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['value'] as String?;
  }

  Future<void> enqueueEvent({
    required String id,
    required String entityType,
    required String payloadJson,
  }) async {
    final db = await database;
    await db.insert('sync_events', {
      'id': id,
      'entity_type': entityType,
      'payload': payloadJson,
      'created_at': DateTime.now().toIso8601String(),
      'synced': 0,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, Object?>>> pendingEvents() async {
    final db = await database;
    return db.query(
      'sync_events',
      where: 'synced = 0',
      orderBy: 'created_at ASC',
    );
  }

  Future<void> markSynced(String id) async {
    final db = await database;
    await db.update(
      'sync_events',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> insertSyncQueueItem(SyncQueueItem item) async {
    final db = await database;
    await db.insert(
      'sync_queue_items',
      item.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> updateSyncQueueItem(SyncQueueItem item) async {
    final db = await database;
    await db.update(
      'sync_queue_items',
      item.toMap(),
      where: 'localId = ?',
      whereArgs: [item.localId],
    );
  }

  Future<List<SyncQueueItem>> listSyncQueue({
    List<SyncQueueStatus>? statuses,
  }) async {
    final db = await database;
    List<Map<String, Object?>> rows;
    if (statuses == null || statuses.isEmpty) {
      rows = await db.query('sync_queue_items', orderBy: 'createdAt ASC');
    } else {
      final placeholders = List.filled(statuses.length, '?').join(',');
      rows = await db.query(
        'sync_queue_items',
        where: 'status IN ($placeholders)',
        whereArgs: statuses.map((e) => e.apiValue).toList(),
        orderBy: 'createdAt ASC',
      );
    }
    return rows.map(SyncQueueItem.fromMap).toList();
  }

  Future<SyncQueueItem?> getSyncQueueItem(String localId) async {
    final db = await database;
    final rows = await db.query(
      'sync_queue_items',
      where: 'localId = ?',
      whereArgs: [localId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return SyncQueueItem.fromMap(rows.first);
  }

  Future<int> pendingSyncCount() async {
    final db = await database;
    final result = await db.rawQuery(
      "SELECT COUNT(*) AS c FROM sync_queue_items WHERE status IN ('PENDING','FAILED')",
    );
    return (result.first['c'] as int?) ?? 0;
  }

  Future<void> clearSyncQueue() async {
    final db = await database;
    await db.delete('sync_queue_items');
    await db.delete('sync_events');
  }
}
