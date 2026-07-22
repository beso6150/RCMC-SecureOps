import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/dashboard.dart';

final tasksApiServiceProvider = Provider<TasksApiService>((ref) {
  return TasksApiService(ref.watch(dioProvider));
});

class TasksApiService {
  TasksApiService(this._dio);

  final Dio _dio;

  Future<List<OpsTask>> list({
    String? status,
    bool mine = true,
    bool overdue = false,
    int page = 1,
    int pageSize = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/tasks',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          'mine': mine,
          if (status != null) 'status': status,
          if (overdue) 'overdue': true,
        },
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => OpsTask.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<OpsTask> getById(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/tasks/$id');
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('المهمة غير موجودة');
      return OpsTask.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<OpsTask> _postAction(
    String id,
    String action, {
    Map<String, dynamic>? data,
    String? idempotencyKey,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/tasks/$id/$action',
        data: data,
        options: Options(
          headers: {
            if (idempotencyKey != null)
              AppConfig.idempotencyHeader: idempotencyKey,
          },
          extra: {
            if (idempotencyKey != null)
              AppConfig.extraIdempotencyKey: idempotencyKey,
          },
        ),
      );
      final body = response.data?['data'] as Map<String, dynamic>?;
      if (body == null) throw Exception('تعذر تحديث المهمة');
      return OpsTask.fromJson(body);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<OpsTask> accept(String id) => _postAction(id, 'accept');

  Future<OpsTask> start(String id) => _postAction(id, 'start');

  Future<OpsTask> wait(String id, {String? reason}) => _postAction(
    id,
    'wait',
    data: {if (reason != null && reason.isNotEmpty) 'reason': reason},
  );

  Future<OpsTask> complete(String id, {String? notes}) => _postAction(
    id,
    'complete',
    data: {if (notes != null && notes.isNotEmpty) 'notes': notes},
  );

  Future<OpsTask> reject(String id, {String? reason}) => _postAction(
    id,
    'reject',
    data: {if (reason != null && reason.isNotEmpty) 'reason': reason},
  );

  Future<void> uploadEvidence({
    required String id,
    required String filePath,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      await _dio.post<Map<String, dynamic>>('/tasks/$id/evidence', data: form);
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
