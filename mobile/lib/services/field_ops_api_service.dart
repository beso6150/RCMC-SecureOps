import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final fieldOpsApiServiceProvider = Provider<FieldOpsApiService>((ref) {
  return FieldOpsApiService(
    dio: ref.watch(dioProvider),
    sync: ref.watch(syncServiceProvider),
    online: () => ref.read(connectivityAwareOnlineProvider),
  );
});

class PatrolSummary {
  const PatrolSummary({
    required this.id,
    required this.title,
    required this.status,
    this.checkpointsTotal = 0,
    this.checkpointsDone = 0,
  });

  final String id;
  final String title;
  final String status;
  final int checkpointsTotal;
  final int checkpointsDone;

  factory PatrolSummary.fromJson(Map<String, dynamic> json) {
    return PatrolSummary(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['nameAr']?.toString() ?? 'جولة',
      status: json['status']?.toString() ?? 'PENDING',
      checkpointsTotal: (json['checkpointsTotal'] as num?)?.toInt() ?? 0,
      checkpointsDone: (json['checkpointsDone'] as num?)?.toInt() ?? 0,
    );
  }
}

class FieldOpsApiService {
  FieldOpsApiService({
    required this.dio,
    required this.sync,
    required this.online,
  });

  final Dio dio;
  final SyncService sync;
  final bool Function() online;
  final _uuid = const Uuid();

  Future<List<PatrolSummary>> listPatrols() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/field-operations/patrols',
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => PatrolSummary.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<PatrolSummary?> activePatrol() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/field-operations/patrols/active',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) return null;
      return PatrolSummary.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> visitCheckpoint({
    required String patrolId,
    required String checkpointCode,
    String? note,
  }) async {
    final payload = {
      'patrolId': patrolId,
      'checkpointCode': checkpointCode,
      if (note != null) 'note': note,
      'clientVisitedAt': DateTime.now().toIso8601String(),
      'clientSyncId': _uuid.v4(),
    };

    if (!online()) {
      if (!OfflinePolicy.canQueue('patrol_visit')) {
        throw Exception('لا يمكن زيارة نقطة التفتيش دون اتصال');
      }
      await sync.enqueue(
        entityType: 'patrol_visit',
        operationType: 'patrol_visit',
        endpoint: '/field-operations/patrols/$patrolId/visits',
        payload: payload,
      );
      return;
    }

    try {
      await dio.post<Map<String, dynamic>>(
        '/field-operations/patrols/$patrolId/visits',
        data: payload,
      );
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
