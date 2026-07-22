import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/features/violations/providers/violations_controller.dart';
import 'package:rcmc_secureops/features/violations/widgets/violation_widgets.dart';
import 'package:rcmc_secureops/models/violation.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class ViolationsListScreen extends ConsumerWidget {
  const ViolationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(violationsControllerProvider);
    final controller = ref.read(violationsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('مخالفات المركبات'),
        actions: [
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => controller.refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/violations/capture'),
        icon: const Icon(Icons.camera_alt),
        label: const Text('تسجيل مخالفة'),
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
                    hintText: 'بحث برقم اللوحة...',
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
                        label: 'اليوم',
                        selected: state.filter == ViolationListFilter.today,
                        onSelected: () =>
                            controller.setFilter(ViolationListFilter.today),
                      ),
                      _FilterChip(
                        label: 'مفتوحة',
                        selected: state.filter == ViolationListFilter.open,
                        onSelected: () =>
                            controller.setFilter(ViolationListFilter.open),
                      ),
                      _FilterChip(
                        label: 'مغلقة',
                        selected: state.filter == ViolationListFilter.resolved,
                        onSelected: () =>
                            controller.setFilter(ViolationListFilter.resolved),
                      ),
                      _FilterChip(
                        label: 'الكل',
                        selected: state.filter == ViolationListFilter.all,
                        onSelected: () =>
                            controller.setFilter(ViolationListFilter.all),
                      ),
                      const SizedBox(width: 8),
                      ...ParkingArea.all.map(
                        (p) => _FilterChip(
                          label: p.labelAr,
                          selected: state.parkingFilter == p,
                          onSelected: () {
                            if (state.parkingFilter == p) {
                              controller.setParkingFilter(null);
                            } else {
                              controller.setParkingFilter(p);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (state.isLoading) const LinearProgressIndicator(),
          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.refresh,
              child: state.visible.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('لا توجد مخالفات مطابقة')),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                      itemCount: state.visible.length,
                      itemBuilder: (context, index) {
                        final item = state.visible[index];
                        return ViolationListTileCard(
                          violation: item,
                          onTap: () => context.push('/violations/${item.id}'),
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
      padding: const EdgeInsets.only(left: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onSelected(),
      ),
    );
  }
}
