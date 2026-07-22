import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/services/cctv_ops_api_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

final referralsListProvider = FutureProvider<List<CctvReferral>>((ref) async {
  return ref.watch(cctvOpsApiServiceProvider).listReferrals();
});

class CctvReferralsListScreen extends ConsumerWidget {
  const CctvReferralsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(referralsListProvider);
    final online = ref.watch(connectivityAwareOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الإحالات'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(referralsListProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/cctv-referrals/create'),
        icon: const Icon(Icons.add),
        label: Text(online ? 'إحالة جديدة' : 'مسودة دون اتصال'),
      ),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل الإحالات...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('لا توجد إحالات'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(referralsListProvider);
              await ref.read(referralsListProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final item = items[i];
                final time = DateFormat(
                  'yyyy/MM/dd HH:mm',
                  'ar',
                ).format(item.createdAt);
                return Card(
                  child: ListTile(
                    title: Text(item.title),
                    subtitle: Text('${item.status} · $time'),
                    trailing: item.isDraft
                        ? const Chip(label: Text('مسودة'))
                        : const Icon(Icons.chevron_left),
                    onTap: () => context.push('/cctv-referrals/${item.id}'),
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
