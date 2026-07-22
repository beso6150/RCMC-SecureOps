import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/services/token_storage_service.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

final realtimeSocketServiceProvider = Provider<RealtimeSocketService>((ref) {
  final service = RealtimeSocketService(
    tokenStorage: ref.watch(tokenStorageServiceProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});

/// Socket.IO client — production-ready scaffolding for live updates.
class RealtimeSocketService {
  RealtimeSocketService({required this.tokenStorage});

  final TokenStorageService tokenStorage;

  io.Socket? _socket;
  void Function(Map<String, dynamic>)? onNotificationNew;
  void Function(Map<String, dynamic>)? onTaskUpdated;
  void Function(Map<String, dynamic>)? onDashboardRefresh;

  bool get isConnected => _socket?.connected == true;

  String get _socketBaseUrl {
    // Strip /api/v1 — Socket.IO attaches to the HTTP server root.
    return AppConfig.apiBaseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');
  }

  Future<void> connect() async {
    if (_socket?.connected == true) return;
    final token = await tokenStorage.readAccessToken();
    if (token == null || token.isEmpty) return;

    dispose();
    _socket = io.io(
      _socketBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .enableReconnection()
          .setReconnectionAttempts(20)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!
      ..onConnect((_) {})
      ..onDisconnect((_) {})
      ..on('notification:new', (data) {
        if (data is Map && onNotificationNew != null) {
          onNotificationNew!(Map<String, dynamic>.from(data));
        }
      })
      ..on('task:updated', (data) {
        if (data is Map && onTaskUpdated != null) {
          onTaskUpdated!(Map<String, dynamic>.from(data));
        }
      })
      ..on('dashboard:refresh', (data) {
        if (data is Map && onDashboardRefresh != null) {
          onDashboardRefresh!(Map<String, dynamic>.from(data));
        } else if (onDashboardRefresh != null) {
          onDashboardRefresh!(const {});
        }
      })
      ..connect();
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
