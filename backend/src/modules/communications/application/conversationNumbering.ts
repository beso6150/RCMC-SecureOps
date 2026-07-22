import { prisma } from '../../../shared/database/prisma.js';

/** Generate next conversation number: CONV-YYYY-###### */
export async function nextConversationNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `CONV-${year}-`;
  const latest = await prisma.internalConversation.findFirst({
    where: { conversationNumber: { startsWith: prefix } },
    orderBy: { conversationNumber: 'desc' },
    select: { conversationNumber: true },
  });
  const last = latest?.conversationNumber
    ? Number(latest.conversationNumber.slice(prefix.length))
    : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return formatConversationNumber(year, next);
}

export function formatConversationNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('تسلسل رقم المحادثة غير صالح');
  }
  return `CONV-${year}-${String(sequence).padStart(6, '0')}`;
}
