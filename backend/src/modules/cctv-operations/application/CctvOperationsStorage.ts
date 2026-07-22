import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../../shared/errors/index.js';
import { isForbiddenExtension } from './referralStatusMachine.js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'cctv-operations');

const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const PDF_MIMES = new Set(['application/pdf']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

const LIMITS = {
  image: 15 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
} as const;

export type CctvStorageKind = 'permits' | 'referrals';

function assertSafeRelative(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new ValidationError('مسار ملف غير صالح');
  }
  return normalized;
}

function maxBytesForMime(mimeType: string): number {
  if (IMAGE_MIMES.has(mimeType)) return LIMITS.image;
  if (PDF_MIMES.has(mimeType)) return LIMITS.pdf;
  if (VIDEO_MIMES.has(mimeType)) return LIMITS.video;
  throw new ValidationError('نوع الملف غير مسموح');
}

function extensionFor(mimeType: string, originalFileName: string): string {
  const fromName = path.extname(originalFileName);
  if (fromName && !isForbiddenExtension(originalFileName)) return fromName.toLowerCase();
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType.startsWith('video/')) return '.mp4';
  return '.jpg';
}

export async function saveCctvOperationFile(input: {
  kind: CctvStorageKind;
  entityId: string;
  originalFileName: string;
  mimeType: string;
  contentBase64: string;
}): Promise<{
  storagePath: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}> {
  if (isForbiddenExtension(input.originalFileName)) {
    throw new ValidationError('نوع الملف التنفيذي غير مسموح');
  }

  const mimeType = input.mimeType.toLowerCase();
  const maxBytes = maxBytesForMime(mimeType);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.contentBase64, 'base64');
  } catch {
    throw new ValidationError('محتوى الملف غير صالح');
  }

  if (!buffer.length) throw new ValidationError('الملف فارغ');
  if (buffer.length > maxBytes) {
    throw new ValidationError(`حجم الملف يتجاوز الحد المسموح (${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = extensionFor(mimeType, input.originalFileName);
  const fileName = `${randomUUID()}${ext}`;
  const relativeDir = path.join(input.kind, year, month, input.entityId);
  const relativePath = path.join(relativeDir, fileName);
  const absoluteDir = path.join(STORAGE_ROOT, relativeDir);
  const absolutePath = path.join(STORAGE_ROOT, relativePath);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    storagePath: relativePath.replace(/\\/g, '/'),
    fileName,
    originalFileName: path.basename(input.originalFileName).slice(0, 180) || fileName,
    mimeType,
    fileSize: buffer.length,
  };
}

export async function readCctvOperationFile(storagePath: string): Promise<Buffer> {
  const safe = assertSafeRelative(storagePath);
  const absolute = path.join(STORAGE_ROOT, safe);
  const resolved = path.resolve(absolute);
  const rootResolved = path.resolve(STORAGE_ROOT);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new ValidationError('مسار ملف غير صالح');
  }
  try {
    return await fs.readFile(resolved);
  } catch {
    throw new ValidationError('الملف غير موجود');
  }
}
