import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/dashboard.dart';

final notificationsApiServiceProvider = Provider<NotificationsApiService>((
  ref,
) {
  return NotificationsApiService(ref.watch(dioProvider));
});

class NotificationsApiService {
  NotificationsApiService(this._dio);

  final Dio _dio;

  Future<List<AppNotification>> list({
    String? status,
    String? search,
    String? priority,
    int page = 1,
    int pageSize = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/notifications',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (status != null) 'status': status,
          if (search != null && search.isNotEmpty) 'search': search,
          if (priority != null) 'priority': priority,
        },
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AppNotification> getById(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/notifications/$id',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('الإشعار غير موجود');
      return AppNotification.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AppNotification> markRead(String id) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/notifications/$id/read',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر تحديث الإشعار');
      return AppNotification.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AppNotification> acknowledge(String id) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/notifications/$id/acknowledge',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر الإقرار بالإشعار');
      return AppNotification.fromJson(data);
    } catch (e) {
      // Fallback to mark-read if acknowledge endpoint is unavailable.
      try {
        return await markRead(id);
      } catch (_) {
        throw mapDioError(e);
      }
    }
  }

  Future<int> markAllRead() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/notifications/read-all',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return (data?['updated'] as num?)?.toInt() ?? 0;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<int> unreadCount() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/notifications/unread-count',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return (data?['count'] as num?)?.toInt() ?? 0;
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
