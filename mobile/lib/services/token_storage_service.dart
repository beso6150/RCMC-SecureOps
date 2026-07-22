import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';

final tokenStorageServiceProvider = Provider<TokenStorageService>((ref) {
  return TokenStorageService(
    const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );
});

class TokenStorageService {
  TokenStorageService(this._storage);

  final FlutterSecureStorage _storage;

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required bool mustChangePassword,
  }) async {
    await Future.wait([
      _storage.write(key: StorageKeys.accessToken, value: accessToken),
      _storage.write(key: StorageKeys.refreshToken, value: refreshToken),
      _storage.write(
        key: StorageKeys.mustChangePassword,
        value: mustChangePassword ? '1' : '0',
      ),
    ]);
  }

  Future<String?> readAccessToken() =>
      _storage.read(key: StorageKeys.accessToken);

  Future<String?> readRefreshToken() =>
      _storage.read(key: StorageKeys.refreshToken);

  Future<bool> mustChangePassword() async {
    final value = await _storage.read(key: StorageKeys.mustChangePassword);
    return value == '1';
  }

  Future<void> setMustChangePassword(bool value) async {
    await _storage.write(
      key: StorageKeys.mustChangePassword,
      value: value ? '1' : '0',
    );
  }

  Future<bool> hasSession() async {
    final token = await readAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.accessToken),
      _storage.delete(key: StorageKeys.refreshToken),
      _storage.delete(key: StorageKeys.mustChangePassword),
    ]);
  }
}
