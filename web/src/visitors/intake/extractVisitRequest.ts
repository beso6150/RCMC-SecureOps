import type {
  VisitIntakeExtractedFields,
  VisitIntakeExtractionResult,
  VisitIntakeFieldKey,
  VisitIntakeSourceKind,
} from '../../types/visitIntake';

const REQUIRED_FOR_COMPLETE: VisitIntakeFieldKey[] = [
  'visitorName',
  'visitDate',
  'arrivalTime',
  'hostOrRoom',
];

/**
 * Flexible extraction layer for visit requests.
 * Supports free-form Arabic/English email text today; designed so OCR text
 * from WhatsApp screenshots, phone photos, and PDFs can feed the same parser.
 */
export function extractVisitRequestFromText(
  rawText: string,
  sourceKind: VisitIntakeSourceKind = 'email_text',
  ocrUsed = false,
): VisitIntakeExtractionResult {
  const text = normalizeText(rawText);
  const fields: VisitIntakeExtractedFields = {
    visitorName: matchFirst(text, [
      /(?:اسم\s*الزائر|الزائر|visitor\s*name|name)\s*[:：\-–]?\s*([^\n\r,|]+)/i,
      /السيد(?:ة)?\s+([^\n\r,]+)/i,
    ]),
    dayLabel: matchFirst(text, [
      /(?:اليوم|day)\s*[:：\-–]?\s*(الأ?[^\n\r,]+|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i,
      /\b(الأحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)\b/,
    ]),
    visitDate: normalizeDate(
      matchFirst(text, [
        /(?:التاريخ|date)\s*[:：\-–]?\s*([0-9]{1,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,4})/i,
        /\b([0-9]{4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,2})\b/,
        /\b([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})\b/,
      ]),
    ),
    arrivalTime: normalizeTime(
      matchFirst(text, [
        /(?:وقت\s*الوصول|موعد\s*الوصول|الوصول|arrival\s*time|time)\s*[:：\-–]?\s*([0-9]{1,2}[:.٫][0-9]{2}(?:\s*[صمapmAPM]{0,2})?)/i,
        /\b([0-9]{1,2}:[0-9]{2})\b/,
      ]),
    ),
    hostOrRoom: matchFirst(text, [
      /(?:القاعة|غرفة\s*الاجتماع|الشخص\s*المعني|المضيف|host|meeting\s*room|room)\s*[:：\-–]?\s*([^\n\r]+)/i,
      /(?:مع|لقاء)\s+([^\n\r,]{3,80})/i,
    ]),
    visitorParkingCount: parseParkingCount(
      matchFirst(text, [
        /(?:عدد\s*مواقف\s*الزوار|مواقف\s*الزوار|parking\s*spots?|visitor\s*parking)\s*[:：\-–]?\s*([0-9]+)/i,
        /([0-9]+)\s*(?:موقف|مواقف)/,
      ]),
    ),
    mobile: normalizePhone(
      matchFirst(text, [
        /(?:الجوال|الهاتف|رقم\s*الجوال|mobile|phone|whatsapp)\s*[:：\-–]?\s*([+0-9][0-9\s\-()]{7,20})/i,
        /(\+?966[0-9\s\-]{8,14}|05[0-9]{8})/,
      ]),
    ),
    notes: matchFirst(text, [
      /(?:الملاحظات|ملاحظات|notes?|remarks?)\s*[:：\-–]?\s*([^\n\r]+)/i,
    ]),
  };

  const missingFields = REQUIRED_FOR_COMPLETE.filter((key) => {
    const value = fields[key];
    return value == null || String(value).trim() === '';
  });

  const filledOptional = (['dayLabel', 'visitorParkingCount', 'mobile', 'notes'] as const).filter(
    (k) => fields[k] != null && String(fields[k]).trim() !== '',
  ).length;

  const confidence =
    ((REQUIRED_FOR_COMPLETE.length - missingFields.length) / REQUIRED_FOR_COMPLETE.length) * 0.75 +
    (filledOptional / 4) * 0.25;

  return {
    fields,
    missingFields,
    isComplete: missingFields.length === 0,
    confidence: Math.round(confidence * 100) / 100,
    sourceKind,
    rawText: text,
    ocrUsed,
  };
}

function normalizeText(input: string): string {
  return input.replace(/\u200f|\u200e/g, '').replace(/\r/g, '\n').trim();
}

function matchFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/\s+/g, ' ');
    if (match?.[0] && !match[1]) return match[0].trim();
  }
  return null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[.\-]/g, '/').trim();
  const parts = cleaned.split('/').map((p) => p.trim());
  if (parts.length !== 3) return null;

  let y: number;
  let m: number;
  let d: number;
  if (parts[0]!.length === 4) {
    y = Number(parts[0]);
    m = Number(parts[1]);
    d = Number(parts[2]);
  } else {
    d = Number(parts[0]);
    m = Number(parts[1]);
    y = Number(parts[2]);
    if (y < 100) y += 2000;
  }
  if (!y || !m || !d) return null;
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : iso;
}

function normalizeTime(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/([0-9]{1,2})[:.٫]([0-9]{2})/);
  if (!match) return null;
  const hh = String(Math.min(23, Number(match[1]))).padStart(2, '0');
  const mm = String(Math.min(59, Number(match[2]))).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[^\d+]/g, '');
}

function parseParkingCount(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function combineArrivalDateTime(visitDate: string | null, arrivalTime: string | null): string | null {
  if (!visitDate) return null;
  if (!arrivalTime) return `${visitDate}T00:00:00.000Z`;
  return `${visitDate}T${arrivalTime}:00.000Z`;
}
