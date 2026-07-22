class AppConfig {
  AppConfig._();

  static const String appName = 'RCMC SecureOps';
  static const String visibleNameAr = 'المشرف الأمني الذكي';
  static const String visibleNameEn = 'Smart Security Supervisor';

  /// Override with `--dart-define=API_BASE_URL=https://...`
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const int maxRetries = 2;

  /// Dio Options.extra key + HTTP header for idempotent writes.
  static const String idempotencyHeader = 'Idempotency-Key';
  static const String extraIdempotencyKey = 'idempotencyKey';

  static const String appVersion = '1.0.0';
  static const int buildNumber = 20;
}

class StorageKeys {
  StorageKeys._();

  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String mustChangePassword = 'must_change_password';
  static const String cachedUser = 'cached_user';
  static const String themeMode = 'theme_mode';
  static const String localeCode = 'locale_code';
  static const String lastSyncAt = 'last_sync_at';
  static const String connectionStatus = 'connection_status';
  static const String notificationSound = 'notification_sound';
  static const String offlineSyncEnabled = 'offline_sync_enabled';
  static const String biometricLoginReady = 'biometric_login_ready';
  static const String fontScale = 'font_scale';
}
