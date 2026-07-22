import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/models/auth_user.dart';
import 'package:rcmc_secureops/services/auth_api_service.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/services/token_storage_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated, mustChangePassword }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  final AuthStatus status;
  final AuthUser? user;
  final bool isLoading;
  final String? errorMessage;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(ref);
  },
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this.ref)
    : api = ref.read(authApiServiceProvider),
      tokens = ref.read(tokenStorageServiceProvider),
      cache = ref.read(hiveCacheServiceProvider),
      super(const AuthState(status: AuthStatus.unknown));

  final Ref ref;
  final AuthApiService api;
  final TokenStorageService tokens;
  final HiveCacheService cache;

  SyncService get _sync => ref.read(syncServiceProvider);

  Future<void> bootstrap() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final hasSession = await tokens.hasSession();
      if (!hasSession) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      final mustChange = await tokens.mustChangePassword();
      AuthUser? user;
      try {
        user = await api.me();
      } catch (_) {
        final cached = cache.readCachedUser();
        if (cached != null) {
          user = AuthUser.fromJson(cached);
        }
      }

      if (user == null) {
        await tokens.clearTokens();
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      if (mustChange || user.isFirstLogin) {
        state = AuthState(status: AuthStatus.mustChangePassword, user: user);
        return;
      }

      state = AuthState(status: AuthStatus.authenticated, user: user);
      _sync.startPeriodicSync();
      unawaited(_sync.runSync(trigger: 'bootstrap'));
    } catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> login({
    required String nationalId,
    required String employeeNumber,
    String? password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await api.login(
        nationalId: nationalId,
        employeeNumber: employeeNumber,
        password: password,
      );
      if (session.mustChangePassword || session.user.isFirstLogin) {
        state = AuthState(
          status: AuthStatus.mustChangePassword,
          user: session.user,
        );
      } else {
        final me = await api.me();
        state = AuthState(status: AuthStatus.authenticated, user: me);
        _sync.startPeriodicSync();
        unawaited(_sync.runSync(trigger: 'after-login'));
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await api.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      await tokens.clearTokens();
      state = const AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: 'تم تغيير كلمة المرور. سجّل الدخول مجدداً.',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true, clearError: true);
    _sync.stopPeriodicSync();
    await api.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
