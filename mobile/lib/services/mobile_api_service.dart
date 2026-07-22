import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';

final mobileApiServiceProvider = Provider<MobileApiService>((ref) {
  return MobileApiService(ref.watch(dioProvider));
});

/// Client for Sprint 20 `/mobile/*` endpoints (base is `/api/v1`).
class MobileApiService {
  MobileApiService(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>?> bootstrap() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/mobile/bootstrap',
      );
      return response.data?['data'] as Map<String, dynamic>?;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<Map<String, dynamic>?> config() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/mobile/config');
      return response.data?['data'] as Map<String, dynamic>?;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<Map<String, dynamic>?> pullSync({String? since}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/mobile/sync',
        queryParameters: {
          if (since != null && since.isNotEmpty) 'since': since,
        },
      );
      return response.data?['data'] as Map<String, dynamic>?;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<Map<String, dynamic>?> pushBatch({
    required List<Map<String, dynamic>> items,
    required String idempotencyKey,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/mobile/sync/batch',
        data: {'items': items},
        options: Options(
          headers: {AppConfig.idempotencyHeader: idempotencyKey},
          extra: {AppConfig.extraIdempotencyKey: idempotencyKey},
        ),
      );
      return response.data?['data'] as Map<String, dynamic>?;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> registerDevice({
    required String deviceId,
    required String platform,
    String? pushToken,
    Map<String, dynamic>? meta,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/mobile/device/register',
        data: {
          'deviceId': deviceId,
          'platform': platform,
          if (pushToken != null) 'pushToken': pushToken,
          if (meta != null) 'meta': meta,
        },
      );
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> unregisterDevice({required String deviceId}) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/mobile/device/unregister',
        data: {'deviceId': deviceId},
      );
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> listDevices() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/mobile/devices');
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
