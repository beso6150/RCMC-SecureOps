import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final pushNotificationServiceProvider = Provider<PushNotificationService>((
  ref,
) {
  final service = PushNotificationService();
  ref.onDispose(service.dispose);
  return service;
});

/// Local notifications while the app process is alive (Socket.IO driven).
///
/// Closed-app / killed-state push is NOT available without Firebase Cloud
/// Messaging (or an equivalent vendor push SDK). Firebase is intentionally
/// not added in this sprint — only foreground/local alerts are supported.
abstract class PushNotificationFacade {
  Future<void> init();
  Future<void> showLocal({
    required String title,
    required String body,
    String? payload,
  });
}

class PushNotificationService implements PushNotificationFacade {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _ready = false;
  void Function(String? payload)? onNotificationTap;

  @override
  Future<void> init() async {
    if (_ready) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: ios);

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        onNotificationTap?.call(response.payload);
      },
    );

    final androidPlugin = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.requestNotificationsPermission();

    _ready = true;
  }

  @override
  Future<void> showLocal({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_ready) await init();

    const androidDetails = AndroidNotificationDetails(
      'rcmc_ops',
      'تنبيهات العمليات',
      channelDescription: 'إشعارات ميدانية أثناء تشغيل التطبيق',
      importance: Importance.high,
      priority: Priority.high,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: payload,
    );
  }

  void dispose() {
    onNotificationTap = null;
  }
}
