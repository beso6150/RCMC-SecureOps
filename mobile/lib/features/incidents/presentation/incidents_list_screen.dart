import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/incidents/providers/incidents_controller.dart';
import 'package:rcmc_secureops/features/incidents/widgets/incident_widgets.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class IncidentsListScreen extends ConsumerWidget {
  const IncidentsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(incidentsControllerProvider);
    final controller = ref.read(incidentsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('البلاغات'),
        actions: [
          IconButton(
            tooltip: 'سجل البلاغات',
            onPressed: () => context.push('/incidents/history'),
            icon: const Icon(Icons.history),
          ),
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => controller.refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'case_proof_fab',
            onPressed: () => context.push('/incidents/case-proof'),
            icon: const Icon(Icons.fact_check_outlined),
            label: const Text('إثبات حالة'),
          ),
          const SizedBox(height: 10),
          FloatingActionButton.extended(
            heroTag: 'create_incident_fab',
            onPressed: () => context.push('/incidents/create'),
            icon: const Icon(Icons.add_alert),
            label: const Text('إنشاء بلاغ'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        state.isOnline ? 'متصل بالخادم' : 'وضع عدم الاتصال',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                    ),
                    ConnectionBadge(isConnected: state.isOnline),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'بحث في البلاغات...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: controller.setSearch,
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'النشطة',
                        selected: state.filter == IncidentListFilter.active,
                        onSelected: () =>
                            controller.setFilter(IncidentListFilter.active),
                      ),
                      _FilterChip(
                        label: 'السجل',
                        selected: state.filter == IncidentListFilter.history,
                        onSelected: () =>
                            controller.setFilter(IncidentListFilter.history),
                      ),
                      _FilterChip(
                        label: 'بانتظار المزامنة',
                        selected:
                            state.filter == IncidentListFilter.pendingSync,
                        onSelected: () => controller.setFilter(
                          IncidentListFilter.pendingSync,
                        ),
                      ),
                      _FilterChip(
                        label: 'الكل',
                        selected: state.filter == IncidentListFilter.all,
                        onSelected: () =>
                            controller.setFilter(IncidentListFilter.all),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Expanded(
            child: state.isLoading && state.items.isEmpty
                ? const AppLoadingView(message: 'جاري تحميل البلاغات...')
                : RefreshIndicator(
                    onRefresh: controller.refresh,
                    child: state.visible.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 120),
                              Center(child: Text('لا توجد بلاغات')),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                            itemCount: state.visible.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = state.visible[index];
                              return IncidentListTileCard(
                                incident: item,
                                onTap: () =>
                                    context.push('/incidents/${item.id}'),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onSelected(),
      ),
    );
  }
}
