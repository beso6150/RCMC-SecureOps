import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/services/visitors_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class VisitorsListScreen extends ConsumerWidget {
  const VisitorsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(visitorsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الزوار'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(visitorsListProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل الزوار...'),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('تعذر التحميل: $e', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(visitorsListProvider),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('لا يوجد زوار حالياً'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(visitorsListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final v = items[index];
                final date = DateFormat(
                  'yyyy/MM/dd HH:mm',
                  'ar',
                ).format(v.visitDate);
                return Card(
                  child: ListTile(
                    title: Text(
                      v.visitorName,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('${v.statusLabelAr} · $date'),
                    trailing: v.importance == 'VIP' || v.importance == 'VVIP'
                        ? Chip(label: Text(v.importance!))
                        : null,
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
