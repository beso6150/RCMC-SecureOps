import { prisma } from '../../../shared/database/prisma.js';

/** Generate next task number: TASK-YYYY-###### */
export async function nextTaskNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `TASK-${year}-`;
  const latest = await prisma.task.findFirst({
    where: { taskNumber: { startsWith: prefix } },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  });
  const last = latest?.taskNumber ? Number(latest.taskNumber.slice(prefix.length)) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return formatTaskNumber(year, next);
}

export function formatTaskNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('تسلسل رقم المهمة غير صالح');
  }
  return `TASK-${year}-${String(sequence).padStart(6, '0')}`;
}
