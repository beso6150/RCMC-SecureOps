import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/violations/providers/violations_controller.dart';
import 'package:rcmc_secureops/features/violations/widgets/violation_widgets.dart';
import 'package:rcmc_secureops/models/violation.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class ViolationDetailsScreen extends ConsumerWidget {
  const ViolationDetailsScreen({super.key, required this.violationId});

  final String violationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(violationDetailProvider(violationId));

    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل المخالفة')),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل التفاصيل...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (v) {
          final created = DateFormat(
            'yyyy/MM/dd HH:mm',
            'ar',
          ).format(v.createdAt);
          final closed = v.closedAt == null
              ? null
              : DateFormat('yyyy/MM/dd HH:mm', 'ar').format(v.closedAt!);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (v.imagePath != null && File(v.imagePath!).existsSync())
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.file(
                    File(v.imagePath!),
                    height: 220,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                )
              else if (v.attachments.isNotEmpty &&
                  v.attachments.first.localPath != null &&
                  File(v.attachments.first.localPath!).existsSync())
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.file(
                    File(v.attachments.first.localPath!),
                    height: 220,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      v.plateNumber,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  ViolationStatusChip(
                    status: v.status,
                    pendingSync: v.pendingSync,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(v.parkingCode.labelAr),
              Text(v.violationType.labelAr),
              if (v.vehicleColor != null) Text('اللون: ${v.vehicleColor}'),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'التعيين ووقت الاستجابة',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(v.assignedLabel),
                      if (v.createdBy != null)
                        Text('أنشأها: ${v.createdBy!.fullName}'),
                      if (v.responseTimeLabel != null)
                        Text('زمن الاستجابة: ${v.responseTimeLabel}'),
                      if (v.gpsLatitude != null && v.gpsLongitude != null)
                        Text(
                          'GPS: ${v.gpsLatitude!.toStringAsFixed(5)}, ${v.gpsLongitude!.toStringAsFixed(5)}',
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الخط الزمني',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      _TimelineTile(
                        title: 'تم التسجيل',
                        subtitle: created,
                        color: v.status.color,
                        isFirst: true,
                      ),
                      if (v.status.index >= 1)
                        _TimelineTile(
                          title: 'تم الإسناد',
                          subtitle: v.assignedLabel,
                          color: const Color(0xFFFB8C00),
                        ),
                      // simpler timeline based on status progression
                      if (v.status == ViolationStatus.inProgress ||
                          v.status == ViolationStatus.resolved)
                        const _TimelineTile(
                          title: 'قيد المعالجة',
                          subtitle: 'جاري التعامل مع المخالفة',
                          color: Color(0xFF8E24AA),
                        ),
                      if (v.status == ViolationStatus.resolved)
                        _TimelineTile(
                          title: 'تم الإغلاق',
                          subtitle: closed ?? '—',
                          color: const Color(0xFF43A047),
                          isLast: true,
                        ),
                      if (v.status == ViolationStatus.cancelled)
                        _TimelineTile(
                          title: 'أُلغيت',
                          subtitle: closed ?? created,
                          color: const Color(0xFFE53935),
                          isLast: true,
                        ),
                    ],
                  ),
                ),
              ),
              if (v.notes != null && v.notes!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    title: const Text('ملاحظات'),
                    subtitle: Text(v.notes!),
                  ),
                ),
              ],
              if (v.attachments.length > 1) ...[
                const SizedBox(height: 12),
                Text(
                  'الصور',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: v.attachments.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final path =
                          v.attachments[i].localPath ??
                          v.attachments[i].imagePath;
                      if (path == null || !File(path).existsSync()) {
                        return Container(
                          width: 100,
                          decoration: BoxDecoration(
                            color: Colors.black12,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.image_not_supported),
                        );
                      }
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          File(path),
                          width: 100,
                          fit: BoxFit.cover,
                        ),
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.title,
    required this.subtitle,
    required this.color,
    this.isFirst = false,
    this.isLast = false,
  });

  final String title;
  final String subtitle;
  final Color color;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 36,
                color: color.withValues(alpha: 0.35),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
