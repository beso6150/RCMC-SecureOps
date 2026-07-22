import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/models/dashboard.dart';

final dashboardApiServiceProvider = Provider<DashboardApiService>((ref) {
  return DashboardApiService(ref.watch(dioProvider));
});

class DashboardApiService {
  DashboardApiService(this._dio);

  final Dio _dio;

  Future<DashboardSummary> fetchSummary({required bool isConnected}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/dashboard/summary',
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? {};
      return DashboardSummary.fromJson(data, isConnected: isConnected);
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
