import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/errors/app_exception.dart';
import 'package:rcmc_secureops/core/network/auth_interceptor.dart';
import 'package:rcmc_secureops/core/network/retry_interceptor.dart';
import 'package:rcmc_secureops/services/token_storage_service.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  final tokenStorage = ref.watch(tokenStorageServiceProvider);

  dio.interceptors.addAll([
    AuthInterceptor(
      dio: dio,
      tokenStorage: tokenStorage,
      onSessionExpired: () {
        // Handled by auth state listener via secure storage clear.
      },
    ),
    RetryInterceptor(dio: dio, maxRetries: AppConfig.maxRetries),
    // Never log Authorization / Idempotency-Key / bodies that may contain tokens.
    LogInterceptor(
      request: true,
      requestHeader: false,
      requestBody: false,
      responseHeader: false,
      responseBody: false,
      error: true,
      logPrint: (obj) {
        final text = obj.toString();
        if (text.toLowerCase().contains('bearer') ||
            text.toLowerCase().contains('authorization') ||
            text.toLowerCase().contains('refresh') ||
            text.toLowerCase().contains('idempotency')) {
          return;
        }
        // ignore: avoid_print
        print(obj);
      },
    ),
  ]);

  return dio;
});

AppException mapDioError(Object error) {
  if (error is AppException) return error;
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      final err = data['error'] as Map;
      final message = err['message']?.toString() ?? 'حدث خطأ في الاتصال';
      final code = err['code']?.toString();
      final status = error.response?.statusCode;
      if (status == 401) {
        return UnauthorizedException(message);
      }
      if (status == 400) {
        return ValidationException(message, details: err['details']);
      }
      if (status == 403) {
        return NetworkException(
          message,
          code: code ?? 'FORBIDDEN',
          statusCode: 403,
        );
      }
      if (status == 404) {
        return NetworkException(
          message,
          code: code ?? 'NOT_FOUND',
          statusCode: 404,
        );
      }
      return NetworkException(message, code: code, statusCode: status);
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return const NetworkException('لا يوجد اتصال بالخادم', code: 'OFFLINE');
    }
    return NetworkException(
      error.message ?? 'خطأ في الشبكة',
      statusCode: error.response?.statusCode,
    );
  }
  return AppException(error.toString());
}
