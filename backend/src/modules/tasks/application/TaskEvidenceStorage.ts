import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../../shared/errors/index.js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'tasks');

const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const PDF_MIMES = new Set(['application/pdf']);

const LIMITS = {
  image: 15 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
} as const;

const FORBIDDEN_EXT = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.ps1',
  '.sh',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.htm',
  '.svg',
  '.php',
  '.jar',
]);

function isForbiddenExtension(fileName: string): boolean {
  return FORBIDDEN_EXT.has(path.extname(fileName).toLowerCase());
}

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
  throw new ValidationError('نوع الملف غير مسموح');
}

function extensionFor(mimeType: string, originalFileName: string): string {
  const fromName = path.extname(originalFileName);
  if (fromName && !isForbiddenExtension(originalFileName)) return fromName.toLowerCase();
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'application/pdf') return '.pdf';
  return '.jpg';
}

export async function saveTaskEvidenceFile(input: {
  taskId: string;
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
    throw new ValidationError(
      `حجم الملف يتجاوز الحد المسموح (${Math.round(maxBytes / 1024 / 1024)}MB)`,
    );
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = extensionFor(mimeType, input.originalFileName);
  const fileName = `${randomUUID()}${ext}`;
  const relativeDir = path.join(year, month, input.taskId);
  const relativePath = path.join(relativeDir, fileName);
  const absoluteDir = path.join(STORAGE_ROOT, relativeDir);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(path.join(STORAGE_ROOT, relativePath), buffer);

  return {
    storagePath: relativePath.replace(/\\/g, '/'),
    fileName,
    originalFileName: input.originalFileName,
    mimeType,
    fileSize: buffer.length,
  };
}

export function resolveTaskEvidenceAbsolute(storagePath: string): string {
  const safe = assertSafeRelative(storagePath);
  const absolute = path.join(STORAGE_ROOT, safe);
  if (!absolute.startsWith(STORAGE_ROOT)) {
    throw new ValidationError('مسار ملف غير صالح');
  }
  return absolute;
}
