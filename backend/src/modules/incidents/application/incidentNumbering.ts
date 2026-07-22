import { prisma } from '../../../shared/database/prisma.js';

/** Generate next incident number: INC-YYYY-###### */
export async function nextIncidentNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `INC-${year}-`;
  const latest = await prisma.incident.findFirst({
    where: { incidentNumber: { startsWith: prefix } },
    orderBy: { incidentNumber: 'desc' },
    select: { incidentNumber: true },
  });
  const last = latest?.incidentNumber
    ? Number(latest.incidentNumber.slice(prefix.length))
    : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

/** Pure helper for unit tests — format INC-YYYY-###### from year + sequence. */
export function formatIncidentNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('تسلسل رقم البلاغ غير صالح');
  }
  return `INC-${year}-${String(sequence).padStart(6, '0')}`;
}
