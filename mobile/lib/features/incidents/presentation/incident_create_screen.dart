import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/incidents/providers/incidents_controller.dart';
import 'package:rcmc_secureops/features/incidents/widgets/incident_widgets.dart';
import 'package:rcmc_secureops/models/incident.dart';
import 'package:rcmc_secureops/models/violation.dart';
import 'package:uuid/uuid.dart';

class IncidentCreateScreen extends ConsumerStatefulWidget {
  const IncidentCreateScreen({
    super.key,
    this.presetTypeCode,
    this.titleOverride,
  });

  /// When set (e.g. CASE_PROOF), locks type selection.
  final String? presetTypeCode;
  final String? titleOverride;

  @override
  ConsumerState<IncidentCreateScreen> createState() =>
      _IncidentCreateScreenState();
}

class _IncidentCreateScreenState extends ConsumerState<IncidentCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _picker = ImagePicker();

  IncidentTypeOption? _selectedType;
  IncidentPriority _priority = IncidentPriority.medium;
  ParkingArea? _parking;
  FacilityFloor? _floor;
  FacilityMeetingRoom? _room;
  double? _lat;
  double? _lng;
  final List<IncidentAttachment> _attachments = [];
  bool _submitting = false;
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _captureLocation();
      if (widget.presetTypeCode == 'CASE_PROOF') {
        _titleCtrl.text = 'إثبات حالة';
      }
    });
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _captureLocation() async {
    setState(() => _locating = true);
    try {
      final loc = await ref
          .read(incidentLocationServiceProvider)
          .currentLocation();
      if (!mounted) return;
      setState(() {
        _lat = loc?.latitude;
        _lng = loc?.longitude;
      });
    } catch (_) {
      // GPS optional when denied.
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _pickPhotos() async {
    final files = await _picker.pickMultiImage(imageQuality: 85);
    for (final file in files) {
      _attachments.add(
        IncidentAttachment(
          id: const Uuid().v4(),
          fileName: file.name,
          storageKey: 'local/${file.name}',
          mimeType: 'image/jpeg',
          localPath: file.path,
          kind: IncidentAttachmentKind.image,
          fileSize: await File(file.path).length(),
        ),
      );
    }
    setState(() {});
  }

  Future<void> _pickVideo() async {
    final file = await _picker.pickVideo(source: ImageSource.gallery);
    if (file == null) return;
    _attachments.add(
      IncidentAttachment(
        id: const Uuid().v4(),
        fileName: file.name,
        storageKey: 'local/${file.name}',
        mimeType: 'video/mp4',
        localPath: file.path,
        kind: IncidentAttachmentKind.video,
        fileSize: await File(file.path).length(),
      ),
    );
    setState(() {});
  }

  Future<void> _pickCameraPhoto() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (file == null) return;
    _attachments.add(
      IncidentAttachment(
        id: const Uuid().v4(),
        fileName: file.name,
        storageKey: 'local/${file.name}',
        mimeType: 'image/jpeg',
        localPath: file.path,
        kind: IncidentAttachmentKind.image,
        fileSize: await File(file.path).length(),
      ),
    );
    setState(() {});
  }

  Future<void> _pickFiles() async {
    final result = await FilePicker.platform.pickFiles(allowMultiple: true);
    if (result == null) return;
    for (final f in result.files) {
      if (f.path == null) continue;
      _attachments.add(
        IncidentAttachment(
          id: const Uuid().v4(),
          fileName: f.name,
          storageKey: 'local/${f.name}',
          mimeType: 'application/octet-stream',
          localPath: f.path,
          kind: IncidentAttachmentKind.document,
          fileSize: f.size,
        ),
      );
    }
    setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('اختر نوع البلاغ')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final user = ref.read(authControllerProvider).user;
      final draft = CreateIncidentDraft(
        typeId: _selectedType!.id,
        typeCode: _selectedType!.code,
        typeNameAr: _selectedType!.nameAr,
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        priority: _priority,
        parkingCode: _parking,
        floorId: _floor?.id,
        floorNameAr: _floor?.nameAr,
        meetingRoomId: _room?.id,
        meetingRoomNameAr: _room?.nameAr,
        shiftId: user?.shiftId,
        shiftNameAr: user?.shiftNameAr,
        gpsLatitude: _lat,
        gpsLongitude: _lng,
        occurredAt: DateTime.now(),
        attachments: List.of(_attachments),
        reporterName: user?.fullName,
      );

      final saved = await ref
          .read(incidentsControllerProvider.notifier)
          .submitDraft(draft);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            saved.pendingSync
                ? 'تم الحفظ محلياً — ستتم المزامنة عند الاتصال'
                : 'تم إنشاء البلاغ بنجاح',
          ),
        ),
      );
      context.go('/incidents/${saved.id}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر الحفظ: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final typesAsync = ref.watch(incidentTypesProvider);
    final floorsAsync = ref.watch(facilityFloorsProvider);
    final roomsAsync = ref.watch(facilityRoomsProvider(_floor?.id));
    final now = DateTime.now();
    final dateLabel = DateFormat('yyyy/MM/dd', 'ar').format(now);
    final timeLabel = DateFormat('HH:mm', 'ar').format(now);
    final gpsLabel = _lat == null || _lng == null
        ? (_locating ? 'جاري تحديد الموقع...' : 'غير متوفر')
        : '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}';

    typesAsync.whenData((types) {
      if (_selectedType == null && types.isNotEmpty) {
        final preset = widget.presetTypeCode;
        final match = preset == null
            ? null
            : types.where((t) => t.code == preset).toList();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || _selectedType != null) return;
          setState(() {
            _selectedType = (match != null && match.isNotEmpty)
                ? match.first
                : types.first;
          });
        });
      }
    });

    final lockType = widget.presetTypeCode != null;

    return Scaffold(
      appBar: AppBar(title: Text(widget.titleOverride ?? 'إنشاء بلاغ')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            AutoFillBanner(
              userName: user?.fullName ?? '—',
              dateLabel: dateLabel,
              timeLabel: timeLabel,
              shiftLabel: user?.shiftNameAr ?? 'غير محددة',
              gpsLabel: gpsLabel,
            ),
            const SizedBox(height: 16),
            typesAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('تعذر تحميل الأنواع: $e'),
              data: (types) {
                if (types.isEmpty) {
                  return const Text('لا توجد أنواع بلاغات من الخادم');
                }
                return DropdownButtonFormField<IncidentTypeOption>(
                  key: ValueKey(_selectedType?.id ?? 'type'),
                  initialValue: _selectedType,
                  decoration: const InputDecoration(labelText: 'نوع البلاغ'),
                  items: types
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          enabled: !lockType || t.code == widget.presetTypeCode,
                          child: Text(t.nameAr),
                        ),
                      )
                      .toList(),
                  onChanged: lockType
                      ? null
                      : (v) => setState(() => _selectedType = v),
                );
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(labelText: 'العنوان'),
              validator: (v) =>
                  (v == null || v.trim().length < 2) ? 'أدخل عنواناً' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(labelText: 'الوصف'),
              validator: (v) =>
                  (v == null || v.trim().length < 2) ? 'أدخل وصفاً' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<IncidentPriority>(
              key: ValueKey(_priority),
              initialValue: _priority,
              decoration: const InputDecoration(labelText: 'الأولوية'),
              items: IncidentPriority.all
                  .map(
                    (p) => DropdownMenuItem(value: p, child: Text(p.labelAr)),
                  )
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _priority = v);
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<ParkingArea?>(
              key: ValueKey(_parking?.apiValue ?? 'parking-none'),
              initialValue: _parking,
              decoration: const InputDecoration(
                labelText: 'منطقة المواقف (اختياري)',
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('بدون')),
                ...ParkingArea.all.map(
                  (p) => DropdownMenuItem(value: p, child: Text(p.labelAr)),
                ),
              ],
              onChanged: (v) => setState(() => _parking = v),
            ),
            const SizedBox(height: 12),
            floorsAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (floors) => DropdownButtonFormField<FacilityFloor?>(
                key: ValueKey(_floor?.id ?? 'floor-none'),
                initialValue: _floor,
                decoration: const InputDecoration(labelText: 'الطابق'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('بدون')),
                  ...floors.map(
                    (f) => DropdownMenuItem(value: f, child: Text(f.nameAr)),
                  ),
                ],
                onChanged: (v) => setState(() {
                  _floor = v;
                  _room = null;
                }),
              ),
            ),
            const SizedBox(height: 12),
            roomsAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (rooms) {
                final filtered = _floor == null
                    ? rooms
                    : rooms.where((r) => r.floorId == _floor!.id).toList();
                return DropdownButtonFormField<FacilityMeetingRoom?>(
                  key: ValueKey(_room?.id ?? 'room-none-${_floor?.id}'),
                  initialValue: _room,
                  decoration: const InputDecoration(labelText: 'قاعة الاجتماع'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('بدون')),
                    ...filtered.map(
                      (r) => DropdownMenuItem(value: r, child: Text(r.nameAr)),
                    ),
                  ],
                  onChanged: (v) => setState(() => _room = v),
                );
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesCtrl,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'ملاحظات'),
            ),
            const SizedBox(height: 16),
            Text(
              'المرفقات',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _pickCameraPhoto,
                  icon: const Icon(Icons.photo_camera),
                  label: const Text('كاميرا'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickPhotos,
                  icon: const Icon(Icons.photo_library),
                  label: const Text('صور'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickVideo,
                  icon: const Icon(Icons.videocam),
                  label: const Text('فيديو'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickFiles,
                  icon: const Icon(Icons.attach_file),
                  label: const Text('ملفات'),
                ),
              ],
            ),
            if (_attachments.isNotEmpty) ...[
              const SizedBox(height: 10),
              ..._attachments.map(
                (a) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(switch (a.kind) {
                    IncidentAttachmentKind.image => Icons.image,
                    IncidentAttachmentKind.video => Icons.videocam,
                    IncidentAttachmentKind.document => Icons.description,
                    IncidentAttachmentKind.other => Icons.insert_drive_file,
                  }),
                  title: Text(a.fileName),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _attachments.remove(a)),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('حفظ البلاغ'),
            ),
          ],
        ),
      ),
    );
  }
}
