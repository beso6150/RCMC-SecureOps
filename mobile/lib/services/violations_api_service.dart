import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/violation.dart';

final violationsApiServiceProvider = Provider<ViolationsApiService>((ref) {
  return ViolationsApiService(ref.watch(dioProvider));
});

class ViolationsApiService {
  ViolationsApiService(this._dio);

  final Dio _dio;

  Future<List<ViolationRecord>> list({
    String? status,
    String? search,
    String? parkingCode,
    DateTime? from,
    DateTime? to,
    int page = 1,
    int pageSize = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/violations',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (status != null) 'status': status,
          if (search != null && search.isNotEmpty) 'search': search,
          if (parkingCode != null) 'parkingCode': parkingCode,
          if (from != null) 'from': from.toIso8601String(),
          if (to != null) 'to': to.toIso8601String(),
        },
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => ViolationRecord.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ViolationRecord> getById(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/violations/$id');
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('المخالفة غير موجودة');
      return ViolationRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ViolationRecord> create(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/violations',
        data: payload,
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر إنشاء المخالفة');
      return ViolationRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> syncPush(
    List<Map<String, dynamic>> items,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/violations/sync/push',
        data: {'items': items},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final results = data?['results'] as List<dynamic>? ?? const [];
      return results
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<ViolationRecord>> syncPull(DateTime since) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/violations/sync/pull',
        queryParameters: {'since': since.toUtc().toIso8601String()},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final changes = data?['changes'] as List<dynamic>? ?? const [];
      return changes
          .whereType<Map>()
          .map((e) {
            final map = Map<String, dynamic>.from(e);
            if (map['deleted'] == true) return null;
            final record = map['record'];
            if (record is! Map) return null;
            return ViolationRecord.fromJson(Map<String, dynamic>.from(record));
          })
          .whereType<ViolationRecord>()
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
