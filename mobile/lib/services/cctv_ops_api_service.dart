import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final cctvOpsApiServiceProvider = Provider<CctvOpsApiService>((ref) {
  return CctvOpsApiService(
    dio: ref.watch(dioProvider),
    sync: ref.watch(syncServiceProvider),
    online: () => ref.read(connectivityAwareOnlineProvider),
  );
});

class CctvReferral {
  const CctvReferral({
    required this.id,
    required this.title,
    required this.status,
    required this.createdAt,
    this.body,
    this.isDraft = false,
  });

  final String id;
  final String title;
  final String status;
  final DateTime createdAt;
  final String? body;
  final bool isDraft;

  factory CctvReferral.fromJson(Map<String, dynamic> json) {
    return CctvReferral(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'إحالة',
      status: json['status']?.toString() ?? 'OPEN',
      body: json['body']?.toString() ?? json['description']?.toString(),
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      isDraft: json['isDraft'] == true,
    );
  }
}

class AccessPermit {
  const AccessPermit({
    required this.id,
    required this.title,
    required this.status,
    required this.createdAt,
    this.holderName,
    this.acknowledged = false,
  });

  final String id;
  final String title;
  final String status;
  final DateTime createdAt;
  final String? holderName;
  final bool acknowledged;

  factory AccessPermit.fromJson(Map<String, dynamic> json) {
    return AccessPermit(
      id: json['id']?.toString() ?? '',
      title:
          json['title']?.toString() ??
          json['permitNumber']?.toString() ??
          'تصريح',
      status: json['status']?.toString() ?? 'PENDING',
      holderName: json['holderName']?.toString(),
      acknowledged: json['acknowledged'] == true,
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class CctvOpsApiService {
  CctvOpsApiService({
    required this.dio,
    required this.sync,
    required this.online,
  });

  final Dio dio;
  final SyncService sync;
  final bool Function() online;
  final _uuid = const Uuid();

  Future<List<CctvReferral>> listReferrals() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/cctv-operations/referrals',
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => CctvReferral.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<CctvReferral> getReferral(String id) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/cctv-operations/referrals/$id',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('الإحالة غير موجودة');
      return CctvReferral.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> createReferralDraft({
    required String title,
    required String body,
  }) async {
    final payload = {
      'title': title,
      'body': body,
      'status': 'DRAFT',
      'clientSyncId': _uuid.v4(),
      'createdAt': DateTime.now().toIso8601String(),
    };

    if (!online() || OfflinePolicy.canQueue('referral_draft')) {
      if (!online()) {
        await sync.enqueue(
          entityType: 'referral_draft',
          operationType: 'referral_draft',
          endpoint: '/cctv-operations/referrals',
          payload: payload,
        );
        return;
      }
    }

    try {
      await dio.post<Map<String, dynamic>>(
        '/cctv-operations/referrals',
        data: payload,
      );
    } catch (e) {
      if (!online()) {
        await sync.enqueue(
          entityType: 'referral_draft',
          operationType: 'referral_draft',
          endpoint: '/cctv-operations/referrals',
          payload: payload,
        );
        return;
      }
      throw mapDioError(e);
    }
  }

  Future<List<AccessPermit>> listPermits() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/cctv-operations/permits',
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => AccessPermit.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AccessPermit> getPermit(String id) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/cctv-operations/permits/$id',
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('التصريح غير موجود');
      return AccessPermit.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> acknowledgePermit(String id) async {
    try {
      await dio.post<Map<String, dynamic>>(
        '/cctv-operations/permits/$id/acknowledge',
      );
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
