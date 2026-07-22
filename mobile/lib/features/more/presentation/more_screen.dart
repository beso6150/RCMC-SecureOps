import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('المزيد')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('الملف الشخصي'),
            onTap: () => context.push('/profile'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('الإشعارات'),
            onTap: () => context.push('/notifications'),
          ),
          ListTile(
            leading: const Icon(Icons.sync),
            title: const Text('حالة المزامنة'),
            onTap: () => context.push('/sync-status'),
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('الإعدادات'),
            onTap: () => context.push('/settings'),
          ),
          ListTile(
            leading: const Icon(Icons.swap_horiz),
            title: const Text('تسليم الوردية'),
            onTap: () => context.push('/handover'),
          ),
          ListTile(
            leading: const Icon(Icons.directions_car_outlined),
            title: const Text('المخالفات'),
            onTap: () => context.push('/violations'),
          ),
          ListTile(
            leading: const Icon(Icons.groups_outlined),
            title: const Text('الزوار'),
            onTap: () => context.push('/visitors'),
          ),
          ListTile(
            leading: const Icon(Icons.report_outlined),
            title: const Text('الحوادث'),
            onTap: () => context.push('/incidents'),
          ),
          ListTile(
            leading: const Icon(Icons.chat_outlined),
            title: const Text('الرسائل'),
            onTap: () => context.push('/communications'),
          ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('حول التطبيق'),
            onTap: () => context.push('/about'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('تسجيل الخروج'),
            onTap: auth.isLoading
                ? null
                : () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}
