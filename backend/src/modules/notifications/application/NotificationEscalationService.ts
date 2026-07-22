import {
  NotificationPriority,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { logger } from '../../../shared/logging/logger.js';
import { emitToUser } from '../../../shared/realtime/socketServer.js';
import { notificationService } from './NotificationService.js';

const ADVISORY_LOCK_KEY = 19260722;
const LAST_RUN_SETTING_KEY = 'notifications.escalation.last_run_at';

async function tryAdvisoryLock(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS locked
    `;
    return Boolean(rows[0]?.locked);
  } catch {
    return false;
  }
}

async function releaseAdvisoryLock(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
  } catch {
    // ignore
  }
}

async function readLastRun(): Promise<Date | null> {
  const setting = await prisma.systemSetting.findFirst({
    where: { key: LAST_RUN_SETTING_KEY, deletedAt: null },
  });
  if (!setting) return null;
  const raw = setting.value;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function writeLastRun(now: Date): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: LAST_RUN_SETTING_KEY },
    create: {
      key: LAST_RUN_SETTING_KEY,
      value: now.toISOString() as unknown as Prisma.InputJsonValue,
      description: 'Last notification reminder/escalation worker run',
      isPublic: false,
    },
    update: {
      value: now.toISOString() as unknown as Prisma.InputJsonValue,
      deletedAt: null,
    },
  });
}

class NotificationEscalationService {
  /**
   * Reminder + escalation pass. Uses advisory lock when available;
   * falls back to lastRun spacing to avoid stampedes.
   */
  async runWorkerPass(options: { minIntervalMs?: number } = {}): Promise<{
    reminders: number;
    escalations: number;
    skipped: boolean;
  }> {
    const minIntervalMs = options.minIntervalMs ?? 55_000;
    const now = new Date();

    const locked = await tryAdvisoryLock();
    if (!locked) {
      const last = await readLastRun();
      if (last && now.getTime() - last.getTime() < minIntervalMs) {
        return { reminders: 0, escalations: 0, skipped: true };
      }
    }

    try {
      const last = await readLastRun();
      if (last && now.getTime() - last.getTime() < minIntervalMs) {
        return { reminders: 0, escalations: 0, skipped: true };
      }

      const rules = await prisma.notificationRule.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { reminderAfterMinutes: { not: null } },
            { escalationAfterMinutes: { not: null } },
          ],
        },
      });

      let reminders = 0;
      let escalations = 0;

      for (const rule of rules) {
        const pending = await prisma.notification.findMany({
          where: {
            deletedAt: null,
            category: rule.category,
            requiresAcknowledgement: true,
            status: {
              in: [
                NotificationStatus.UNREAD,
                NotificationStatus.SENT,
                NotificationStatus.DELIVERED,
                NotificationStatus.PENDING,
              ],
            },
            acknowledgedAt: null,
          },
          take: 50,
          orderBy: { createdAt: 'asc' },
        });

        for (const n of pending) {
          const ageMin = (now.getTime() - n.createdAt.getTime()) / 60_000;

          if (
            rule.reminderAfterMinutes != null &&
            ageMin >= rule.reminderAfterMinutes &&
            n.reminderCount < rule.maxReminders
          ) {
            await prisma.notification.update({
              where: { id: n.id },
              data: { reminderCount: { increment: 1 } },
            });
            emitToUser(n.userId, 'notification:reminder', {
              id: n.id,
              title: n.title,
              reminderCount: n.reminderCount + 1,
            });
            reminders += 1;
          }

          if (
            rule.escalationAfterMinutes != null &&
            ageMin >= rule.escalationAfterMinutes &&
            n.escalationLevel < 1
          ) {
            await prisma.notification.update({
              where: { id: n.id },
              data: {
                escalationLevel: { increment: 1 },
                escalatedAt: now,
                priority:
                  n.priority === NotificationPriority.CRITICAL
                    ? NotificationPriority.CRITICAL
                    : NotificationPriority.URGENT,
              },
            });

            // Notify supervisors via a fresh escalated inbox item (deduped)
            const supervisors = await prisma.user.findMany({
              where: {
                deletedAt: null,
                role: {
                  code: {
                    in: ['SECURITY_SUPERVISOR', 'OPERATIONS_MANAGER', 'SECURITY_DIRECTOR'],
                  },
                },
              },
              select: { id: true },
              take: 20,
            });

            for (const s of supervisors) {
              if (s.id === n.userId) continue;
              await notificationService.create({
                userId: s.id,
                senderId: n.senderId,
                title: `تصعيد: ${n.title}`,
                body: n.body,
                priority: NotificationPriority.URGENT,
                category: n.category ?? undefined,
                kind: 'URGENT',
                entityType: n.entityType,
                entityId: n.entityId,
                deduplicationKey: `escalate:${n.id}:${s.id}`,
                requiresAcknowledgement: true,
                metadataJson: { escalatedFrom: n.id, ruleId: rule.id },
              });
            }

            emitToUser(n.userId, 'notification:escalated', { id: n.id });
            escalations += 1;
          }
        }
      }

      await writeLastRun(now);
      return { reminders, escalations, skipped: false };
    } finally {
      if (locked) await releaseAdvisoryLock();
    }
  }
}

export const notificationEscalationService = new NotificationEscalationService();

export async function runNotificationEscalationSafely(): Promise<void> {
  try {
    const result = await notificationEscalationService.runWorkerPass();
    if (!result.skipped && (result.reminders > 0 || result.escalations > 0)) {
      logger.info('Notification escalation pass', result);
    }
  } catch (err) {
    logger.error('Notification escalation failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
