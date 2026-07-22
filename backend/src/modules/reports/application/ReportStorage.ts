import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../../shared/errors/index.js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'reports');

function assertSafeRelative(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new ValidationError('مسار ملف غير صالح');
  }
  return normalized;
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function saveReportFile(input: {
  reportId: string;
  version: number;
  buffer: Buffer;
  extension: '.pdf' | '.csv';
  mimeType: string;
  now?: Date;
}): Promise<{
  storagePath: string;
  fileName: string;
  fileSize: number;
  checksumSha256: string;
  mimeType: string;
}> {
  const now = input.now ?? new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const fileName = `${randomUUID()}${input.extension}`;
  const relativeDir = path.join(year, month, input.reportId, String(input.version));
  const relativePath = path.join(relativeDir, fileName);
  const absoluteDir = path.join(STORAGE_ROOT, relativeDir);
  const absolutePath = path.join(STORAGE_ROOT, relativePath);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, input.buffer);

  return {
    storagePath: relativePath.replace(/\\/g, '/'),
    fileName,
    fileSize: input.buffer.length,
    checksumSha256: sha256Buffer(input.buffer),
    mimeType: input.mimeType,
  };
}

export async function readReportFile(storagePath: string): Promise<Buffer> {
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
