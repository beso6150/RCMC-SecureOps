import { describe, expect, it } from 'vitest';
import { TaskStatus } from '@prisma/client';
import { formatTaskNumber } from '../application/taskNumbering.js';
import {
  assertEvidenceRequired,
  assertRejectionReason,
  assertTaskTransition,
  canTransitionTask,
} from '../application/taskTransitions.js';

describe('task numbering', () => {
  it('formats TASK-YYYY-######', () => {
    expect(formatTaskNumber(2026, 1)).toBe('TASK-2026-000001');
    expect(formatTaskNumber(2026, 123456)).toBe('TASK-2026-123456');
    expect(() => formatTaskNumber(2026, 0)).toThrow(/تسلسل/);
  });
});

describe('task transitions', () => {
  it('allows ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED', () => {
    expect(canTransitionTask(TaskStatus.ASSIGNED, TaskStatus.ACCEPTED)).toBe(true);
    expect(canTransitionTask(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS)).toBe(true);
    expect(canTransitionTask(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)).toBe(true);
  });

  it('blocks COMPLETED -> IN_PROGRESS', () => {
    expect(() =>
      assertTaskTransition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS),
    ).toThrow(/لا يمكن الانتقال/);
  });

  it('allows WAITING from IN_PROGRESS and back', () => {
    expect(canTransitionTask(TaskStatus.IN_PROGRESS, TaskStatus.WAITING)).toBe(true);
    expect(canTransitionTask(TaskStatus.WAITING, TaskStatus.IN_PROGRESS)).toBe(true);
  });

  it('allows REJECTED from ASSIGNED', () => {
    expect(canTransitionTask(TaskStatus.ASSIGNED, TaskStatus.REJECTED)).toBe(true);
  });
});

describe('task evidence requirement', () => {
  it('requires evidence when flagged', () => {
    expect(() => assertEvidenceRequired(true, 0)).toThrow(/دليل/);
    expect(() => assertEvidenceRequired(true, 1)).not.toThrow();
    expect(() => assertEvidenceRequired(false, 0)).not.toThrow();
  });
});

describe('task rejection reason', () => {
  it('requires Arabic rejection reason', () => {
    expect(() => assertRejectionReason('')).toThrow(/سبب الرفض/);
    expect(assertRejectionReason('غير مناسب')).toBe('غير مناسب');
  });
});
