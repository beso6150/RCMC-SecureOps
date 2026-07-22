import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';

class VisitorRecord extends Equatable {
  const VisitorRecord({
    required this.id,
    required this.visitorName,
    required this.status,
    required this.visitDate,
    this.importance,
  });

  final String id;
  final String visitorName;
  final String status;
  final DateTime visitDate;
  final String? importance;

  String get statusLabelAr {
    switch (status) {
      case 'ARRIVED':
        return 'وصل';
      case 'HOST_NOTIFIED':
        return 'تم إبلاغ المضيف';
      case 'IN_MEETING':
        return 'في الاجتماع';
      case 'COMPLETED':
        return 'مكتمل';
      case 'CANCELLED':
        return 'ملغي';
      case 'UPCOMING':
      default:
        return 'قادم';
    }
  }

  factory VisitorRecord.fromJson(Map<String, dynamic> json) {
    return VisitorRecord(
      id: json['id'] as String? ?? '',
      visitorName: json['visitorName'] as String? ?? '',
      status: json['status'] as String? ?? 'UPCOMING',
      visitDate:
          DateTime.tryParse(
            json['visitDate'] as String? ??
                json['arrivalTime'] as String? ??
                json['createdAt'] as String? ??
                '',
          ) ??
          DateTime.now(),
      importance: json['importance'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'visitorName': visitorName,
    'status': status,
    'visitDate': visitDate.toIso8601String(),
    'importance': importance,
  };

  @override
  List<Object?> get props => [id, status, visitorName];
}

final visitorsApiServiceProvider = Provider<VisitorsApiService>((ref) {
  return VisitorsApiService(ref.watch(dioProvider));
});

class VisitorsApiService {
  VisitorsApiService(this._dio);

  final Dio _dio;

  Future<List<VisitorRecord>> list({String? status}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/visitors',
        queryParameters: {
          'page': 1,
          'pageSize': 50,
          if (status != null) 'status': status,
        },
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => VisitorRecord.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }
}

final visitorsListProvider = FutureProvider.autoDispose<List<VisitorRecord>>((
  ref,
) async {
  final hive = ref.watch(hiveCacheServiceProvider);
  final online = ref.watch(connectivityAwareOnlineProvider);
  try {
    if (!online) {
      final cached = hive.dashboard.get('visitors_cache');
      if (cached is List) {
        return cached
            .whereType<Map>()
            .map((e) => VisitorRecord.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      throw Exception('لا يوجد اتصال ولا بيانات مخزنة للزوار');
    }
    final remote = await ref.watch(visitorsApiServiceProvider).list();
    await hive.dashboard.put(
      'visitors_cache',
      remote.map((e) => e.toJson()).toList(),
    );
    return remote;
  } catch (_) {
    final cached = hive.dashboard.get('visitors_cache');
    if (cached is List) {
      return cached
          .whereType<Map>()
          .map((e) => VisitorRecord.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    rethrow;
  }
});
