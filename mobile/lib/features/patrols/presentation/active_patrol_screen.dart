import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/patrols/presentation/patrols_list_screen.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class ActivePatrolScreen extends ConsumerWidget {
  const ActivePatrolScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(activePatrolProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الجولة النشطة'),
        actions: [
          IconButton(
            onPressed: () => context.push('/patrols/scan'),
            icon: const Icon(Icons.qr_code_scanner),
          ),
        ],
      ),
      body: async.when(
        loading: () => const AppLoadingView(),
        error: (e, _) => Center(child: Text('$e')),
        data: (p) {
          if (p == null) {
            return const Center(child: Text('لا توجد جولة نشطة حالياً'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                p.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text('الحالة: ${p.status}'),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: p.checkpointsTotal == 0
                    ? 0
                    : p.checkpointsDone / p.checkpointsTotal,
              ),
              const SizedBox(height: 8),
              Text('${p.checkpointsDone} من ${p.checkpointsTotal} نقاط تفتيش'),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => context.push('/patrols/scan'),
                icon: const Icon(Icons.qr_code_2),
                label: const Text('مسح رمز نقطة التفتيش'),
              ),
            ],
          );
        },
      ),
    );
  }
}
