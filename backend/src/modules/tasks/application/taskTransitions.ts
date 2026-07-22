import { TaskStatus } from '@prisma/client';
import { ValidationError } from '../../../shared/errors/index.js';

const ALLOWED: Record<TaskStatus, ReadonlySet<TaskStatus>> = {
  [TaskStatus.NEW]: new Set([TaskStatus.ASSIGNED, TaskStatus.PENDING, TaskStatus.CANCELLED]),
  [TaskStatus.PENDING]: new Set([
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ]),
  [TaskStatus.ASSIGNED]: new Set([
    TaskStatus.ACCEPTED,
    TaskStatus.REJECTED,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ]),
  [TaskStatus.ACCEPTED]: new Set([
    TaskStatus.IN_PROGRESS,
    TaskStatus.WAITING,
    TaskStatus.REJECTED,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ]),
  [TaskStatus.IN_PROGRESS]: new Set([
    TaskStatus.WAITING,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ]),
  [TaskStatus.WAITING]: new Set([
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.OVERDUE,
  ]),
  [TaskStatus.OVERDUE]: new Set([
    TaskStatus.IN_PROGRESS,
    TaskStatus.WAITING,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ]),
  [TaskStatus.COMPLETED]: new Set(),
  [TaskStatus.REJECTED]: new Set(),
  [TaskStatus.CANCELLED]: new Set(),
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.has(to) ?? false;
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new ValidationError(`لا يمكن الانتقال من حالة المهمة ${from} إلى ${to}`);
  }
}

export function assertEvidenceRequired(
  requiresEvidence: boolean,
  evidenceCount: number,
): void {
  if (requiresEvidence && evidenceCount < 1) {
    throw new ValidationError('يجب إرفاق دليل قبل إكمال هذه المهمة');
  }
}

export function assertRejectionReason(reason: string | null | undefined): string {
  const trimmed = (reason ?? '').trim();
  if (!trimmed) {
    throw new ValidationError('سبب الرفض مطلوب');
  }
  return trimmed;
}
