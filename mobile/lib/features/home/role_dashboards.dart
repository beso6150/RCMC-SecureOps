import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/home/quick_actions.dart';
import 'package:rcmc_secureops/models/auth_user.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

/// Supervisor operations hub.
class OperationsScreen extends StatelessWidget {
  const OperationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('العمليات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _tile(context, 'الحوادث', Icons.report_outlined, '/incidents'),
          _tile(
            context,
            'المخالفات',
            Icons.directions_car_outlined,
            '/violations',
          ),
          _tile(context, 'المهام', Icons.task_alt_outlined, '/tasks'),
          _tile(context, 'تسليم الوردية', Icons.swap_horiz, '/handover'),
        ],
      ),
    );
  }

  Widget _tile(
    BuildContext context,
    String title,
    IconData icon,
    String route,
  ) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        trailing: const Icon(Icons.chevron_left),
        onTap: () => context.push(route),
      ),
    );
  }
}

/// Supervisor personnel hub.
class PersonnelScreen extends StatelessWidget {
  const PersonnelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الأفراد')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.groups_outlined),
              title: const Text('الزوار'),
              onTap: () => context.push('/visitors'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.assignment_ind_outlined),
              title: const Text('المهام المسندة'),
              onTap: () => context.push('/tasks'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.swap_horiz),
              title: const Text('تسليم الوردية'),
              onTap: () => context.push('/handover'),
            ),
          ),
        ],
      ),
    );
  }
}

