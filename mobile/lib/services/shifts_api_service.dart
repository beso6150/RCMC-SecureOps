import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final shiftsApiServiceProvider = Provider<ShiftsApiService>((ref) {
  return ShiftsApiService(
    dio: ref.watch(dioProvider),
    sync: ref.watch(syncServiceProvider),
    online: () => ref.read(connectivityAwareOnlineProvider),
  );
});

class HandoverNote {
  const HandoverNote({
    required this.id,
    required this.body,
    required this.status,
    this.isDraft = false,
    this.updatedAt,
  });

  final String id;
  final String body;
  final String status;
  final bool isDraft;
  final DateTime? updatedAt;

  factory HandoverNote.fromJson(Map<String, dynamic> json) {
    return HandoverNote(
      id: json['id']?.toString() ?? '',
      body: json['body']?.toString() ?? json['notes']?.toString() ?? '',
      status: json['status']?.toString() ?? 'DRAFT',
      isDraft: (json['status']?.toString() ?? 'DRAFT') == 'DRAFT',
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
    );
  }
}

class ShiftsApiService {
  ShiftsApiService({
    required this.dio,
    required this.sync,
    required this.online,
  });

  final Dio dio;
  final SyncService sync;
  final bool Function() online;
  final _uuid = const Uuid();

  Future<HandoverNote?> currentHandover() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/shifts/handover/current',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) return null;
      return HandoverNote.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  /// Draft may be saved offline; submit/approve require online.
  Future<void> saveDraft({required String body, String? handoverId}) async {
    final payload = {
      'body': body,
      'status': 'DRAFT',
      'clientSyncId': _uuid.v4(),
      if (handoverId != null) 'id': handoverId,
    };

    if (!online()) {
      await sync.enqueue(
        entityType: 'handover_draft',
        operationType: 'handover_draft',
        endpoint: '/shifts/handover',
        payload: payload,
      );
      return;
    }

    try {
      await dio.post<Map<String, dynamic>>('/shifts/handover', data: payload);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> submitHandover(String id) async {
    if (!online()) {
      throw Exception(
        'تسليم الوردية النهائي يتطلب اتصالاً بالخادم ولا يمكن تنفيذه دون اتصال',
      );
    }
    if (OfflinePolicy.isForbiddenOffline('handover_submit')) {
      // online path continues
    }
    try {
      await dio.post<Map<String, dynamic>>('/shifts/handover/$id/submit');
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> approveHandover(String id) async {
    if (!online()) {
      throw Exception('اعتماد تسليم الوردية يتطلب اتصالاً بالخادم');
    }
    try {
      await dio.post<Map<String, dynamic>>('/shifts/handover/$id/approve');
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
