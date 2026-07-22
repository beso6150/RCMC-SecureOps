import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/home/providers/ops_stats_provider.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsControllerProvider);
    final controller = ref.read(notificationsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الإشعارات'),
        actions: [
          IconButton(
            tooltip: 'تعليميز الكل كمقروء',
            onPressed: state.items.any((e) => e.isUnread)
                ? () => controller.markAllRead()
                : null,
            icon: const Icon(Icons.done_all),
          ),
          IconButton(
            onPressed: () => controller.refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          if (!state.isOnline)
            Material(
              color: Theme.of(context).colorScheme.errorContainer,
              child: const ListTile(
                dense: true,
                leading: Icon(Icons.cloud_off),
                title: Text(
                  'عرض من ذاكرة مؤقتة — البيانات قد تكون غير محدَّثة',
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        state.isOnline
                            ? 'متصل بالخادم'
                            : 'عرض من الذاكرة المحلية',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                    ),
                    ConnectionBadge(isConnected: state.isOnline),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'بحث في الإشعارات...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: controller.setSearch,
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _chip(
                        'الكل',
                        state.filter == NotificationListFilter.all,
                        () => controller.setFilter(NotificationListFilter.all),
                      ),
                      _chip(
                        'غير مقروء',
                        state.filter == NotificationListFilter.unread,
                        () =>
                            controller.setFilter(NotificationListFilter.unread),
                      ),
                      _chip(
                        'مقروء',
                        state.filter == NotificationListFilter.read,
                        () => controller.setFilter(NotificationListFilter.read),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading && state.items.isEmpty
                ? const AppLoadingView(message: 'جاري تحميل الإشعارات...')
                : RefreshIndicator(
                    onRefresh: controller.refresh,
                    child: state.visible.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 120),
                              Center(child: Text('لا توجد إشعارات')),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            itemCount: state.visible.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = state.visible[index];
                              return _NotificationTile(
                                notification: item,
                                onTap: () =>
                                    context.push('/notifications/${item.id}'),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final time = DateFormat(
      'yyyy/MM/dd HH:mm',
      'ar',
    ).format(notification.createdAt);

    return Material(
      color: notification.isUnread
          ? scheme.primaryContainer.withValues(alpha: 0.35)
          : scheme.surfaceContainerHighest.withValues(alpha: 0.4),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      notification.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: notification.priority.color.withValues(
                        alpha: 0.15,
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      notification.priority.labelAr,
                      style: TextStyle(
                        color: notification.priority.color,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                notification.body,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                '${notification.sender?.fullName ?? 'النظام'} · $time · ${notification.status.labelAr}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
