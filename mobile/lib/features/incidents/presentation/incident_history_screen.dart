import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/incidents/providers/incidents_controller.dart';
import 'package:rcmc_secureops/features/incidents/widgets/incident_widgets.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

/// سجل البلاغات — closed / cancelled archive view.
class IncidentHistoryScreen extends ConsumerStatefulWidget {
  const IncidentHistoryScreen({super.key});

  @override
  ConsumerState<IncidentHistoryScreen> createState() =>
      _IncidentHistoryScreenState();
}

class _IncidentHistoryScreenState extends ConsumerState<IncidentHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(incidentsControllerProvider.notifier)
          .setFilter(IncidentListFilter.history);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(incidentsControllerProvider);
    final history = state.items.where((e) => e.status.isTerminal).toList()
      ..sort(
        (a, b) =>
            (b.closedAt ?? b.createdAt).compareTo(a.closedAt ?? a.createdAt),
      );

    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل البلاغات'),
        actions: [
          IconButton(
            onPressed: () =>
                ref.read(incidentsControllerProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: state.isLoading && history.isEmpty
          ? const AppLoadingView(message: 'جاري تحميل السجل...')
          : RefreshIndicator(
              onRefresh: () =>
                  ref.read(incidentsControllerProvider.notifier).refresh(),
              child: history.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('لا يوجد سجل مغلق بعد')),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: history.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = history[index];
                        return IncidentListTileCard(
                          incident: item,
                          onTap: () => context.push('/incidents/${item.id}'),
                        );
                      },
                    ),
            ),
    );
  }
}
