import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:rcmc_secureops/features/violations/providers/violations_controller.dart';
import 'package:rcmc_secureops/models/violation.dart';

/// Opens camera immediately — no intermediate picker screen.
class ViolationCaptureScreen extends ConsumerStatefulWidget {
  const ViolationCaptureScreen({super.key});

  @override
  ConsumerState<ViolationCaptureScreen> createState() =>
      _ViolationCaptureScreenState();
}

class _ViolationCaptureScreenState
    extends ConsumerState<ViolationCaptureScreen> {
  CameraController? _controller;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initCamera());
  }

  Future<void> _initCamera() async {
    final cam = await Permission.camera.request();
    if (!cam.isGranted) {
      setState(() => _error = 'يلزم السماح بالكاميرا لتسجيل المخالفة');
      return;
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _error = 'لا توجد كاميرا متاحة على الجهاز');
        return;
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (e) {
      setState(() => _error = 'تعذر تشغيل الكاميرا: $e');
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _busy) return;
    setState(() => _busy = true);
    try {
      final shot = await controller.takePicture();
      final docs = await getApplicationDocumentsDirectory();
      final dir = Directory(p.join(docs.path, 'violations'));
      if (!await dir.exists()) await dir.create(recursive: true);
      final target = p.join(
        dir.path,
        'cap_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await File(shot.path).copy(target);

      final location = await ref
          .read(locationServiceProvider)
          .currentLocation();
      final ocr = await ref.read(ocrServiceProvider).recognizePlate(target);

      if (!mounted) return;
      final draft = CreateViolationDraft(
        imageLocalPath: target,
        capturedAt: DateTime.now(),
        parkingCode: ParkingArea.ground,
        gpsLatitude: location?.latitude,
        gpsLongitude: location?.longitude,
        arabicPlate: ocr.arabicPlate,
        englishPlate: ocr.englishPlate,
        ocrConfidence: ocr.confidence,
        ocrResult: ocr.rawText,
        plateNumber: ocr.englishPlate ?? ocr.arabicPlate ?? '',
      );

      context.pushReplacement('/violations/create', extra: draft);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('فشل التقاط الصورة: $e')));
      setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('تسجيل مخالفة')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => openAppSettings(),
                  child: const Text('فتح الإعدادات'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraPreview(controller),
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: IconButton(
                onPressed: () => context.pop(),
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 36),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'وجّه الكاميرا نحو لوحة المركبة',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: _busy ? null : _capture,
                    child: Container(
                      width: 78,
                      height: 78,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        border: Border.all(color: Colors.white70, width: 4),
                      ),
                      child: _busy
                          ? const Padding(
                              padding: EdgeInsets.all(22),
                              child: CircularProgressIndicator(strokeWidth: 3),
                            )
                          : const Icon(Icons.camera, size: 36),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
