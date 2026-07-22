import { describe, expect, it } from 'vitest';
import { MobileSyncStatus } from '@prisma/client';
import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/errors/index.js';
import {
  parseCachedResponse,
  sanitizeResponseSummary,
} from '../../../shared/middleware/idempotency.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import {
  assertBatchPermission,
  buildIdempotencyReplay,
  canBootstrap,
  deviceUniquenessKey,
  mapErrorToSyncStatus,
  parseOfflineAllowlist,
} from '../application/mobileHelpers.js';
import { DEFAULT_OFFLINE_OPS_ALLOWLIST } from '../application/mobileSettings.js';

describe('deviceUniquenessKey', () => {
  it('builds stable user+device composite key', () => {
    expect(deviceUniquenessKey('u1', 'device-abc')).toBe('u1::device-abc');
  });

  it('trims device uuid whitespace', () => {
    expect(deviceUniquenessKey('u1', '  device-abc  ')).toBe('u1::device-abc');
  });
});

describe('parseOfflineAllowlist', () => {
  it('parses JSON array values', () => {
    expect(parseOfflineAllowlist(['TASK_ACCEPT', 'SOS_CREATE'])).toEqual([
      'TASK_ACCEPT',
      'SOS_CREATE',
    ]);
  });

  it('parses JSON string arrays', () => {
    expect(parseOfflineAllowlist(JSON.stringify(['CHECKPOINT_VISIT']))).toEqual([
      'CHECKPOINT_VISIT',
    ]);
  });

  it('parses comma-separated strings', () => {
    expect(parseOfflineAllowlist('TASK_ACCEPT, TASK_START')).toEqual([
      'TASK_ACCEPT',
      'TASK_START',
    ]);
  });

  it('returns empty for invalid input', () => {
    expect(parseOfflineAllowlist(null)).toEqual([]);
    expect(parseOfflineAllowlist(42)).toEqual([]);
  });

  it('includes default allowlist ops', () => {
    expect(DEFAULT_OFFLINE_OPS_ALLOWLIST).toContain('SOS_CREATE');
    expect(DEFAULT_OFFLINE_OPS_ALLOWLIST).toContain('CHECKPOINT_VISIT');
  });
});

describe('idempotency replay helper', () => {
  it('replays COMPLETED records with summary', () => {
    const replay = buildIdempotencyReplay({
      status: MobileSyncStatus.COMPLETED,
      responseSummaryJson: JSON.stringify({ success: true, serverEntityId: 'srv-1' }),
      serverEntityId: 'srv-1',
      failureReason: null,
      idempotencyKey: 'key-1',
      operationType: 'TASK_ACCEPT',
    });
    expect(replay).not.toBeNull();
    expect(replay?.replayed).toBe(true);
    expect(replay?.serverEntityId).toBe('srv-1');
    expect(replay?.summary).toEqual({ success: true, serverEntityId: 'srv-1' });
  });

  it('does not replay non-COMPLETED statuses', () => {
    expect(
      buildIdempotencyReplay({
        status: MobileSyncStatus.PROCESSING,
        responseSummaryJson: null,
        idempotencyKey: 'k',
        operationType: 'TASK_START',
      }),
    ).toBeNull();
  });

  it('sanitizes summaries without secrets', () => {
    const raw = sanitizeResponseSummary({
      id: 'abc',
      token: 'secret-token-value',
      password: 'x',
      status: 'COMPLETED',
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.id).toBe('abc');
    expect(parsed.status).toBe('COMPLETED');
    expect(parsed.token).toBeUndefined();
    expect(parsed.password).toBeUndefined();
  });

  it('parses cached response JSON', () => {
    expect(parseCachedResponse('{"ok":true}')).toEqual({ ok: true });
  });
});

describe('batch RBAC rejection helper', () => {
  it('rejects without offline_operations', () => {
    const r = assertBatchPermission([PermissionCodes.MOBILE_TASKS_UPDATE], 'TASK_ACCEPT');
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/دون اتصال/);
  });

  it('rejects when op-specific permission missing', () => {
    const r = assertBatchPermission(
      [PermissionCodes.MOBILE_OFFLINE_OPERATIONS],
      'SOS_CREATE',
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/صلاحية مرفوضة/);
  });

  it('allows when offline + op permission present', () => {
    const r = assertBatchPermission(
      [PermissionCodes.MOBILE_OFFLINE_OPERATIONS, PermissionCodes.MOBILE_SOS_CREATE],
      'SOS_CREATE',
    );
    expect(r.allowed).toBe(true);
  });
});

describe('conflict status mapping', () => {
  it('maps ForbiddenError to REJECTED', () => {
    const mapped = mapErrorToSyncStatus(new ForbiddenError('ممنوع'));
    expect(mapped.status).toBe(MobileSyncStatus.REJECTED);
  });

  it('maps ConflictError to CONFLICT', () => {
    const mapped = mapErrorToSyncStatus(new ConflictError('تعارض'));
    expect(mapped.status).toBe(MobileSyncStatus.CONFLICT);
  });

  it('maps invalid transition ValidationError to CONFLICT', () => {
    const mapped = mapErrorToSyncStatus(new ValidationError('انتقال حالة غير مسموح'));
    expect(mapped.status).toBe(MobileSyncStatus.CONFLICT);
    expect(mapped.reason).toMatch(/انتقال/);
  });

  it('maps وردية conflict wording to CONFLICT', () => {
    const mapped = mapErrorToSyncStatus(new ValidationError('لا يمكن أثناء الوردية الحالية'));
    expect(mapped.status).toBe(MobileSyncStatus.CONFLICT);
  });
});

describe('bootstrap permission gate', () => {
  it('allows MOBILE_BOOTSTRAP', () => {
    expect(canBootstrap([PermissionCodes.MOBILE_BOOTSTRAP])).toBe(true);
  });

  it('allows MOBILE_APP_ACCESS', () => {
    expect(canBootstrap([PermissionCodes.MOBILE_APP_ACCESS])).toBe(true);
  });

  it('denies unrelated permissions', () => {
    expect(canBootstrap([PermissionCodes.TASKS_READ])).toBe(false);
  });
});
