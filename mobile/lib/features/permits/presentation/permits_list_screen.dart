import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/services/cctv_ops_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

final permitsListProvider = FutureProvider<List<AccessPermit>>((ref) async {
  return ref.watch(cctvOpsApiServiceProvider).listPermits();
});

class PermitsListScreen extends ConsumerWidget {
  const PermitsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(permitsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('التصاريح'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(permitsListProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل التصاريح...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('لا توجد تصاريح'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(permitsListProvider);
              await ref.read(permitsListProvider.future);
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
                    subtitle: Text(
                      [
                        item.status,
                        if (item.holderName != null) item.holderName!,
                        time,
                      ].join(' · '),
                    ),
                    trailing: item.acknowledged
                        ? const Icon(Icons.check_circle, color: Colors.green)
                        : const Icon(Icons.chevron_left),
                    onTap: () => context.push('/permits/${item.id}'),
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
