import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/constants/about_info.dart';
import 'package:rcmc_secureops/core/rbac/route_guard.dart';
import 'package:rcmc_secureops/core/sync/conflict_mapper.dart';
import 'package:rcmc_secureops/core/sync/idempotency.dart';
import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/core/sync/sync_queue_models.dart';
import 'package:rcmc_secureops/features/about/presentation/about_screen.dart';
import 'package:rcmc_secureops/models/auth_user.dart';

void main() {
  group('SyncQueueTransitions', () {
    test('pending can move to syncing', () {
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.pending,
          SyncQueueStatus.syncing,
        ),
        isTrue,
      );
      expect(
        SyncQueueTransitions.transition(
          SyncQueueStatus.pending,
          SyncQueueStatus.syncing,
        ),
        SyncQueueStatus.syncing,
      );
    });

    test('syncing can resolve to synced, failed, or conflict', () {
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.syncing,
          SyncQueueStatus.synced,
        ),
        isTrue,
      );
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.syncing,
          SyncQueueStatus.failed,
        ),
        isTrue,
      );
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.syncing,
          SyncQueueStatus.conflict,
        ),
        isTrue,
      );
    });

    test('synced is terminal', () {
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.synced,
          SyncQueueStatus.pending,
        ),
        isFalse,
      );
      expect(
        SyncQueueTransitions.transition(
          SyncQueueStatus.synced,
          SyncQueueStatus.failed,
        ),
        SyncQueueStatus.synced,
      );
    });

    test('failed can retry as pending', () {
      expect(
        SyncQueueTransitions.canTransition(
          SyncQueueStatus.failed,
          SyncQueueStatus.pending,
        ),
        isTrue,
      );
    });
  });

  group('IdempotencyKeyGenerator', () {
    test('reuses existing non-empty key', () {
      final gen = IdempotencyKeyGenerator();
      expect(gen.generate(existing: 'abc-123'), 'abc-123');
    });

    test('mints uuid when existing empty', () {
      final gen = IdempotencyKeyGenerator();
      final key = gen.generate(existing: '  ');
      expect(key, isNotEmpty);
      expect(key.contains('-'), isTrue);
    });

    test('queue item key is deterministic', () {
      final gen = IdempotencyKeyGenerator();
      final a = gen.forQueueItem(
        localId: 'L1',
        operationType: 'task_update',
        entityType: 'task',
      );
      final b = gen.forQueueItem(
        localId: 'L1',
        operationType: 'task_update',
        entityType: 'task',
      );
      expect(a, b);
      expect(a, 'task_update:task:L1');
    });
  });

  group('Offline SOS policy', () {
    test('blocks SOS when offline', () {
      expect(OfflinePolicy.isSosBlockedOffline(isOnline: false), isTrue);
      expect(OfflinePolicy.isSosBlockedOffline(isOnline: true), isFalse);
    });

    test('offline SOS message is Arabic and clear', () {
      expect(OfflinePolicy.sosOfflineFailureAr, contains('استغاثة'));
      expect(OfflinePolicy.sosOfflineFailureAr, contains('لا يوجد اتصال'));
    });

    test('forbids final handover and critical close offline', () {
      expect(OfflinePolicy.isForbiddenOffline('handover_final'), isTrue);
      expect(OfflinePolicy.isForbiddenOffline('critical_close'), isTrue);
      expect(OfflinePolicy.canQueue('violation_create'), isTrue);
      expect(OfflinePolicy.canQueue('referral_draft'), isTrue);
    });
  });

  group('RBAC route allow', () {
    AuthUser user(String role, {List<String> perms = const []}) {
      return AuthUser(
        id: '1',
        fullName: 'Test',
        nationalId: '1',
        employeeNumber: 'E1',
        email: 't@t.com',
        roleCode: role,
        isFirstLogin: false,
        status: 'ACTIVE',
        permissions: perms,
      );
    }

    test('guard can open patrols and tasks', () {
      final u = user('SECURITY_GUARD');
      expect(RouteGuard.allowsRoute(u, '/patrols'), isTrue);
      expect(RouteGuard.allowsRoute(u, '/tasks'), isTrue);
      expect(RouteGuard.allowsRoute(u, '/home'), isTrue);
    });

    test('cctv can open referrals and permits', () {
      final u = user('CCTV_OPERATOR');
      expect(RouteGuard.allowsRoute(u, '/cctv-referrals'), isTrue);
      expect(RouteGuard.allowsRoute(u, '/permits'), isTrue);
      expect(RouteGuard.allowsRoute(u, '/patrols'), isFalse);
    });

    test('deep links only allow internal paths', () {
      expect(RouteGuard.sanitizeDeepLink('/tasks'), '/tasks');
      expect(RouteGuard.sanitizeDeepLink('https://evil.com'), isNull);
      expect(RouteGuard.sanitizeDeepLink('//evil'), isNull);
      expect(RouteGuard.sanitizeDeepLink('tasks'), isNull);
    });
  });

  group('Sync conflict mapping', () {
    const mapper = SyncConflictMapper();

    test('409 maps to CONFLICT with server-wins Arabic message', () {
      final r = mapper.map(statusCode: 409);
      expect(r.status, SyncQueueStatus.conflict);
      expect(r.serverWins, isTrue);
      expect(r.messageAr, OfflinePolicy.conflictMessageAr);
    });

    test('CONFLICT code maps similarly', () {
      final r = mapper.map(serverCode: 'ENTITY_CONFLICT');
      expect(r.status, SyncQueueStatus.conflict);
      expect(r.serverWins, isTrue);
    });

    test('other errors map to FAILED', () {
      final r = mapper.map(statusCode: 500, serverMessage: 'خطأ خادم');
      expect(r.status, SyncQueueStatus.failed);
      expect(r.serverWins, isFalse);
      expect(r.messageAr, 'خطأ خادم');
    });
  });

  group('About + RTL smoke', () {
    test('about strings match Sprint 20 credits', () {
      expect(AboutInfo.productName, 'RCMC SecureOps');
      expect(AboutInfo.developedBy, 'Bassam Alharbi');
      expect(AboutInfo.phone, '0556728911');
      expect(AboutInfo.email, 'bassam14s44@gmail.com');
      expect(AboutInfo.version, '1.0.0');
      expect(AboutInfo.copyright, '© 2026');
      expect(AppConfig.appVersion, '1.0.0');
    });

    testWidgets('AboutScreen renders product name in RTL', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: AboutScreen(),
          ),
        ),
      );
      expect(find.byKey(const Key('about_product_name')), findsOneWidget);
      expect(find.text('RCMC SecureOps'), findsOneWidget);
      expect(find.textContaining('Bassam Alharbi'), findsOneWidget);
      expect(find.text('0556728911'), findsOneWidget);
      expect(find.text('© 2026'), findsOneWidget);
    });
  });
}
