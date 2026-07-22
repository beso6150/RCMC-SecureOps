import 'package:rcmc_secureops/models/violation.dart';

/// Plate OCR abstraction. Default implementation prepares the capture
/// pipeline for manual plate entry when on-device ML is not configured.
abstract class OcrService {
  Future<OcrResult> recognizePlate(String imagePath);
}

/// Production default: validates the image path and returns empty OCR fields
/// so the operator completes plate numbers manually in the form.
class ManualPlateOcrService implements OcrService {
  @override
  Future<OcrResult> recognizePlate(String imagePath) async {
    if (imagePath.trim().isEmpty) {
      throw ArgumentError('imagePath is required for plate recognition');
    }
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return const OcrResult(
      arabicPlate: null,
      englishPlate: null,
      confidence: null,
      rawText: null,
    );
  }
}
