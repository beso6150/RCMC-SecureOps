import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/violations/providers/violations_controller.dart';
import 'package:rcmc_secureops/models/violation.dart';

class ViolationFormScreen extends ConsumerStatefulWidget {
  const ViolationFormScreen({super.key, required this.draft});

  final CreateViolationDraft draft;

  @override
  ConsumerState<ViolationFormScreen> createState() =>
      _ViolationFormScreenState();
}

class _ViolationFormScreenState extends ConsumerState<ViolationFormScreen> {
  late final TextEditingController _plateController;
  late final TextEditingController _arabicController;
  late final TextEditingController _englishController;
  late final TextEditingController _colorController;
  late final TextEditingController _notesController;
  late ParkingArea _parking;
  late ViolationType _type;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final d = widget.draft;
    _plateController = TextEditingController(text: d.plateNumber);
    _arabicController = TextEditingController(text: d.arabicPlate ?? '');
    _englishController = TextEditingController(text: d.englishPlate ?? '');
    _colorController = TextEditingController(text: d.vehicleColor ?? '');
    _notesController = TextEditingController(text: d.notes ?? '');
    _parking = d.parkingCode;
    _type = d.violationType;
  }

  @override
  void dispose() {
    _plateController.dispose();
    _arabicController.dispose();
    _englishController.dispose();
    _colorController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_plateController.text.trim().isEmpty &&
        _arabicController.text.trim().isEmpty &&
        _englishController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('أدخل رقم اللوحة')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final mutable = CreateViolationDraft(
        imageLocalPath: widget.draft.imageLocalPath,
        capturedAt: widget.draft.capturedAt,
        parkingCode: _parking,
        gpsLatitude: widget.draft.gpsLatitude,
        gpsLongitude: widget.draft.gpsLongitude,
        arabicPlate: _arabicController.text.trim().isEmpty
            ? null
            : _arabicController.text.trim(),
        englishPlate: _englishController.text.trim().isEmpty
            ? null
            : _englishController.text.trim(),
        ocrConfidence: widget.draft.ocrConfidence,
        ocrResult: widget.draft.ocrResult,
        plateNumber: _plateController.text.trim().isEmpty
            ? (_englishController.text.trim().isNotEmpty
                  ? _englishController.text.trim()
                  : _arabicController.text.trim())
            : _plateController.text.trim(),
        vehicleColor: _colorController.text.trim().isEmpty
            ? null
            : _colorController.text.trim(),
        violationType: _type,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
      );

      final saved = await ref
          .read(violationsControllerProvider.notifier)
          .submitDraft(mutable);
      if (!mounted) return;
      final msg = saved.pendingSync
          ? 'تم الحفظ محلياً — بانتظار المزامنة'
          : 'تم تسجيل المخالفة بنجاح';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      context.go('/violations');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر الحفظ: $e')));
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final d = widget.draft;
    final dateText = DateFormat('yyyy/MM/dd', 'ar').format(d.capturedAt);
    final timeText = DateFormat('HH:mm', 'ar').format(d.capturedAt);

    return Scaffold(
      appBar: AppBar(title: const Text('نموذج المخالفة')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.file(
              File(d.imageLocalPath),
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'البيانات التلقائية',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(label: 'التاريخ', value: dateText),
                  _InfoRow(label: 'الوقت', value: timeText),
                  _InfoRow(
                    label: 'الموقع GPS',
                    value: d.gpsLatitude != null && d.gpsLongitude != null
                        ? '${d.gpsLatitude!.toStringAsFixed(5)}, ${d.gpsLongitude!.toStringAsFixed(5)}'
                        : 'غير متوفر',
                  ),
                  _InfoRow(label: 'المستخدم', value: user?.fullName ?? '—'),
                  if (d.ocrConfidence != null)
                    _InfoRow(
                      label: 'ثقة OCR',
                      value: '${(d.ocrConfidence! * 100).toStringAsFixed(0)}%',
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _plateController,
            decoration: const InputDecoration(labelText: 'رقم اللوحة'),
            textCapitalization: TextCapitalization.characters,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _arabicController,
            decoration: const InputDecoration(
              labelText: 'اللوحة بالعربية',
              helperText: 'قابل للتعديل يدوياً',
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _englishController,
            decoration: const InputDecoration(
              labelText: 'اللوحة بالإنجليزية',
              helperText: 'قابل للتعديل يدوياً',
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _colorController,
            decoration: const InputDecoration(labelText: 'لون المركبة'),
          ),
          const SizedBox(height: 12),
          Text('نوع المخالفة', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ViolationType.all
                .map(
                  (t) => ChoiceChip(
                    label: Text(t.labelAr),
                    selected: _type == t,
                    onSelected: (_) => setState(() => _type = t),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          Text('منطقة الموقف', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ParkingArea.all
                .map(
                  (p) => ChoiceChip(
                    label: Text(p.labelAr),
                    selected: _parking == p,
                    onSelected: (_) => setState(() => _parking = p),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notesController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'ملاحظات'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('إرسال'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: Theme.of(context).textTheme.labelLarge),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
