import { prisma } from '../../../shared/database/prisma.js';

export async function nextReferralNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `REF-${year}-`;
  const latest = await prisma.securityReferral.findFirst({
    where: { referralNumber: { startsWith: prefix } },
    orderBy: { referralNumber: 'desc' },
    select: { referralNumber: true },
  });
  const last = latest ? Number(latest.referralNumber.slice(prefix.length)) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}
