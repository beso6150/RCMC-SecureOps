import {
  IncidentSeverity,
  IncidentStatus,
  NotificationPriority,
  PatrolSessionStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { notificationService } from '../../notifications/application/NotificationService.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  DEFAULT_INCIDENT_ESCALATION_SETTINGS,
  INCIDENT_ESCALATION_SETTING_KEYS,
} from '../domain/constants.js';

export interface IncidentEscalationSettings {
  escalateUnackedMinutes: number;
  escalateHighUnackedMinutes: number;
  escalateNoResponseMinutes: number;
  criticalNotifyDirector: boolean;
  criticalImmediateEscalate: boolean;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export async function loadIncidentEscalationSettings(): Promise<IncidentEscalationSettings> {
  const keys = Object.values(INCIDENT_ESCALATION_SETTING_KEYS);
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...keys] }, deletedAt: null },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return {
    escalateUnackedMinutes: asPositiveNumber(
      byKey.get(INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_UNACKED_MINUTES),
      DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateUnackedMinutes,
    ),
    escalateHighUnackedMinutes: asPositiveNumber(
      byKey.get(INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_HIGH_UNACKED_MINUTES),
      DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateHighUnackedMinutes,
    ),
    escalateNoResponseMinutes: asPositiveNumber(
      byKey.get(INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_NO_RESPONSE_MINUTES),
      DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateNoResponseMinutes,
    ),
    criticalNotifyDirector: asBoolean(
      byKey.get(INCIDENT_ESCALATION_SETTING_KEYS.CRITICAL_NOTIFY_DIRECTOR),
      DEFAULT_INCIDENT_ESCALATION_SETTINGS.criticalNotifyDirector,
    ),
    criticalImmediateEscalate: asBoolean(
      byKey.get(INCIDENT_ESCALATION_SETTING_KEYS.CRITICAL_IMMEDIATE_ESCALATE),
      DEFAULT_INCIDENT_ESCALATION_SETTINGS.criticalImmediateEscalate,
    ),
  };
}

export function shouldEscalateUnacknowledged(params: {
  severity: IncidentSeverity;
  reportedAt: Date | null;
  acknowledgedAt: Date | null;
  status: IncidentStatus;
  now?: Date;
  settings: IncidentEscalationSettings;
}): { escalate: boolean; reason: string; notifyDirector: boolean; notifyOps: boolean } {
  if (params.acknowledgedAt) {
    return { escalate: false, reason: '', notifyDirector: false, notifyOps: false };
  }
  if (
    ![
      IncidentStatus.NEW,
      IncidentStatus.REPORTED,
      IncidentStatus.ASSIGNED,
      IncidentStatus.ESCALATED,
    ].includes(params.status as 'NEW' | 'REPORTED' | 'ASSIGNED' | 'ESCALATED')
  ) {
    return { escalate: false, reason: '', notifyDirector: false, notifyOps: false };
  }

  const now = params.now ?? new Date();
  const base = params.reportedAt ?? now;
  const ageMin = (now.getTime() - base.getTime()) / 60_000;

  if (params.severity === IncidentSeverity.CRITICAL) {
    return {
      escalate: params.settings.criticalImmediateEscalate || ageMin >= 0,
      reason: 'بلاغ حرج — تصعيد فوري لغرفة العمليات',
      notifyDirector: params.settings.criticalNotifyDirector,
      notifyOps: true,
    };
  }

  if (
    params.severity === IncidentSeverity.HIGH &&
    ageMin >= params.settings.escalateHighUnackedMinutes
  ) {
    return {
      escalate: true,
      reason: `لم يُعتمد بلاغ عالي الخطورة خلال ${params.settings.escalateHighUnackedMinutes} دقائق`,
      notifyDirector: false,
      notifyOps: true,
    };
  }

  if (ageMin >= params.settings.escalateUnackedMinutes) {
    return {
      escalate: true,
      reason: `لم يُعتمد البلاغ خلال ${params.settings.escalateUnackedMinutes} دقائق`,
      notifyDirector: false,
      notifyOps: false,
    };
  }

  return { escalate: false, reason: '', notifyDirector: false, notifyOps: false };
}

