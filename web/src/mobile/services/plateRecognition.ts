import { apiClient } from '../../api/client';

export interface PlateRecognitionResult {
  plateNumber: string | null;
  vehicleType: string | null;
  confidence: number | null;
  source: 'api' | 'heuristic' | 'none';
  message?: string;
}

const SAUDI_PLATE_RE =
  /(?:^|[^A-Z0-9])([0-9]{1,4})\s*([A-Z]{1,3})(?:[^A-Z0-9]|$)|(?:^|[^A-Z0-9ا-ي])([٠-٩0-9]{1,4})\s*([أ-يA-Z]{1,3})(?:[^أ-يA-Z0-9]|$)/i;

/**
 * Attempts automatic plate / vehicle-type extraction after capture.
 * Uses backend OCR when available; otherwise applies a light filename heuristic.
 */
export async function attemptPlateRecognition(file: File): Promise<PlateRecognitionResult> {
  try {
    const contentBase64 = await fileToBase64(file);
    const { data } = await apiClient.post<{
      success: boolean;
      data: {
        plateNumber?: string | null;
        vehicleType?: string | null;
        confidence?: number | null;
      };
    }>('/violations/ocr', {
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      contentBase64,
    });

    return {
      plateNumber: data.data.plateNumber?.trim().toUpperCase() || null,
      vehicleType: data.data.vehicleType ?? null,
      confidence: data.data.confidence ?? null,
      source: 'api',
    };
  } catch {
    /* fall through to heuristic */
  }

  const fromName = extractPlateFromText(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
  if (fromName) {
    return {
      plateNumber: fromName,
      vehicleType: null,
      confidence: 0.35,
      source: 'heuristic',
      message: 'تم اقتراح رقم لوحة من اسم الملف — راجع وعدّل إن لزم.',
    };
  }

  return {
    plateNumber: null,
    vehicleType: null,
    confidence: null,
    source: 'none',
    message: 'لم يتم التعرف تلقائياً على اللوحة. أدخل البيانات يدوياً.',
  };
}

function extractPlateFromText(text: string): string | null {
  const match = text.toUpperCase().match(SAUDI_PLATE_RE);
  if (!match) return null;
  const digits = match[1] || match[3];
  const letters = match[2] || match[4];
  if (!digits || !letters) return null;
  return `${digits} ${letters}`.trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1]! : result);
    };
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}
