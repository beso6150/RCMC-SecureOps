import 'package:rcmc_secureops/models/auth_user.dart';

/// Role-based route allow helpers for go_router redirects.
class RouteGuard {
  RouteGuard._();

  static const Set<String> publicPaths = {
    '/splash',
    '/login',
    '/force-change-password',
    '/403',
    '/404',
  };

  /// Routes reachable by any authenticated user.
  static const Set<String> commonAuthenticated = {
    '/home',
    '/more',
    '/settings',
    '/about',
    '/sync-status',
    '/profile',
    '/notifications',
    '/tasks',
  };

  static bool isPublic(String path) {
    if (publicPaths.contains(path)) return true;
    for (final p in publicPaths) {
      if (path.startsWith('$p/')) return true;
    }
    return false;
  }

  static bool hasPermission(AuthUser? user, String code) {
    if (user == null) return false;
    return user.permissions.contains(code);
  }

  static bool hasAnyPermission(AuthUser? user, Iterable<String> codes) {
    if (user == null) return false;
    return codes.any(user.permissions.contains);
  }

  static bool isRole(AuthUser? user, String roleCode) =>
      user?.roleCode == roleCode;

  static bool isGuard(AuthUser? user) => isRole(user, 'SECURITY_GUARD');

  static bool isSupervisor(AuthUser? user) =>
      isRole(user, 'SECURITY_SUPERVISOR') ||
      isRole(user, 'OPERATIONS_MANAGER') ||
      isRole(user, 'SECURITY_DIRECTOR');

  static bool isCctv(AuthUser? user) => isRole(user, 'CCTV_OPERATOR');

  /// Returns true when [path] is allowed for [user].
  static bool allowsRoute(AuthUser? user, String path) {
    if (user == null) return isPublic(path);
    if (isPublic(path)) return true;

    final normalized = path.split('?').first;
    if (commonAuthenticated.any(
      (p) => normalized == p || normalized.startsWith('$p/'),
    )) {
      return true;
    }

    if (normalized.startsWith('/violations') ||
        normalized.startsWith('/incidents') ||
        normalized.startsWith('/visitors')) {
      return true;
    }

    if (normalized.startsWith('/patrols') || normalized == '/sos') {
      return isGuard(user) || isSupervisor(user);
    }

    if (normalized.startsWith('/handover')) {
      return isGuard(user) || isSupervisor(user);
    }

    if (normalized.startsWith('/operations') ||
        normalized.startsWith('/personnel')) {
      return isSupervisor(user) || isRole(user, 'PROJECT_MANAGER');
    }

    if (normalized.startsWith('/cctv-referrals') ||
        normalized.startsWith('/permits')) {
      return isCctv(user) || isSupervisor(user);
    }

    if (normalized.startsWith('/communications')) {
      return true;
    }

    return false;
  }

  /// Only allow internal deep-link paths (leading slash, no scheme).
  static String? sanitizeDeepLink(String? actionUrl) {
    if (actionUrl == null) return null;
    final trimmed = actionUrl.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.contains('://')) return null;
    if (!trimmed.startsWith('/')) return null;
    if (trimmed.startsWith('//')) return null;
    return trimmed.split('?').first;
  }
}
