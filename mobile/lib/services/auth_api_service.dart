import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/auth_user.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/sqlite_service.dart';
import 'package:rcmc_secureops/services/token_storage_service.dart';

final authApiServiceProvider = Provider<AuthApiService>((ref) {
  return AuthApiService(
    dio: ref.watch(dioProvider),
    tokenStorage: ref.watch(tokenStorageServiceProvider),
    cache: ref.watch(hiveCacheServiceProvider),
    sqlite: ref.watch(sqliteServiceProvider),
  );
});

class AuthApiService {
  AuthApiService({
    required this.dio,
    required this.tokenStorage,
    required this.cache,
    required this.sqlite,
  });

  final Dio dio;
  final TokenStorageService tokenStorage;
  final HiveCacheService cache;
  final SqliteService sqlite;

  Future<AuthSession> login({
    required String nationalId,
    required String employeeNumber,
    String? password,
  }) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'nationalId': nationalId,
          'employeeNumber': employeeNumber,
          if (password != null && password.isNotEmpty) 'password': password,
        },
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw Exception('استجابة غير صالحة من الخادم');
      }
      final session = AuthSession.fromJson(data);
      await tokenStorage.saveTokens(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        mustChangePassword: session.mustChangePassword,
      );
      await cache.cacheUser(session.user.toJson());
      return session;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AuthUser> me() async {
    try {
      final response = await dio.get<Map<String, dynamic>>('/auth/me');
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر تحميل الملف الشخصي');
      final user = AuthUser.fromJson(data);
      await cache.cacheUser(user.toJson());
      await tokenStorage.setMustChangePassword(user.isFirstLogin);
      return user;
    } catch (e) {
      final cached = cache.readCachedUser();
      if (cached != null) {
        return AuthUser.fromJson(cached);
      }
      throw mapDioError(e);
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await dio.post<Map<String, dynamic>>(
        '/auth/change-password',
        data: {'currentPassword': currentPassword, 'newPassword': newPassword},
      );
      await tokenStorage.setMustChangePassword(false);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> logout() async {
    try {
      final refresh = await tokenStorage.readRefreshToken();
      await dio.post<Map<String, dynamic>>(
        '/auth/logout',
        data: {if (refresh != null) 'refreshToken': refresh},
      );
    } catch (_) {
      // Best-effort logout; always clear local session.
    } finally {
      await tokenStorage.clearTokens();
      await cache.clearUser();
      await cache.clearSyncQueue();
      await sqlite.clearSyncQueue();
    }
  }
}
