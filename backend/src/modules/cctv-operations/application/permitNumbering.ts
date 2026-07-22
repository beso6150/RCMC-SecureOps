import { prisma } from '../../../shared/database/prisma.js';

export async function nextPermitNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `PERMIT-${year}-`;
  const latest = await prisma.securityPermit.findFirst({
    where: { permitNumber: { startsWith: prefix } },
    orderBy: { permitNumber: 'desc' },
    select: { permitNumber: true },
  });
  const last = latest ? Number(latest.permitNumber.slice(prefix.length)) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}
