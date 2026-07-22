import { createHash } from 'node:crypto';
import { MobileSyncStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ConflictError, ValidationError } from '../errors/index.js';

export interface IdempotencyRecordSummary {
  id: string;
  status: MobileSyncStatus;
  responseSummaryJson: string | null;
  failureReason: string | null;
  serverEntityId: string | null;
}

/** Never persist tokens/secrets — keep only small result ids / status codes. */
export function sanitizeResponseSummary(input: unknown): string {
  if (input == null) return JSON.stringify({ ok: true });
  if (typeof input === 'string') {
    try {
      return sanitizeResponseSummary(JSON.parse(input));
    } catch {
      return JSON.stringify({ message: input.slice(0, 200) });
    }
  }
  if (typeof input !== 'object') {
    return JSON.stringify({ value: input });
  }

  const obj = input as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  const allow = [
    'id',
    'status',
    'success',
    'operationType',
    'entityType',
    'localEntityId',
    'serverEntityId',
    'replayed',
    'code',
  ];
  for (const key of allow) {
    if (key in obj && obj[key] != null) {
      const v = obj[key];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        safe[key] = v;
      }
    }
  }
  if (obj.data && typeof obj.data === 'object' && obj.data !== null && 'id' in (obj.data as object)) {
    safe.resultId = (obj.data as { id: unknown }).id;
  }
  return JSON.stringify(safe);
}

export function hashRequestPayload(payload: unknown): string {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

export function parseCachedResponse(summaryJson: string | null): unknown | null {
  if (!summaryJson) return null;
  try {
    return JSON.parse(summaryJson);
  } catch {
    return { success: true, data: { replayed: true } };
  }
}

export class IdempotencyService {
  async findByKey(userId: string, idempotencyKey: string) {
    return prisma.mobileSyncOperation.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey },
      },
    });
  }

  /**
   * Returns a cached COMPLETED response body, or throws ConflictError if PROCESSING.
   * Returns null when the key is free / retryable.
   */
  async beginOrReplay(params: {
    userId: string;
    idempotencyKey: string;
    operationType: string;
    entityType: string;
    localEntityId?: string | null;
    deviceId?: string | null;
    requestHash?: string | null;
    clientCreatedAt?: Date | null;
  }): Promise<{ replay: true; body: unknown; record: IdempotencyRecordSummary } | { replay: false; recordId: string }> {
    const existing = await this.findByKey(params.userId, params.idempotencyKey);

    if (existing) {
      if (existing.status === MobileSyncStatus.COMPLETED && existing.responseSummaryJson) {
        return {
          replay: true,
          body: parseCachedResponse(existing.responseSummaryJson),
          record: existing,
        };
      }
      if (existing.status === MobileSyncStatus.PROCESSING || existing.status === MobileSyncStatus.RECEIVED) {
        throw new ConflictError('عملية المزامنة قيد المعالجة — يُرجى الانتظار ثم إعادة المحاولة');
      }
      // REJECTED / CONFLICT / FAILED — allow re-processing by resetting to PROCESSING
      const updated = await prisma.mobileSyncOperation.update({
        where: { id: existing.id },
        data: {
          status: MobileSyncStatus.PROCESSING,
          failureReason: null,
          requestHash: params.requestHash ?? existing.requestHash,
          deviceId: params.deviceId ?? existing.deviceId,
        },
      });
      return { replay: false, recordId: updated.id };
    }

    const created = await prisma.mobileSyncOperation.create({
      data: {
        userId: params.userId,
        deviceId: params.deviceId ?? null,
        idempotencyKey: params.idempotencyKey,
        operationType: params.operationType,
        entityType: params.entityType,
        localEntityId: params.localEntityId ?? null,
        status: MobileSyncStatus.RECEIVED,
        requestHash: params.requestHash ?? null,
        clientCreatedAt: params.clientCreatedAt ?? null,
      },
    });

    const processing = await prisma.mobileSyncOperation.update({
      where: { id: created.id },
      data: { status: MobileSyncStatus.PROCESSING },
    });

    return { replay: false, recordId: processing.id };
  }

  async complete(
    recordId: string,
    summary: unknown,
    extras: { serverEntityId?: string | null } = {},
  ) {
    return prisma.mobileSyncOperation.update({
      where: { id: recordId },
      data: {
        status: MobileSyncStatus.COMPLETED,
        responseSummaryJson: sanitizeResponseSummary(summary),
        serverEntityId: extras.serverEntityId ?? undefined,
        processedAt: new Date(),
        failureReason: null,
      },
    });
  }

  async fail(
    recordId: string,
    status: Extract<MobileSyncStatus, 'REJECTED' | 'CONFLICT' | 'FAILED'>,
    reason: string,
  ) {
    return prisma.mobileSyncOperation.update({
      where: { id: recordId },
      data: {
        status,
        failureReason: reason.slice(0, 500),
        processedAt: new Date(),
        responseSummaryJson: sanitizeResponseSummary({
          success: false,
          status,
          message: reason.slice(0, 200),
        }),
      },
    });
  }
}

export const idempotencyService = new IdempotencyService();

export function requireIdempotencyKey(headerValue: string | undefined, required: boolean): string | null {
  const key = headerValue?.trim() || null;
  if (!key && required) {
    throw new ValidationError('رأس Idempotency-Key مطلوب لهذا الطلب');
  }
  if (key && key.length > 128) {
    throw new ValidationError('قيمة Idempotency-Key طويلة جداً');
  }
  return key;
}

export type { Prisma };
