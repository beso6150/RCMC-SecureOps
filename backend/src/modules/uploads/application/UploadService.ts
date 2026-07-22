import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../../shared/errors/index.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
]);

const MAX_BYTES = 12 * 1024 * 1024;

const FOLDER_RE = /^[a-z0-9_-]{1,40}$/i;

function safeFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-ء-ي\s]/gu, '_').trim();
  return base.slice(0, 180) || 'file.bin';
}

function extensionFor(mimeType: string, fileName: string): string {
  const fromName = path.extname(fileName);
  if (fromName) return fromName;
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'application/pdf':
      return '.pdf';
    case 'audio/mpeg':
      return '.mp3';
    case 'audio/wav':
      return '.wav';
    case 'video/mp4':
      return '.mp4';
    default:
      return '';
  }
}

export interface UploadInput {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  folder?: string;
}

export interface UploadResult {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

class UploadService {
  private root = path.join(process.cwd(), 'uploads');

  async saveBase64(input: UploadInput): Promise<UploadResult> {
    const mimeType = input.mimeType.trim().toLowerCase();
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new ValidationError(`Unsupported mime type: ${mimeType}`);
    }

    const folder = (input.folder ?? 'attachments').trim() || 'attachments';
    if (!FOLDER_RE.test(folder)) {
      throw new ValidationError('Invalid upload folder');
    }

    const raw = input.contentBase64.includes(',')
      ? input.contentBase64.split(',').pop()!
      : input.contentBase64;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(raw, 'base64');
    } catch {
      throw new ValidationError('Invalid base64 content');
    }

    if (!buffer.length) {
      throw new ValidationError('Empty file content');
    }
    if (buffer.length > MAX_BYTES) {
      throw new ValidationError(`File exceeds ${MAX_BYTES} bytes`);
    }

    const originalName = safeFileName(input.fileName);
    const ext = extensionFor(mimeType, originalName);
    const storedName = `${randomUUID()}${ext || path.extname(originalName)}`;
    const dir = path.join(this.root, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, storedName), buffer);

    const storageKey = `${folder}/${storedName}`;
    return {
      storageKey,
      url: `/uploads/${storageKey}`,
      fileName: originalName,
      mimeType,
      fileSize: buffer.length,
    };
  }
}

export const uploadService = new UploadService();
