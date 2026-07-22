import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/home/providers/ops_stats_provider.dart';
import 'package:rcmc_secureops/models/dashboard.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tasksControllerProvider);
    final controller = ref.read(tasksControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('المهام'),
        actions: [
          IconButton(
            onPressed: () async {
              await ref.read(syncServiceProvider).runSync(trigger: 'manual');
              await controller.refresh();
            },
            icon: const Icon(Icons.refresh),
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
                        state.isOnline
                            ? 'مهامي'
                            : 'عرض محلي — بانتظار المزامنة',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                    ),
                    ConnectionBadge(isConnected: state.isOnline),
                  ],
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _chip(
                        'المسندة إليّ',
                        state.filter == TaskListFilter.assigned,
                        () => controller.setFilter(TaskListFilter.assigned),
                      ),
                      _chip(
                        'معلقة',
                        state.filter == TaskListFilter.pending,
                        () => controller.setFilter(TaskListFilter.pending),
                      ),
                      _chip(
                        'مكتملة',
                        state.filter == TaskListFilter.completed,
                        () => controller.setFilter(TaskListFilter.completed),
                      ),
                      _chip(
                        'متأخرة',
                        state.filter == TaskListFilter.overdue,
                        () => controller.setFilter(TaskListFilter.overdue),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading && state.items.isEmpty
                ? const AppLoadingView(message: 'جاري تحميل المهام...')
                : RefreshIndicator(
                    onRefresh: () async {
                      await ref
                          .read(syncServiceProvider)
                          .runSync(trigger: 'pull-to-refresh');
                      await controller.refresh();
                    },
                    child: state.visible.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 120),
                              Center(child: Text('لا توجد مهام')),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            itemCount: state.visible.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final task = state.visible[index];
                              return _TaskTile(
                                task: task,
                                onAction: (action) => _runAction(
                                  context,
                                  controller,
                                  task,
                                  action,
                                ),
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

  Future<void> _runAction(
    BuildContext context,
    TasksController controller,
    OpsTask task,
    String action,
  ) async {
    try {
      switch (action) {
        case 'accept':
          await controller.accept(task.id);
          break;
        case 'start':
          await controller.start(task.id);
          break;
        case 'wait':
          await controller.wait(task.id);
          break;
        case 'complete':
          await controller.complete(task.id);
          break;
        case 'reject':
          await controller.reject(task.id);
          break;
        case 'evidence':
          final picker = ImagePicker();
          final file = await picker.pickImage(source: ImageSource.camera);
          if (file == null) return;
          await controller.uploadEvidence(task.id, file.path);
          break;
      }
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('تم تنفيذ الإجراء: $action')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('تعذر التنفيذ: $e')));
      }
    }
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task, required this.onAction});

  final OpsTask task;
  final Future<void> Function(String action) onAction;

  @override
  Widget build(BuildContext context) {
    final due = task.dueAt == null
        ? null
        : DateFormat('yyyy/MM/dd HH:mm', 'ar').format(task.dueAt!);
    final closed =
        task.status == OpsTaskStatus.completed ||
        task.status == OpsTaskStatus.cancelled;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
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
                    color: task.status.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    task.isOverdue && task.status != OpsTaskStatus.completed
                        ? 'متأخرة'
                        : task.status.labelAr,
                    style: TextStyle(
                      color: task.status.color,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(task.description),
            const SizedBox(height: 8),
            Text(
              [
                'الأولوية: ${task.priority.labelAr}',
                if (due != null) 'الاستحقاق: $due',
                if (task.assigner != null) 'من: ${task.assigner!.fullName}',
              ].join(' · '),
              style: Theme.of(context).textTheme.labelSmall,
            ),
            if (!closed) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  if (task.status == OpsTaskStatus.pending)
                    FilledButton.tonal(
                      onPressed: () => onAction('accept'),
                      child: const Text('قبول'),
                    ),
                  FilledButton.tonal(
                    onPressed: () => onAction('start'),
                    child: const Text('بدء'),
                  ),
                  OutlinedButton(
                    onPressed: () => onAction('wait'),
                    child: const Text('انتظار'),
                  ),
                  FilledButton(
                    onPressed: () => onAction('complete'),
                    child: const Text('إكمال'),
                  ),
                  TextButton(
                    onPressed: () => onAction('reject'),
                    child: const Text('رفض'),
                  ),
                  IconButton(
                    tooltip: 'رفع دليل',
                    onPressed: () => onAction('evidence'),
                    icon: const Icon(Icons.photo_camera_outlined),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
