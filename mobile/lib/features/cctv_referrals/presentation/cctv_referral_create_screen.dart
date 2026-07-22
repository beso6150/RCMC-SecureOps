import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/features/cctv_referrals/presentation/cctv_referrals_list_screen.dart';
import 'package:rcmc_secureops/services/cctv_ops_api_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';

class CctvReferralCreateScreen extends ConsumerStatefulWidget {
  const CctvReferralCreateScreen({super.key});

  @override
  ConsumerState<CctvReferralCreateScreen> createState() =>
      _CctvReferralCreateScreenState();
}

class _CctvReferralCreateScreenState
    extends ConsumerState<CctvReferralCreateScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  var _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('أدخل العنوان والتفاصيل')));
      return;
    }
    setState(() => _saving = true);
    try {
      final online = ref.read(connectivityAwareOnlineProvider);
      await ref
          .read(cctvOpsApiServiceProvider)
          .createReferralDraft(
            title: _title.text.trim(),
            body: _body.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            online
                ? 'تم حفظ الإحالة'
                : 'تم حفظ المسودة محلياً — ستُزامن عند الاتصال',
          ),
        ),
      );
      ref.invalidate(referralsListProvider);
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('تعذر الحفظ: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final online = ref.watch(connectivityAwareOnlineProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('إحالة جديدة')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!online)
            const MaterialBanner(
              content: Text('وضع دون اتصال — تُحفظ كمسودة فقط'),
              actions: [SizedBox.shrink()],
            ),
          TextField(
            controller: _title,
            decoration: const InputDecoration(labelText: 'العنوان'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'التفاصيل'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'جاري الحفظ...' : 'حفظ'),
          ),
        ],
      ),
    );
  }
}