class NavDestinationSpec {
  const NavDestinationSpec({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.path,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String path;
}

List<NavDestinationSpec> navDestinationsForRole(AuthUser? user) {
  final role = user?.roleCode ?? '';
  switch (role) {
    case 'CCTV_OPERATOR':
      return const [
        NavDestinationSpec(
          label: 'الرئيسية',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          path: '/home',
        ),
        NavDestinationSpec(
          label: 'الإحالات',
          icon: Icons.assignment_outlined,
          selectedIcon: Icons.assignment,
          path: '/cctv-referrals',
        ),
        NavDestinationSpec(
          label: 'التصاريح',
          icon: Icons.badge_outlined,
          selectedIcon: Icons.badge,
          path: '/permits',
        ),
        NavDestinationSpec(
          label: 'الرسائل',
          icon: Icons.chat_outlined,
          selectedIcon: Icons.chat,
          path: '/communications',
        ),
        NavDestinationSpec(
          label: 'المزيد',
          icon: Icons.more_horiz,
          selectedIcon: Icons.more_horiz,
          path: '/more',
        ),
      ];
    case 'SECURITY_SUPERVISOR':
    case 'OPERATIONS_MANAGER':
    case 'SECURITY_DIRECTOR':
    case 'PROJECT_MANAGER':
      return const [
        NavDestinationSpec(
          label: 'الرئيسية',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          path: '/home',
        ),
        NavDestinationSpec(
          label: 'العمليات',
          icon: Icons.dashboard_outlined,
          selectedIcon: Icons.dashboard,
          path: '/operations',
        ),
        NavDestinationSpec(
          label: 'الأفراد',
          icon: Icons.groups_outlined,
          selectedIcon: Icons.groups,
          path: '/personnel',
        ),
        NavDestinationSpec(
          label: 'المهام',
          icon: Icons.task_alt_outlined,
          selectedIcon: Icons.task_alt,
          path: '/tasks',
        ),
        NavDestinationSpec(
          label: 'المزيد',
          icon: Icons.more_horiz,
          selectedIcon: Icons.more_horiz,
          path: '/more',
        ),
      ];
    case 'SECURITY_GUARD':
    default:
      return const [
        NavDestinationSpec(
          label: 'الرئيسية',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          path: '/home',
        ),
        NavDestinationSpec(
          label: 'مهامي',
          icon: Icons.task_alt_outlined,
          selectedIcon: Icons.task_alt,
          path: '/tasks',
        ),
        NavDestinationSpec(
          label: 'الحوادث',
          icon: Icons.report_outlined,
          selectedIcon: Icons.report,
          path: '/incidents',
        ),
        NavDestinationSpec(
          label: 'الجولات',
          icon: Icons.directions_walk_outlined,
          selectedIcon: Icons.directions_walk,
          path: '/patrols',
        ),
        NavDestinationSpec(
          label: 'المزيد',
          icon: Icons.more_horiz,
          selectedIcon: Icons.more_horiz,
          path: '/more',
        ),
      ];
  }
}

/// Role-aware home dashboard modules.
List<Widget> roleHomeModules(BuildContext context, AuthUser? user) {
  final role = user?.roleCode ?? '';
  switch (role) {
    case 'CCTV_OPERATOR':
      return [
        HomeModuleCard(
          title: 'الإحالات',
          subtitle: 'متابعة الإحالات الواردة',
          emoji: '📹',
          accent: const Color(0xFF5C6BC0),
          onTap: () => context.push('/cctv-referrals'),
        ),
        HomeModuleCard(
          title: 'التصاريح',
          subtitle: 'إقرار ومتابعة التصاريح',
          emoji: '🪪',
          accent: const Color(0xFF26A69A),
          onTap: () => context.push('/permits'),
        ),
        HomeModuleCard(
          title: 'الرسائل',
          subtitle: 'التواصل التشغيلي',
          emoji: '💬',
          accent: const Color(0xFF42A5F5),
          onTap: () => context.push('/communications'),
        ),
        HomeModuleCard(
          title: 'البلاغات',
          subtitle: 'البلاغات المرتبطة بالكاميرات',
          emoji: '🚨',
          accent: const Color(0xFFE53935),
          onTap: () => context.push('/incidents'),
        ),
      ];
    case 'SECURITY_SUPERVISOR':
    case 'OPERATIONS_MANAGER':
    case 'SECURITY_DIRECTOR':
      return [
        HomeModuleCard(
          title: 'لوحة العمليات',
          subtitle: 'الحوادث والمخالفات والمهام',
          emoji: '🎛️',
          accent: const Color(0xFF1565C0),
          onTap: () => context.push('/operations'),
        ),
        HomeModuleCard(
          title: 'الأفراد',
          subtitle: 'الزوار وتسليم الوردية',
          emoji: '👥',
          accent: const Color(0xFF00897B),
          onTap: () => context.push('/personnel'),
        ),
        HomeModuleCard(
          title: 'المخالفات',
          subtitle: 'تسجيل ومتابعة المخالفات',
          emoji: '🚗',
          accent: const Color(0xFFFB8C00),
          onTap: () => context.push('/violations'),
        ),
        HomeModuleCard(
          title: 'الحوادث',
          subtitle: 'البلاغات الميدانية',
          emoji: '🚨',
          accent: const Color(0xFFE53935),
          onTap: () => context.push('/incidents'),
        ),
      ];
    default:
      return [
        HomeModuleCard(
          title: 'مخالفات المركبات',
          subtitle: 'تسجيل ومتابعة المخالفات',
          emoji: '🚗',
          accent: const Color(0xFFFB8C00),
          onTap: () => context.push('/violations'),
        ),
        HomeModuleCard(
          title: 'الجولات',
          subtitle: 'نقاط التفتيش ومسح QR',
          emoji: '🚶',
          accent: const Color(0xFF00897B),
          onTap: () => context.push('/patrols'),
        ),
        HomeModuleCard(
          title: 'البلاغات وإثبات الحالات',
          subtitle: 'البلاغات والحوادث الميدانية',
          emoji: '🚨',
          accent: const Color(0xFFE53935),
          onTap: () => context.push('/incidents'),
        ),
        HomeModuleCard(
          title: 'تسليم الوردية',
          subtitle: 'مسودة وتسليم عند الاتصال',
          emoji: '🔄',
          accent: const Color(0xFF5C6BC0),
          onTap: () => context.push('/handover'),
        ),
      ];
  }
}

/// Expose quick actions for home without unused warnings.
List<QuickActionItem> homeQuickActions(AuthUser? user) =>
    quickActionsForRole(user);
