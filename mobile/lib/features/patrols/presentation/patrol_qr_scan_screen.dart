import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:rcmc_secureops/features/patrols/presentation/patrols_list_screen.dart';
import 'package:rcmc_secureops/services/field_ops_api_service.dart';

class PatrolQrScanScreen extends ConsumerStatefulWidget {
  const PatrolQrScanScreen({super.key});

  @override
  ConsumerState<PatrolQrScanScreen> createState() => _PatrolQrScanScreenState();
}

class _PatrolQrScanScreenState extends ConsumerState<PatrolQrScanScreen> {
  var _handling = false;
  final _controller = MobileScannerController();

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty) return;

    setState(() => _handling = true);
    await _controller.stop();

    try {
      final active = await ref.read(activePatrolProvider.future);
      final patrolId = active?.id;
      if (patrolId == null || patrolId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('لا توجد جولة نشطة لزيارة النقطة')),
          );
        }
        return;
      }

      await ref
          .read(fieldOpsApiServiceProvider)
          .visitCheckpoint(patrolId: patrolId, checkpointCode: raw);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تم تسجيل زيارة النقطة: $raw')));
      ref.invalidate(activePatrolProvider);
      ref.invalidate(patrolsListProvider);
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('تعذر تسجيل الزيارة: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _handling = false);
        await _controller.start();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('مسح نقطة التفتيش')),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          if (_handling)
            const ColoredBox(
              color: Color(0x66000000),
              child: Center(child: CircularProgressIndicator()),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'وجّه الكاميرا نحو رمز QR لنقطة التفتيش',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  shadows: const [Shadow(blurRadius: 8, color: Colors.black)],
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
