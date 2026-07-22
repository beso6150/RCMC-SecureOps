import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/home/providers/ops_stats_provider.dart';
import 'package:rcmc_secureops/features/home/role_dashboards.dart';
import 'package:rcmc_secureops/features/sos/widgets/sos_button.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/theme/app_theme.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(realtimeBootstrapProvider);
    final user = ref.watch(authControllerProvider).user;
    final statsAsync = ref.watch(opsStatsProvider);
    final actions = homeQuickActions(user);
    final modules = roleHomeModules(context, user);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(opsStatsProvider);
            await ref
                .read(syncServiceProvider)
                .runSync(trigger: 'pull-to-refresh');
            await ref.read(opsStatsProvider.future);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: statsAsync.when(
                    data: (stats) => _TopBar(
                      name: user?.fullName ?? 'المستخدم',
                      role: user?.displayRole ?? '—',
                      shift: user?.shiftNameAr ?? 'وردية غير محددة',
                      isConnected: stats.isConnected,
                      lastSync: formatLastSyncAr(stats.lastSyncAt),
                    ),
                    loading: () => _TopBar(
                      name: user?.fullName ?? 'المستخدم',
                      role: user?.displayRole ?? '—',
                      shift: user?.shiftNameAr ?? 'وردية غير محددة',
                      isConnected: false,
                      lastSync: 'جاري التحميل...',
                    ),
                    error: (_, __) => _TopBar(
                      name: user?.fullName ?? 'المستخدم',
                      role: user?.displayRole ?? '—',
                      shift: user?.shiftNameAr ?? 'وردية غير محددة',
                      isConnected: false,
                      lastSync: 'تعذر التحديث',
                    ),
                  ),
                ),
              ),
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
                  child: Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: SosButton(compact: true),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  child: statsAsync.when(
                    data: (stats) => _OpsStatusBar(stats: stats),
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: Text(
                    'إجراءات سريعة',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 2.4,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final action = actions[index];
                    return _QuickActionChip(
                      action: action,
                      onTap: action.enabled
                          ? () {
                              if (action.route == '/home') return;
                              context.push(action.route);
                            }
                          : null,
                    );
                  }, childCount: actions.length),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                  child: Text(
                    'الوحدات',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.92,
                  ),
                  delegate: SliverChildListDelegate(modules),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.name,
    required this.role,
    required this.shift,
    required this.isConnected,
    required this.lastSync,
  });

  final String name;
  final String role;
  final String shift;
  final bool isConnected;
  final String lastSync;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [AppColors.navy, AppColors.steel],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      role,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'الوردية: $shift',
                      style: Theme.of(
                        context,
                      ).textTheme.labelMedium?.copyWith(color: Colors.white60),
                    ),
                  ],
                ),
              ),
              ConnectionBadge(isConnected: isConnected),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'آخر مزامنة: $lastSync',
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: Colors.white54),
          ),
        ],
      ),
    );
  }
}

class _OpsStatusBar extends StatelessWidget {
  const _OpsStatusBar({required this.stats});

  final DashboardSummary stats;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            OpsStatChip(
              label: '🚗 مخالفات اليوم',
              value: '${stats.todaysViolations}',
              icon: Icons.directions_car_filled_outlined,
            ),
            const SizedBox(width: 8),
            OpsStatChip(
              label: '👥 الزوار الحاليون',
              value: '${stats.todaysVisitors}',
              icon: Icons.groups_2_outlined,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            OpsStatChip(
              label: '🚨 بلاغات مفتوحة',
              value: '${stats.openIncidents}',
              icon: Icons.report_outlined,
            ),
            const SizedBox(width: 8),
            OpsStatChip(
              label: '🔔 غير مقروء',
              value: '${stats.unreadNotifications}',
              icon: Icons.notifications_active_outlined,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            OpsStatChip(
              label: '📶 حالة المزامنة',
              value: stats.isConnected
                  ? (stats.syncHealthy ? 'متزامن' : 'جزئي')
                  : 'غير متصل',
              icon: Icons.sync,
            ),
            const SizedBox(width: 8),
            OpsStatChip(
              label: 'مهام معلقة',
              value: '${stats.pendingTasks}',
              icon: Icons.task_alt,
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  const _QuickActionChip({required this.action, this.onTap});

  final QuickActionItem action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onTap != null;
    return Material(
      color: enabled
          ? scheme.surfaceContainerHighest.withValues(alpha: 0.55)
          : scheme.surfaceContainerHighest.withValues(alpha: 0.25),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(
                action.icon,
                color: enabled ? scheme.primary : scheme.outline,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  action.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: enabled ? null : scheme.outline,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
