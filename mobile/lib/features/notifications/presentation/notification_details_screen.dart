import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/core/rbac/route_guard.dart';
import 'package:rcmc_secureops/features/home/providers/ops_stats_provider.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class NotificationDetailsScreen extends ConsumerStatefulWidget {
  const NotificationDetailsScreen({super.key, required this.notificationId});

  final String notificationId;

  @override
  ConsumerState<NotificationDetailsScreen> createState() =>
      _NotificationDetailsScreenState();
}

class _NotificationDetailsScreenState
    extends ConsumerState<NotificationDetailsScreen> {
  var _marked = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(notificationDetailProvider(widget.notificationId));

    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل الإشعار')),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري التحميل...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (n) {
          if (!_marked && n.isUnread) {
            _marked = true;
            Future.microtask(() {
              ref.read(notificationsControllerProvider.notifier).markRead(n.id);
            });
          }

          final time = DateFormat('yyyy/MM/dd HH:mm', 'ar').format(n.createdAt);
          final deepLink = RouteGuard.sanitizeDeepLink(n.actionUrl);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                n.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  Chip(label: Text(n.priority.labelAr)),
                  Chip(label: Text(n.status.labelAr)),
                  if (n.acknowledged) const Chip(label: Text('تم الإقرار')),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(n.body),
                      const SizedBox(height: 16),
                      Text('المرسل: ${n.sender?.fullName ?? 'النظام'}'),
                      Text('الوقت: $time'),
                      if (n.entityType != null) Text('المرجع: ${n.entityType}'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (!n.acknowledged)
                FilledButton.tonal(
                  onPressed: () async {
                    await ref
                        .read(notificationsControllerProvider.notifier)
                        .acknowledge(n.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('تم الإقرار بالإشعار')),
                      );
                    }
                  },
                  child: const Text('إقرار'),
                ),
              if (deepLink != null) ...[
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => context.push(deepLink),
                  child: const Text('فتح الرابط الداخلي'),
                ),
              ],
              if (n.entityType == 'Incident' && n.entityId != null) ...[
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.push('/incidents/${n.entityId}'),
                  child: const Text('فتح البلاغ المرتبط'),
                ),
              ],
              if (n.entityType == 'VehicleViolation' && n.entityId != null) ...[
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.push('/violations/${n.entityId}'),
                  child: const Text('فتح المخالفة المرتبطة'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
