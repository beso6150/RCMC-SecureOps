import { apiClient } from '../../api/client';
import type { VisitIntakeSourceKind } from '../../types/visitIntake';

export interface VisitAttachmentOcrResult {
  text: string;
  sourceKind: VisitIntakeSourceKind;
  ocrUsed: boolean;
  message?: string;
}

/**
 * Frontend-ready OCR adapter for visit attachments (image / PDF).
 * Calls backend when available; otherwise returns empty text so text-parser still runs.
 */
export async function extractTextFromVisitAttachment(input: {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}): Promise<VisitAttachmentOcrResult> {
  const sourceKind = detectSourceKind(input.fileName, input.mimeType);
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { text?: string };
    }>('/visitors/ocr', input);
    const text = data.data.text?.trim() ?? '';
    return {
      text,
      sourceKind,
      ocrUsed: Boolean(text),
      message: text ? undefined : 'تعذّر استخراج نص من المرفق.',
    };
  } catch {
    return {
      text: '',
      sourceKind,
      ocrUsed: false,
      message:
        'خدمة OCR للزيارات غير مفعّلة بعد. سيتم الاعتماد على نص الرسالة إن وُجد.',
    };
  }
}

function detectSourceKind(fileName: string, mimeType: string): VisitIntakeSourceKind {
  const lower = `${fileName} ${mimeType}`.toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('whatsapp') || lower.includes('screenshot')) return 'whatsapp_screenshot';
  if (lower.includes('image') || /\.(jpe?g|png|webp|heic)$/i.test(fileName)) return 'mobile_image';
  return 'email_text';
}
