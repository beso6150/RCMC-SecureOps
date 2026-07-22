import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/features/permits/presentation/permits_list_screen.dart';
import 'package:rcmc_secureops/services/cctv_ops_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class PermitDetailsScreen extends ConsumerStatefulWidget {
  const PermitDetailsScreen({super.key, required this.permitId});

  final String permitId;

  @override
  ConsumerState<PermitDetailsScreen> createState() =>
      _PermitDetailsScreenState();
}

class _PermitDetailsScreenState extends ConsumerState<PermitDetailsScreen> {
  AccessPermit? _permit;
  Object? _error;
  var _loading = true;
  var _acking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final item = await ref
          .read(cctvOpsApiServiceProvider)
          .getPermit(widget.permitId);
      if (mounted) {
        setState(() {
          _permit = item;
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

  Future<void> _acknowledge() async {
    setState(() => _acking = true);
    try {
      await ref
          .read(cctvOpsApiServiceProvider)
          .acknowledgePermit(widget.permitId);
      ref.invalidate(permitsListProvider);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم الإقرار بالتصريح')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('تعذر الإقرار: $e')));
      }
    } finally {
      if (mounted) setState(() => _acking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل التصريح')),
      body: _loading
          ? const AppLoadingView()
          : _error != null
          ? Center(child: Text('$_error'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  _permit!.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Chip(label: Text(_permit!.status)),
                if (_permit!.holderName != null) ...[
                  const SizedBox(height: 8),
                  Text('صاحب التصريح: ${_permit!.holderName}'),
                ],
                const SizedBox(height: 8),
                Text(
                  'الوقت: ${DateFormat('yyyy/MM/dd HH:mm', 'ar').format(_permit!.createdAt)}',
                ),
                const SizedBox(height: 24),
                if (!_permit!.acknowledged)
                  FilledButton(
                    onPressed: _acking ? null : _acknowledge,
                    child: Text(_acking ? 'جاري الإقرار...' : 'إقرار بالتصريح'),
                  ),
              ],
            ),
    );
  }
}
