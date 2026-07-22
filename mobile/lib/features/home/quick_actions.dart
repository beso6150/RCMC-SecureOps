import 'package:flutter/material.dart';
import 'package:rcmc_secureops/models/auth_user.dart';
import 'package:rcmc_secureops/models/dashboard.dart';

List<QuickActionItem> quickActionsForRole(AuthUser? user) {
  final role = user?.roleCode ?? '';
  final perms = user?.permissions ?? const <String>[];

  bool has(String code) => perms.contains(code);

  switch (role) {
    case 'SECURITY_GUARD':
      return [
        QuickActionItem(
          title: 'تسجيل مخالفة',
          icon: Icons.camera_alt_outlined,
          route: '/violations/capture',
          enabled: has('violations:create'),
        ),
        QuickActionItem(
          title: 'إنشاء بلاغ',
          icon: Icons.add_alert_outlined,
          route: '/incidents/create',
          enabled: has('incidents:create'),
        ),
        const QuickActionItem(
          title: 'عرض المهام',
          icon: Icons.task_alt_outlined,
          route: '/tasks',
        ),
      ];
    case 'SECURITY_SUPERVISOR':
      return [
        QuickActionItem(
          title: 'تسجيل مخالفة',
          icon: Icons.camera_alt_outlined,
          route: '/violations/capture',
          enabled: has('violations:create') || has('violations:update'),
        ),
        QuickActionItem(
          title: 'إنشاء بلاغ',
          icon: Icons.add_alert_outlined,
          route: '/incidents/create',
          enabled: has('incidents:create'),
        ),
        const QuickActionItem(
          title: 'عرض المهام',
          icon: Icons.task_alt_outlined,
          route: '/tasks',
        ),
        QuickActionItem(
          title: 'متابعة البلاغات',
          icon: Icons.report_outlined,
          route: '/incidents',
          enabled: has('incidents:read'),
        ),
        QuickActionItem(
          title: 'اعتماد المخالفات',
          icon: Icons.verified_outlined,
          route: '/violations',
          enabled: has('violations:close') || has('violations:assign'),
        ),
      ];
    case 'CCTV_OPERATOR':
      return [
        QuickActionItem(
          title: 'البلاغات الواردة',
          icon: Icons.report_outlined,
          route: '/incidents',
          enabled: has('incidents:read'),
        ),
        const QuickActionItem(
          title: 'طلبات الاستعلام',
          icon: Icons.search,
          route: '/tasks',
        ),
        const QuickActionItem(
          title: 'متابعة الكاميرات',
          icon: Icons.videocam_outlined,
          route: '/tasks',
          enabled: true,
        ),
      ];
    case 'OPERATIONS_MANAGER':
      return [
        const QuickActionItem(
          title: 'لوحة العمليات',
          icon: Icons.dashboard_outlined,
          route: '/home',
        ),
        QuickActionItem(
          title: 'جميع البلاغات',
          icon: Icons.report_outlined,
          route: '/incidents',
          enabled: has('incidents:read'),
        ),
        const QuickActionItem(
          title: 'توزيع المهام',
          icon: Icons.assignment_ind_outlined,
          route: '/tasks',
        ),
      ];
    case 'PROJECT_MANAGER':
      return [
        const QuickActionItem(
          title: 'مؤشرات الأداء',
          icon: Icons.insights_outlined,
          route: '/home',
        ),
        QuickActionItem(
          title: 'السجل الزمني',
          icon: Icons.history,
          route: '/incidents/history',
          enabled: has('incidents:read'),
        ),
        QuickActionItem(
          title: 'قراءة الشكاوى',
          icon: Icons.feedback_outlined,
          route: '/notifications',
          enabled: has('complaints:read'),
        ),
      ];
    case 'SECURITY_DIRECTOR':
      return [
        const QuickActionItem(
          title: 'لوحة التحكم الكاملة',
          icon: Icons.admin_panel_settings_outlined,
          route: '/home',
        ),
        QuickActionItem(
          title: 'إدارة المستخدمين',
          icon: Icons.group_outlined,
          route: '/settings',
          enabled: has('users:read'),
        ),
        QuickActionItem(
          title: 'إدارة الصلاحيات',
          icon: Icons.security_outlined,
          route: '/settings',
          enabled: has('permissions:read') || has('roles:read'),
        ),
        QuickActionItem(
          title: 'اعتماد الشكاوى',
          icon: Icons.fact_check_outlined,
          route: '/notifications',
          enabled: has('complaints:approve'),
        ),
        const QuickActionItem(
          title: 'التقارير',
          icon: Icons.picture_as_pdf_outlined,
          route: '/incidents/history',
        ),
      ];
    default:
      return [
        const QuickActionItem(
          title: 'عرض المهام',
          icon: Icons.task_alt_outlined,
          route: '/tasks',
        ),
        const QuickActionItem(
          title: 'الإشعارات',
          icon: Icons.notifications_outlined,
          route: '/notifications',
        ),
      ];
  }
}
