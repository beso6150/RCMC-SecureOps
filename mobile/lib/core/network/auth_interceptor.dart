import 'dart:async';

import 'package:dio/dio.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/services/token_storage_service.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.dio,
    required this.tokenStorage,
    this.onSessionExpired,
  });

  final Dio dio;
  final TokenStorageService tokenStorage;
  final void Function()? onSessionExpired;

  bool _refreshing = false;
  Completer<bool>? _refreshCompleter;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.readAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    final extraKey = options.extra[AppConfig.extraIdempotencyKey];
    if (extraKey is String && extraKey.isNotEmpty) {
      options.headers[AppConfig.idempotencyHeader] = extraKey;
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    final path = err.requestOptions.path;
    if (path.contains('/auth/login') || path.contains('/auth/refresh')) {
      handler.next(err);
      return;
    }

    // Single-flight refresh: concurrent 401s await the same refresh.
    if (_refreshing) {
      final ok = await (_refreshCompleter?.future ?? Future.value(false));
      if (!ok) {
        handler.next(err);
        return;
      }
      try {
        final token = await tokenStorage.readAccessToken();
        final request = err.requestOptions;
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }
        final cloned = await dio.fetch<dynamic>(request);
        handler.resolve(cloned);
      } catch (_) {
        handler.next(err);
      }
      return;
    }

    _refreshing = true;
    _refreshCompleter = Completer<bool>();
    try {
      final refresh = await tokenStorage.readRefreshToken();
      if (refresh == null || refresh.isEmpty) {
        await tokenStorage.clearTokens();
        onSessionExpired?.call();
        _refreshCompleter?.complete(false);
        handler.next(err);
        return;
      }

      final refreshDio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          headers: const {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      );

      final response = await refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refresh},
      );

      final data = response.data?['data'] as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final refreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || refreshToken == null) {
        await tokenStorage.clearTokens();
        onSessionExpired?.call();
        _refreshCompleter?.complete(false);
        handler.next(err);
        return;
      }

      await tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
        mustChangePassword: data?['mustChangePassword'] as bool? ?? false,
      );

      _refreshCompleter?.complete(true);

      final request = err.requestOptions;
      request.headers['Authorization'] = 'Bearer $accessToken';
      final cloned = await dio.fetch<dynamic>(request);
      handler.resolve(cloned);
    } catch (_) {
      await tokenStorage.clearTokens();
      onSessionExpired?.call();
      if (!(_refreshCompleter?.isCompleted ?? true)) {
        _refreshCompleter?.complete(false);
      }
      handler.next(err);
    } finally {
      _refreshing = false;
      _refreshCompleter = null;
    }
  }
}
