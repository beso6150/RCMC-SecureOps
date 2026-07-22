import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/features/sos/sos_service.dart';
import 'package:rcmc_secureops/features/violations/providers/violations_controller.dart';
import 'package:rcmc_secureops/theme/app_theme.dart';

/// Long-press or double-confirm SOS control.
class SosButton extends ConsumerStatefulWidget {
  const SosButton({super.key, this.compact = false});

  final bool compact;

  @override
  ConsumerState<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends ConsumerState<SosButton> {
  var _busy = false;

  Future<void> _confirmAndSend() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تأكيد نداء الاستغاثة'),
        content: const Text(
          'هل أنت متأكد من إرسال نداء الاستغاثة؟ يتطلب اتصالاً بالخادم.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('إرسال'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _send();
  }

  Future<void> _send() async {
    setState(() => _busy = true);
    try {
      double? lat;
      double? lng;
      try {
        final loc = await ref.read(locationServiceProvider).currentLocation();
        lat = loc?.latitude;
        lng = loc?.longitude;
      } catch (_) {}

      final result = await ref
          .read(sosServiceProvider)
          .sendSos(latitude: lat, longitude: lng);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.messageAr),
          backgroundColor: result.sent ? AppColors.success : AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = _busy
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          )
        : Icon(
            Icons.sos_rounded,
            color: Colors.white,
            size: widget.compact ? 22 : 28,
          );

    return Tooltip(
      message: 'اضغط مطولاً أو انقر مرتين لإرسال الاستغاثة',
      child: GestureDetector(
        onLongPress: _busy ? null : _confirmAndSend,
        onDoubleTap: _busy ? null : _confirmAndSend,
        child: Material(
          color: AppColors.danger,
          borderRadius: BorderRadius.circular(widget.compact ? 14 : 18),
          elevation: 2,
          child: InkWell(
            borderRadius: BorderRadius.circular(widget.compact ? 14 : 18),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('للتأكيد: اضغط مطولاً أو انقر مرتين'),
                ),
              );
            },
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: widget.compact ? 14 : 20,
                vertical: widget.compact ? 10 : 14,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  child,
                  if (!widget.compact) ...[
                    const SizedBox(width: 10),
                    const Text(
                      'استغاثة',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
