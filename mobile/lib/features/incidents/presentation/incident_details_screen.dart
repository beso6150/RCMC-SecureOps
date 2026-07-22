import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/incidents/providers/incidents_controller.dart';
import 'package:rcmc_secureops/features/incidents/widgets/incident_widgets.dart';
import 'package:rcmc_secureops/models/incident.dart';
import 'package:rcmc_secureops/theme/app_theme.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';
import 'package:url_launcher/url_launcher.dart';

class IncidentDetailsScreen extends ConsumerStatefulWidget {
  const IncidentDetailsScreen({super.key, required this.incidentId});

  final String incidentId;

  @override
  ConsumerState<IncidentDetailsScreen> createState() =>
      _IncidentDetailsScreenState();
}

class _IncidentDetailsScreenState extends ConsumerState<IncidentDetailsScreen> {
  final _commentCtrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _endIncident(IncidentRecord incident) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إنهاء الحالة'),
        content: const Text(
          'سيتم حفظ وقت الإنهاء وحساب المدة وتوليد تقرير PDF. هل تريد المتابعة؟',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('إنهاء الحالة'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _busy = true);
    try {
      final closed = await ref
          .read(incidentsControllerProvider.notifier)
          .closeIncident(incident.id);
      ref.invalidate(incidentDetailProvider(widget.incidentId));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تم إنهاء الحالة — المدة: ${closed.durationLabelAr ?? '—'}',
          ),
        ),
      );

      if (closed.pdfPath != null || closed.pdfUrl != null) {
        await _openPdf(closed);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر إنهاء الحالة: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openPdf(IncidentRecord incident) async {
    try {
      final path = await ref
          .read(incidentsControllerProvider.notifier)
          .downloadPdf(incident.id);
      await OpenFilex.open(path);
    } catch (_) {
      final url = incident.pdfUrl;
      if (url != null && url.isNotEmpty) {
        final uri = Uri.tryParse(url);
        if (uri != null) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
    }
  }

  Future<void> _addComment() async {
    final body = _commentCtrl.text.trim();
    if (body.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(incidentsControllerProvider.notifier)
          .addComment(widget.incidentId, body);
      _commentCtrl.clear();
      ref.invalidate(incidentDetailProvider(widget.incidentId));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر إضافة التعليق: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startProgress() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(incidentsControllerProvider.notifier)
          .startIncident(widget.incidentId);
      ref.invalidate(incidentDetailProvider(widget.incidentId));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر البدء: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(incidentDetailProvider(widget.incidentId));
    final user = ref.watch(authControllerProvider).user;
    final canClose = user?.permissions.contains('incidents:close') ?? false;
    final canHandle = user?.permissions.contains('incidents:handle') ?? false;
    final canComment = user?.permissions.contains('incidents:comment') ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل البلاغ')),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري تحميل التفاصيل...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (incident) {
          final created = DateFormat(
            'yyyy/MM/dd HH:mm',
            'ar',
          ).format(incident.occurredAt);
          final closed = incident.closedAt == null
              ? null
              : DateFormat('yyyy/MM/dd HH:mm', 'ar').format(incident.closedAt!);
          final sla = incident.slaDueAt == null
              ? null
              : DateFormat('yyyy/MM/dd HH:mm', 'ar').format(incident.slaDueAt!);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      incident.title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  IncidentStatusChip(
                    status: incident.status,
                    pendingSync: incident.pendingSync,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(incident.typeLabelAr),
              const SizedBox(height: 8),
              Row(
                children: [
                  IncidentPriorityChip(priority: incident.priority),
                  const SizedBox(width: 8),
                  if (incident.isSlaBreached)
                    Text(
                      'تجاوز SLA',
                      style: TextStyle(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              _section(
                context,
                title: 'التفاصيل',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(incident.description),
                    if (incident.notes != null &&
                        incident.notes!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('ملاحظات: ${incident.notes}'),
                    ],
                    const SizedBox(height: 10),
                    _kv('وقت البلاغ', created),
                    if (closed != null) _kv('وقت الإنهاء', closed),
                    if (incident.durationLabelAr != null)
                      _kv('المدة', incident.durationLabelAr!),
                    if (sla != null) _kv('موعد SLA', sla),
                    if (incident.parkingCode != null)
                      _kv('المواقف', incident.parkingCode!.labelAr),
                    if (incident.floorNameAr != null)
                      _kv('الطابق', incident.floorNameAr!),
                    if (incident.meetingRoomNameAr != null)
                      _kv('القاعة', incident.meetingRoomNameAr!),
                    if (incident.shiftNameAr != null)
                      _kv('الوردية', incident.shiftNameAr!),
                    if (incident.gpsLatitude != null &&
                        incident.gpsLongitude != null)
                      _kv(
                        'GPS',
                        '${incident.gpsLatitude!.toStringAsFixed(5)}, ${incident.gpsLongitude!.toStringAsFixed(5)}',
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _section(
                context,
                title: 'المسندون',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _kv('المبلّغ', incident.reporter?.fullName ?? '—'),
                    _kv('المسند إليه', incident.assignee?.fullName ?? '—'),
                    _kv('المشرف', incident.supervisor?.fullName ?? '—'),
                    _kv('مدير العمليات', incident.opsManager?.fullName ?? '—'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _section(
                context,
                title: 'المرفقات',
                child: incident.attachments.isEmpty
                    ? const Text('لا توجد مرفقات')
                    : Column(
                        children: incident.attachments.map((a) {
                          final local = a.localPath;
                          final isImage =
                              a.kind == IncidentAttachmentKind.image;
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading:
                                isImage &&
                                    local != null &&
                                    File(local).existsSync()
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      File(local),
                                      width: 48,
                                      height: 48,
                                      fit: BoxFit.cover,
                                    ),
                                  )
                                : Icon(switch (a.kind) {
                                    IncidentAttachmentKind.image => Icons.image,
                                    IncidentAttachmentKind.video =>
                                      Icons.videocam,
                                    IncidentAttachmentKind.document =>
                                      Icons.description,
                                    IncidentAttachmentKind.other =>
                                      Icons.insert_drive_file,
                                  }),
                            title: Text(a.fileName),
                            subtitle: Text(a.kind.name),
                          );
                        }).toList(),
                      ),
              ),
              const SizedBox(height: 12),
              _section(
                context,
                title: 'الجدول الزمني',
                child: incident.history.isEmpty
                    ? const Text('لا يوجد سجل بعد')
                    : Column(
                        children: incident.history.map((h) {
                          final at = DateFormat(
                            'MM/dd HH:mm',
                            'ar',
                          ).format(h.createdAt);
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.timeline),
                            title: Text(h.actionLabelAr),
                            subtitle: Text(
                              [
                                at,
                                if (h.actor?.fullName != null)
                                  h.actor!.fullName,
                                if (h.fromStatus != null && h.toStatus != null)
                                  '${h.fromStatus!.labelAr} ← ${h.toStatus!.labelAr}',
                                if (h.notes != null) h.notes!,
                              ].join(' · '),
                            ),
                          );
                        }).toList(),
                      ),
              ),
              const SizedBox(height: 12),
              _section(
                context,
                title: 'التعليقات',
                child: Column(
                  children: [
                    if (incident.comments.isEmpty)
                      const Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Text('لا توجد تعليقات'),
                      ),
                    ...incident.comments.map(
                      (c) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(c.body),
                        subtitle: Text(
                          '${c.author?.fullName ?? '—'} · ${DateFormat('MM/dd HH:mm', 'ar').format(c.createdAt)}',
                        ),
                      ),
                    ),
                    if (canComment) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _commentCtrl,
                              decoration: const InputDecoration(
                                hintText: 'أضف تعليقاً...',
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: _busy ? null : _addComment,
                            icon: const Icon(Icons.send),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (incident.status.isOpen) ...[
                if (canHandle &&
                    (incident.status == IncidentStatus.assigned ||
                        incident.status == IncidentStatus.newStatus ||
                        incident.status == IncidentStatus.onHold))
                  OutlinedButton(
                    onPressed: _busy ? null : _startProgress,
                    child: const Text('بدء التنفيذ'),
                  ),
                if (canClose) ...[
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: _busy ? null : () => _endIncident(incident),
                    icon: const Icon(Icons.task_alt),
                    label: const Text('إنهاء الحالة'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                ],
              ] else if (incident.pdfPath != null ||
                  incident.pdfUrl != null) ...[
                FilledButton.icon(
                  onPressed: _busy ? null : () => _openPdf(incident),
                  icon: const Icon(Icons.picture_as_pdf),
                  label: const Text('فتح تقرير PDF'),
                ),
              ],
              if (_busy) ...[
                const SizedBox(height: 16),
                const LinearProgressIndicator(),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _section(
    BuildContext context, {
    required String title,
    required Widget child,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text('$k: $v'),
    );
  }
}
