import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/about/presentation/about_screen.dart';
import 'package:rcmc_secureops/features/auth/presentation/force_change_password_screen.dart';
import 'package:rcmc_secureops/features/auth/presentation/login_screen.dart';
import 'package:rcmc_secureops/features/auth/presentation/splash_screen.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/cctv_referrals/presentation/cctv_referral_create_screen.dart';
import 'package:rcmc_secureops/features/cctv_referrals/presentation/cctv_referral_details_screen.dart';
import 'package:rcmc_secureops/features/cctv_referrals/presentation/cctv_referrals_list_screen.dart';
import 'package:rcmc_secureops/features/communications/presentation/chat_screen.dart';
import 'package:rcmc_secureops/features/communications/presentation/conversations_list_screen.dart';
import 'package:rcmc_secureops/features/errors/presentation/error_screens.dart';
import 'package:rcmc_secureops/features/handover/presentation/handover_screen.dart';
import 'package:rcmc_secureops/features/home/presentation/home_screen.dart';
import 'package:rcmc_secureops/features/home/role_dashboards.dart';
import 'package:rcmc_secureops/features/incidents/presentation/case_proof_screen.dart';
import 'package:rcmc_secureops/features/incidents/presentation/incident_create_screen.dart';
import 'package:rcmc_secureops/features/incidents/presentation/incident_details_screen.dart';
import 'package:rcmc_secureops/features/incidents/presentation/incident_history_screen.dart';
import 'package:rcmc_secureops/features/incidents/presentation/incidents_list_screen.dart';
import 'package:rcmc_secureops/features/more/presentation/more_screen.dart';
import 'package:rcmc_secureops/features/notifications/presentation/notification_details_screen.dart';
import 'package:rcmc_secureops/features/notifications/presentation/notifications_screen.dart';
import 'package:rcmc_secureops/features/patrols/presentation/active_patrol_screen.dart';
import 'package:rcmc_secureops/features/patrols/presentation/patrol_qr_scan_screen.dart';
import 'package:rcmc_secureops/features/patrols/presentation/patrols_list_screen.dart';
import 'package:rcmc_secureops/features/permits/presentation/permit_details_screen.dart';
import 'package:rcmc_secureops/features/permits/presentation/permits_list_screen.dart';
import 'package:rcmc_secureops/features/profile/presentation/change_password_screen.dart';
import 'package:rcmc_secureops/features/profile/presentation/profile_screen.dart';
import 'package:rcmc_secureops/features/settings/presentation/settings_screen.dart';
import 'package:rcmc_secureops/features/shell/main_shell.dart';
import 'package:rcmc_secureops/features/sync_status/presentation/sync_status_screen.dart';
import 'package:rcmc_secureops/features/tasks/presentation/tasks_screen.dart';
import 'package:rcmc_secureops/features/visitors/presentation/visitors_list_screen.dart';
import 'package:rcmc_secureops/features/violations/presentation/violation_capture_screen.dart';
import 'package:rcmc_secureops/features/violations/presentation/violation_details_screen.dart';
import 'package:rcmc_secureops/features/violations/presentation/violation_form_screen.dart';
import 'package:rcmc_secureops/features/violations/presentation/violations_list_screen.dart';
import 'package:rcmc_secureops/core/rbac/route_guard.dart';
import 'package:rcmc_secureops/models/violation.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: _AuthRefresh(ref),
    errorBuilder: (context, state) => const NotFoundScreen(),
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final status = auth.status;

      if (status == AuthStatus.unknown && loc != '/splash') {
        return '/splash';
      }

      if (status == AuthStatus.unauthenticated) {
        if (loc == '/login' || loc == '/splash') return null;
        return '/login';
      }

      if (status == AuthStatus.mustChangePassword) {
        if (loc == '/force-change-password') return null;
        return '/force-change-password';
      }

      if (status == AuthStatus.authenticated) {
        if (loc == '/login' ||
            loc == '/splash' ||
            loc == '/force-change-password') {
          return '/home';
        }

        if (!RouteGuard.allowsRoute(auth.user, loc)) {
          return '/403';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => SplashScreen(
          onReady: () => ref.read(authControllerProvider.notifier).bootstrap(),
        ),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/force-change-password',
        builder: (context, state) => const ForceChangePasswordScreen(),
      ),
      GoRoute(
        path: '/403',
        builder: (context, state) => const ForbiddenScreen(),
      ),
      GoRoute(
        path: '/404',
        builder: (context, state) => const NotFoundScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) => const TasksScreen(),
          ),
          GoRoute(
            path: '/more',
            builder: (context, state) => const MoreScreen(),
          ),
          GoRoute(
            path: '/operations',
            builder: (context, state) => const OperationsScreen(),
          ),
          GoRoute(
            path: '/personnel',
            builder: (context, state) => const PersonnelScreen(),
          ),
          GoRoute(
            path: '/patrols',
            builder: (context, state) => const PatrolsListScreen(),
            routes: [
              GoRoute(
                path: 'active',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const ActivePatrolScreen(),
              ),
              GoRoute(
                path: 'scan',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const PatrolQrScanScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/cctv-referrals',
            builder: (context, state) => const CctvReferralsListScreen(),
            routes: [
              GoRoute(
                path: 'create',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CctvReferralCreateScreen(),
              ),
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => CctvReferralDetailsScreen(
                  referralId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/permits',
            builder: (context, state) => const PermitsListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) =>
                    PermitDetailsScreen(permitId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/communications',
            builder: (context, state) => const ConversationsListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) =>
                    ChatScreen(conversationId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/incidents',
            builder: (context, state) => const IncidentsListScreen(),
            routes: [
              GoRoute(
                path: 'create',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const IncidentCreateScreen(),
              ),
              GoRoute(
                path: 'case-proof',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CaseProofScreen(),
              ),
              GoRoute(
                path: 'history',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const IncidentHistoryScreen(),
              ),
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => IncidentDetailsScreen(
                  incidentId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => NotificationDetailsScreen(
              notificationId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
        routes: [
          GoRoute(
            path: 'change-password',
            builder: (context, state) => const ChangePasswordScreen(),
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/about',
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/sync-status',
        builder: (context, state) => const SyncStatusScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/handover',
        builder: (context, state) => const HandoverScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/visitors',
        builder: (context, state) => const VisitorsListScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/violations',
        builder: (context, state) => const ViolationsListScreen(),
        routes: [
          GoRoute(
            path: 'capture',
            builder: (context, state) => const ViolationCaptureScreen(),
          ),
          GoRoute(
            path: 'create',
            builder: (context, state) {
              final draft = state.extra;
              if (draft is! CreateViolationDraft) {
                return const Scaffold(
                  body: Center(child: Text('بيانات التقاط غير متوفرة')),
                );
              }
              return ViolationFormScreen(draft: draft);
            },
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => ViolationDetailsScreen(
              violationId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),
    ],
  );
});

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(this.ref) {
    ref.listen<AuthState>(authControllerProvider, (_, __) {
      notifyListeners();
    });
  }

  final Ref ref;
}
