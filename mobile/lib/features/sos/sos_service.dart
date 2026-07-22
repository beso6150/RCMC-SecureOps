import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/services/sync_service.dart';

final sosServiceProvider = Provider<SosService>((ref) {
  return SosService(
    dio: ref.watch(dioProvider),
    online: () => ref.read(connectivityAwareOnlineProvider),
  );
});

class SosResult {
  const SosResult({required this.sent, required this.messageAr});

  final bool sent;
  final String messageAr;
}

/// SOS alerts — never claim success while offline.
class SosService {
  SosService({required this.dio, required this.online});

  final Dio dio;
  final bool Function() online;

  Future<SosResult> sendSos({
    String? note,
    double? latitude,
    double? longitude,
  }) async {
    if (OfflinePolicy.isSosBlockedOffline(isOnline: online())) {
      return const SosResult(
        sent: false,
        messageAr: OfflinePolicy.sosOfflineFailureAr,
      );
    }

    try {
      await dio.post<Map<String, dynamic>>(
        '/field-operations/alerts/sos',
        data: {
          if (note != null && note.isNotEmpty) 'note': note,
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
          'clientAt': DateTime.now().toIso8601String(),
        },
      );
      return const SosResult(
        sent: true,
        messageAr: 'تم إرسال نداء الاستغاثة بنجاح',
      );
    } catch (e) {
      return SosResult(
        sent: false,
        messageAr: 'فشل إرسال نداء الاستغاثة: ${mapDioError(e)}',
      );
    }
  }
}
