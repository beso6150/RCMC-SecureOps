import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/services/shifts_api_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class HandoverScreen extends ConsumerStatefulWidget {
  const HandoverScreen({super.key});

  @override
  ConsumerState<HandoverScreen> createState() => _HandoverScreenState();
}

class _HandoverScreenState extends ConsumerState<HandoverScreen> {
  final _body = TextEditingController();
  HandoverNote? _note;
  var _loading = true;
  var _busy = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final note = await ref.read(shiftsApiServiceProvider).currentHandover();
      if (mounted) {
        setState(() {
          _note = note;
          if (note != null) _body.text = note.body;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _saveDraft() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(shiftsApiServiceProvider)
          .saveDraft(body: _body.text.trim(), handoverId: _note?.id);
      if (!mounted) return;
      final online = ref.read(connectivityAwareOnlineProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            online
                ? 'تم حفظ مسودة تسليم الوردية'
                : 'حُفظت المسودة محلياً — التسليم النهائي يتطلب اتصالاً',
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    final id = _note?.id;
    if (id == null || id.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('احفظ المسودة أولاً')));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(shiftsApiServiceProvider).submitHandover(id);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم إرسال تسليم الوردية')));
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _approve() async {
    final id = _note?.id;
    if (id == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(shiftsApiServiceProvider).approveHandover(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم اعتماد تسليم الوردية')),
        );
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final online = ref.watch(connectivityAwareOnlineProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('تسليم الوردية')),
      body: _loading
          ? const AppLoadingView()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (!online)
                  const Card(
                    child: ListTile(
                      leading: Icon(Icons.cloud_off),
                      title: Text('دون اتصال'),
                      subtitle: Text(
                        'يمكن حفظ المسودة فقط. التسليم النهائي والاعتماد يتطلبان اتصالاً.',
                      ),
                    ),
                  ),
                if (_error != null)
                  Text(
                    'تعذر التحميل: $_error',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                TextField(
                  controller: _body,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'ملاحظات تسليم الوردية',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: _busy ? null : _saveDraft,
                  child: const Text('حفظ مسودة'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: (_busy || !online) ? null : _submit,
                  child: const Text('إرسال التسليم (يتطلب اتصال)'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: (_busy || !online) ? null : _approve,
                  child: const Text('اعتماد التسليم (مشرف)'),
                ),
              ],
            ),
    );
  }
}
