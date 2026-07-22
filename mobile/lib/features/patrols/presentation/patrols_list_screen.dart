import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/services/field_ops_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

final patrolsListProvider = FutureProvider<List<PatrolSummary>>((ref) async {
  return ref.watch(fieldOpsApiServiceProvider).listPatrols();
});

final activePatrolProvider = FutureProvider<PatrolSummary?>((ref) async {
  return ref.watch(fieldOpsApiServiceProvider).activePatrol();
});

class PatrolsListScreen extends ConsumerWidget {
  const PatrolsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(patrolsListProvider);
    final active = ref.watch(activePatrolProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الجولات'),
        actions: [
          IconButton(
            onPressed: () {
              ref.invalidate(patrolsListProvider);
              ref.invalidate(activePatrolProvider);
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/patrols/scan'),
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('مسح نقطة'),
      ),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل الجولات...'),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('تعذر التحميل: $e', textAlign: TextAlign.center),
          ),
        ),
        data: (items) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(patrolsListProvider);
              ref.invalidate(activePatrolProvider);
              await ref.read(patrolsListProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                active.when(
                  data: (p) => p == null
                      ? const SizedBox.shrink()
                      : Card(
                          color: Theme.of(
                            context,
                          ).colorScheme.primaryContainer.withValues(alpha: 0.4),
                          child: ListTile(
                            leading: const Icon(Icons.directions_walk),
                            title: Text('جولة نشطة: ${p.title}'),
                            subtitle: Text(
                              '${p.checkpointsDone}/${p.checkpointsTotal} نقاط',
                            ),
                            trailing: const Icon(Icons.chevron_left),
                            onTap: () => context.push('/patrols/active'),
                          ),
                        ),
                  loading: () => const LinearProgressIndicator(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
                const SizedBox(height: 8),
                if (items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 80),
                    child: Center(child: Text('لا توجد جولات')),
                  )
                else
                  ...items.map(
                    (p) => Card(
                      child: ListTile(
                        title: Text(p.title),
                        subtitle: Text(
                          '${p.status} · ${p.checkpointsDone}/${p.checkpointsTotal}',
                        ),
                        trailing: const Icon(Icons.chevron_left),
                        onTap: () => context.push('/patrols/active'),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
