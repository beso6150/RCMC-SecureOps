import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    if (user == null) {
      return const Scaffold(body: AppLoadingView());
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('الملف الشخصي'),
        actions: [
          IconButton(
            tooltip: 'الإعدادات',
            onPressed: () => context.push('/settings'),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    child: Text(
                      user.fullName.isNotEmpty
                          ? user.fullName.substring(0, 1)
                          : '?',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user.fullName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(user.displayRole),
                  const SizedBox(height: 4),
                  Text(
                    user.employeeNumber,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.badge_outlined),
                  title: const Text('الهوية الوطنية'),
                  subtitle: Text(user.nationalId),
                ),
                ListTile(
                  leading: const Icon(Icons.numbers),
                  title: const Text('الرقم الوظيفي'),
                  subtitle: Text(user.employeeNumber),
                ),
                ListTile(
                  leading: const Icon(Icons.apartment_outlined),
                  title: const Text('القسم'),
                  subtitle: Text(user.departmentNameAr ?? '—'),
                ),
                ListTile(
                  leading: const Icon(Icons.security_outlined),
                  title: const Text('الدور'),
                  subtitle: Text(user.displayRole),
                ),
                ListTile(
                  leading: const Icon(Icons.schedule),
                  title: const Text('الوردية'),
                  subtitle: Text(user.shiftNameAr ?? 'غير محددة'),
                ),
                ListTile(
                  leading: const Icon(Icons.phone_outlined),
                  title: const Text('الجوال'),
                  subtitle: Text(user.phone ?? '—'),
                ),
                ListTile(
                  leading: const Icon(Icons.email_outlined),
                  title: const Text('البريد'),
                  subtitle: Text(user.email),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: () => context.push('/profile/change-password'),
            icon: const Icon(Icons.lock_outline),
            label: const Text('تغيير كلمة المرور'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: auth.isLoading
                ? null
                : () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('تسجيل الخروج'),
          ),
        ],
      ),
    );
  }
}