const ACTIVE_STATUSES: IncidentStatus[] = [
  IncidentStatus.NEW,
  IncidentStatus.REPORTED,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.ASSESSING,
  IncidentStatus.ASSIGNED,
  IncidentStatus.RESPONDING,
  IncidentStatus.ON_SCENE,
  IncidentStatus.CONTAINED,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.ON_HOLD,
  IncidentStatus.ESCALATED,
  IncidentStatus.REOPENED,
  IncidentStatus.RESOLVED,
];

class OperationsRoomService {
  async dashboard() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [
      openCount,
      criticalOpen,
      highOpen,
      unassigned,
      escalated,
      createdToday,
      closedToday,
      byStatus,
      bySeverity,
      recent,
    ] = await Promise.all([
      prisma.incident.count({
        where: { deletedAt: null, status: { in: ACTIVE_STATUSES } },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          severity: IncidentSeverity.CRITICAL,
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          severity: IncidentSeverity.HIGH,
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          assigneeId: null,
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.incident.count({
        where: { deletedAt: null, status: IncidentStatus.ESCALATED },
      }),
      prisma.incident.count({
        where: { deletedAt: null, createdAt: { gte: dayStart } },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          status: IncidentStatus.CLOSED,
          closedAt: { gte: dayStart },
        },
      }),
      prisma.incident.groupBy({
        by: ['status'],
        where: { deletedAt: null, status: { in: ACTIVE_STATUSES } },
        _count: { _all: true },
      }),
      prisma.incident.groupBy({
        by: ['severity'],
        where: { deletedAt: null, status: { in: ACTIVE_STATUSES } },
        _count: { _all: true },
      }),
      prisma.incident.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          incidentNumber: true,
          title: true,
          status: true,
          severity: true,
          source: true,
          assigneeId: true,
          reportedAt: true,
          createdAt: true,
          assignee: { select: { id: true, fullName: true, employeeNumber: true } },
        },
      }),
    ]);

    return {
      summary: {
        openCount,
        criticalOpen,
        highOpen,
        unassigned,
        escalated,
        createdToday,
        closedToday,
      },
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: r._count._all })),
      recent: recent.map((r) => ({
        ...r,
        assignedUserId: r.assigneeId,
      })),
    };
  }

  async live(limit = 50) {
    const rows = await prisma.incident.findMany({
      where: {
        deletedAt: null,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit, 200),
      include: {
        type: { select: { id: true, code: true, nameAr: true, nameEn: true } },
        assignee: { select: { id: true, fullName: true, employeeNumber: true } },
        reporter: { select: { id: true, fullName: true, employeeNumber: true } },
        zone: { select: { id: true, name: true, code: true } },
      },
    });

    return rows.map((r) => ({
      ...r,
      assignedUserId: r.assigneeId,
    }));
  }

  async statistics(from?: Date, to?: Date) {
    const where = {
      deletedAt: null as null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [total, closed, cancelled, falseAlarm, byType, bySource, avgResponse] =
      await Promise.all([
        prisma.incident.count({ where }),
        prisma.incident.count({ where: { ...where, status: IncidentStatus.CLOSED } }),
        prisma.incident.count({ where: { ...where, status: IncidentStatus.CANCELLED } }),
        prisma.incident.count({ where: { ...where, status: IncidentStatus.FALSE_ALARM } }),
        prisma.incident.groupBy({
          by: ['typeId'],
          where,
          _count: { _all: true },
        }),
        prisma.incident.groupBy({
          by: ['source'],
          where,
          _count: { _all: true },
        }),
        prisma.responseTime.aggregate({
          where: {
            incidentId: { not: null },
            durationMs: { not: null },
            ...(from || to
              ? {
                  endedAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
          },
          _avg: { durationMs: true },
        }),
      ]);

    const typeIds = byType.map((t) => t.typeId);
    const types = typeIds.length
      ? await prisma.incidentType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, code: true, nameAr: true, nameEn: true },
        })
      : [];
    const typeMap = new Map(types.map((t) => [t.id, t]));

    return {
      total,
      closed,
      cancelled,
      falseAlarm,
      open: total - closed - cancelled - falseAlarm,
      avgResponseMs: avgResponse._avg.durationMs ?? null,
      byType: byType.map((t) => ({
        typeId: t.typeId,
        count: t._count._all,
        type: typeMap.get(t.typeId) ?? null,
      })),
      bySource: bySource.map((s) => ({
        source: s.source,
        count: s._count._all,
      })),
    };
  }

  async evaluateEscalations(limit = 50) {
    const settings = await loadIncidentEscalationSettings();
    const candidates = await prisma.incident.findMany({
      where: {
        deletedAt: null,
        acknowledgedAt: null,
        status: {
          in: [
            IncidentStatus.NEW,
            IncidentStatus.REPORTED,
            IncidentStatus.ASSIGNED,
            IncidentStatus.ESCALATED,
          ],
        },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const results: Array<{ incidentId: string; escalated: boolean; reason: string }> = [];

    for (const incident of candidates) {
      const decision = shouldEscalateUnacknowledged({
        severity: incident.severity,
        reportedAt: incident.reportedAt,
        acknowledgedAt: incident.acknowledgedAt,
        status: incident.status,
        settings,
      });

      if (!decision.escalate) {
        results.push({ incidentId: incident.id, escalated: false, reason: '' });
        continue;
      }

      if (incident.status !== IncidentStatus.ESCALATED) {
        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.ESCALATED,
            escalatedAt: new Date(),
            escalationReason: decision.reason,
            escalationLevel: { increment: 1 },
          },
        });
      }

      if (decision.notifyOps || decision.notifyDirector) {
        await this.notifyEscalationTargets(incident.id, incident.incidentNumber, decision);
      }

      broadcast('operations-room:critical-alert', {
        incidentId: incident.id,
        severity: incident.severity,
        reason: decision.reason,
      });
      broadcast('operations-room:refresh', { reason: 'incident:escalated', incidentId: incident.id });
      broadcast('incident:escalated', { incidentId: incident.id });

      results.push({ incidentId: incident.id, escalated: true, reason: decision.reason });
    }

    return results;
  }

  private async notifyEscalationTargets(
    incidentId: string,
    incidentNumber: string | null,
    decision: { reason: string; notifyDirector: boolean; notifyOps: boolean },
  ) {
    const roleCodes: string[] = [RoleCodes.SECURITY_SUPERVISOR];
    if (decision.notifyOps) roleCodes.push(RoleCodes.OPERATIONS_MANAGER);
    if (decision.notifyDirector) roleCodes.push(RoleCodes.SECURITY_DIRECTOR);

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { code: { in: roleCodes }, deletedAt: null },
      },
      select: { id: true },
      take: 40,
    });

    const label = incidentNumber ?? incidentId.slice(0, 8);
    for (const u of users) {
      await notificationService.create({
        userId: u.id,
        title: `تصعيد بلاغ ${label}`,
        body: decision.reason,
        priority: NotificationPriority.HIGH,
        entityType: 'Incident',
        entityId: incidentId,
      });
    }
  }

  async nearbyPatrols(incidentId: string, limit = 10) {
    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, deletedAt: null },
      select: { zoneId: true, mapX: true, mapY: true },
    });
    if (!incident) return [];

    const sessions = await prisma.patrolSession.findMany({
      where: {
        status: { in: [PatrolSessionStatus.IN_PROGRESS, PatrolSessionStatus.SCHEDULED] },
        ...(incident.zoneId
          ? {
              OR: [
                { route: { checkpoints: { some: { checkpoint: { zoneId: incident.zoneId } } } } },
                { groupId: { not: null } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        assignedUser: { select: { id: true, fullName: true, employeeNumber: true } },
        route: { select: { id: true, name: true } },
        group: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      },
    });

    return sessions;
  }
}

export const operationsRoomService = new OperationsRoomService();
