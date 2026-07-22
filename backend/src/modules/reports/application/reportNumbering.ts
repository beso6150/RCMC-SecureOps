import { prisma } from '../../../shared/database/prisma.js';

/** Format: RPT-YYYY-###### */
export function formatReportNumber(year: number, seq: number): string {
  return `RPT-${year}-${String(seq).padStart(6, '0')}`;
}

export async function nextReportNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `RPT-${year}-`;
  const latest = await prisma.savedReport.findFirst({
    where: { reportNumber: { startsWith: prefix } },
    orderBy: { reportNumber: 'desc' },
    select: { reportNumber: true },
  });
  const last = latest ? Number(latest.reportNumber.slice(prefix.length)) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return formatReportNumber(year, next);
}
