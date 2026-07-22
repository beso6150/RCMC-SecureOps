import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/incident.dart';

final incidentsApiServiceProvider = Provider<IncidentsApiService>((ref) {
  return IncidentsApiService(ref.watch(dioProvider));
});

class IncidentsApiService {
  IncidentsApiService(this._dio);

  final Dio _dio;

  Future<List<IncidentTypeOption>> listTypes() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/incidents/types');
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => IncidentTypeOption.fromJson(Map<String, dynamic>.from(e)))
          .toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<IncidentRecord>> list({
    String? status,
    String? search,
    String? typeCode,
    String? severity,
    int page = 1,
    int pageSize = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/incidents',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (status != null) 'status': status,
          if (search != null && search.isNotEmpty) 'search': search,
          if (typeCode != null) 'typeCode': typeCode,
          if (severity != null) 'severity': severity,
        },
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => IncidentRecord.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<IncidentRecord> getById(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/incidents/$id');
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('البلاغ غير موجود');
      return IncidentRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<IncidentRecord> create(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/incidents',
        data: payload,
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر إنشاء البلاغ');
      return IncidentRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<IncidentRecord> close(String id, {String? notes}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/incidents/$id/close',
        data: {if (notes != null) 'notes': notes},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر إنهاء الحالة');
      return IncidentRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<IncidentRecord> start(String id) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/incidents/$id/start',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر بدء التنفيذ');
      return IncidentRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<IncidentRecord> addComment(String id, String body) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/incidents/$id/comments',
        data: {'body': body},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر إضافة التعليق');
      return IncidentRecord.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<Map<String, dynamic>> getPdfMeta(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/incidents/$id/pdf',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return data ?? {};
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<String> downloadPdf(String id) async {
    try {
      final dir = await getTemporaryDirectory();
      final savePath = '${dir.path}/incident_$id.pdf';
      await _dio.download(
        '/incidents/$id/pdf',
        savePath,
        queryParameters: {'download': 'true'},
      );
      return savePath;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> syncPush(
    List<Map<String, dynamic>> items,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/incidents/sync/push',
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

  Future<List<IncidentRecord>> syncPull(DateTime since) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/incidents/sync/pull',
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
            return IncidentRecord.fromJson(Map<String, dynamic>.from(record));
          })
          .whereType<IncidentRecord>()
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<FacilityFloor>> listFloors() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/visitors/floors');
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => FacilityFloor.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<FacilityMeetingRoom>> listMeetingRooms({String? floorId}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/visitors/meeting-rooms',
        queryParameters: {if (floorId != null) 'floorId': floorId},
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map(
            (e) => FacilityMeetingRoom.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  String resolveUploadUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    final base = AppConfig.apiBaseUrl.replaceAll('/api/v1', '');
    final normalized = path.startsWith('/') ? path : '/$path';
    return '$base$normalized';
  }
}
