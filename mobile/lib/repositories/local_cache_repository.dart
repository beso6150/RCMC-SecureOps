import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/sqlite_service.dart';

/// Offline-first repository foundation for feature modules.
abstract class OfflineRepository {
  Future<void> warmCache();
  Future<void> clearCache();
}

final localCacheRepositoryProvider = Provider<LocalCacheRepository>((ref) {
  return LocalCacheRepository(
    hive: ref.watch(hiveCacheServiceProvider),
    sqlite: ref.watch(sqliteServiceProvider),
  );
});

class LocalCacheRepository implements OfflineRepository {
  LocalCacheRepository({required this.hive, required this.sqlite});

  final HiveCacheService hive;
  final SqliteService sqlite;

  @override
  Future<void> warmCache() async {
    await sqlite.database;
  }

  @override
  Future<void> clearCache() async {
    await hive.clearUser();
    await hive.clearSyncQueue();
  }

  Future<void> saveMeta(String key, String value) =>
      sqlite.upsertMeta(key, value);

  Future<String?> readMeta(String key) => sqlite.readMeta(key);
}
