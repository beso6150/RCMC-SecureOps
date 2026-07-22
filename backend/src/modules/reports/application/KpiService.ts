import { IncidentStatus, PatrolSessionStatus, VisitStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';

export interface KpiRange {
  from: Date;
  to: Date;
  groupId?: string;
  userId?: string;
  zoneId?: string;
}

export interface AvgMetric {
  averageMs: number | null;
  averageMinutes: number | null;
  sampleCount: number;
}

/** Exclude incomplete pairs (missing end) from averages; return sampleCount. */
export function averageDurationMs(
  pairs: Array<{ start: Date | null | undefined; end: Date | null | undefined }>,
): AvgMetric {
  const complete = pairs.filter(
    (p): p is { start: Date; end: Date } =>
      p.start instanceof Date &&
      p.end instanceof Date &&
      !Number.isNaN(p.start.getTime()) &&
      !Number.isNaN(p.end.getTime()) &&
      p.end.getTime() >= p.start.getTime(),
  );
  if (complete.length === 0) {
    return { averageMs: null, averageMinutes: null, sampleCount: 0 };
  }
  const total = complete.reduce((sum, p) => sum + (p.end.getTime() - p.start.getTime()), 0);
  const averageMs = Math.round(total / complete.length);
  return {
    averageMs,
    averageMinutes: Math.round((averageMs / 60_000) * 100) / 100,
    sampleCount: complete.length,
  };
}

class KpiService {
  async getAll(range: KpiRange) {
    const [
      incidents,
      responseTimes,
      patrols,
      cctvReferrals,
      permits,
      violations,
      visitors,
      personnel,
    ] = await Promise.all([
      this.incidents(range),
      this.responseTimes(range),
      this.patrols(range),
      this.cctvReferrals(range),
      this.permits(range),
      this.violations(range),
      this.visitors(range),
      this.personnelGroupsShifts(range),
    ]);

    const data = {
      range: { from: range.from, to: range.to },
      incidents,
      responseTimes,
      patrols,
      cctvReferrals,
      permits,
      violations,
      visitors,
      ...personnel,
    };

    broadcast('kpi:updated', { from: range.from, to: range.to });
    return data;
  }

  async incidents(range: KpiRange) {
    const where = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(range.groupId ? { assignedGroupId: range.groupId } : {}),
      ...(range.zoneId ? { zoneId: range.zoneId } : {}),
      ...(range.userId
        ? {
            OR: [
              { reporterId: range.userId },
              { assigneeId: range.userId },
            ],
          }
        : {}),
    };

    const [total, open, closed, bySeverity, rows] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.count({
        where: {
          ...where,
          status: {
            notIn: [
              IncidentStatus.CLOSED,
              IncidentStatus.CANCELLED,
              IncidentStatus.FALSE_ALARM,
            ],
          },
        },
      }),
      prisma.incident.count({
        where: { ...where, status: IncidentStatus.CLOSED },
      }),
      prisma.incident.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
      }),
      prisma.incident.findMany({
        where,
        select: {
          occurredAt: true,
          acknowledgedAt: true,
          responseStartedAt: true,
          arrivedAt: true,
          resolvedAt: true,
          closedAt: true,
        },
      }),
    ]);

    const ack = averageDurationMs(
      rows.map((r) => ({ start: r.occurredAt, end: r.acknowledgedAt })),
    );
    const response = averageDurationMs(
      rows.map((r) => ({ start: r.occurredAt, end: r.responseStartedAt })),
    );
    const arrive = averageDurationMs(
      rows.map((r) => ({ start: r.responseStartedAt, end: r.arrivedAt })),
    );
    const resolve = averageDurationMs(
      rows.map((r) => ({ start: r.occurredAt, end: r.resolvedAt ?? r.closedAt })),
    );

    return {
      total,
      open,
      closed,
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: r._count._all })),
      avgAckMinutes: ack,
      avgResponseStartMinutes: response,
      avgArriveMinutes: arrive,
      avgResolveMinutes: resolve,
    };
  }

  async responseTimes(range: KpiRange) {
    const rows = await prisma.responseTime.findMany({
      where: {
        startedAt: { gte: range.from, lte: range.to },
        ...(range.userId ? { actorId: range.userId } : {}),
      },
      select: { startedAt: true, endedAt: true, durationMs: true, metricKey: true },
    });

    const fromDuration = averageDurationMs(
      rows.map((r) => ({
        start: r.startedAt,
        end:
          r.endedAt ??
          (r.durationMs != null
            ? new Date(r.startedAt.getTime() + r.durationMs)
            : null),
      })),
    );

    const byMetric = new Map<string, AvgMetric>();
    const keys = [...new Set(rows.map((r) => r.metricKey))];
    for (const key of keys) {
      const subset = rows.filter((r) => r.metricKey === key);
      byMetric.set(
        key,
        averageDurationMs(
          subset.map((r) => ({
            start: r.startedAt,
            end:
              r.endedAt ??
              (r.durationMs != null
                ? new Date(r.startedAt.getTime() + r.durationMs)
                : null),
          })),
        ),
      );
    }

    return {
      overall: fromDuration,
      byMetric: Object.fromEntries(byMetric),
    };
  }

  async patrols(range: KpiRange) {
    const where = {
      scheduledStartAt: { gte: range.from, lte: range.to },
      ...(range.groupId ? { groupId: range.groupId } : {}),
      ...(range.userId ? { assignedUserId: range.userId } : {}),
    };
    const [total, completed, inProgress, cancelled] = await Promise.all([
      prisma.patrolSession.count({ where }),
      prisma.patrolSession.count({
        where: { ...where, status: PatrolSessionStatus.COMPLETED },
      }),
      prisma.patrolSession.count({
        where: { ...where, status: PatrolSessionStatus.IN_PROGRESS },
      }),
      prisma.patrolSession.count({
        where: { ...where, status: PatrolSessionStatus.CANCELLED },
      }),
    ]);
    return { total, completed, inProgress, cancelled };
  }

  async cctvReferrals(range: KpiRange) {
    const where = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(range.groupId ? { assignedGroupId: range.groupId } : {}),
      ...(range.zoneId ? { zoneId: range.zoneId } : {}),
      ...(range.userId
        ? {
            OR: [{ createdById: range.userId }, { assignedUserId: range.userId }],
          }
        : {}),
    };
    const [total, byStatus, rows] = await Promise.all([
      prisma.securityReferral.count({ where }),
      prisma.securityReferral.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.securityReferral.findMany({
        where,
        select: {
          createdAt: true,
          receivedAt: true,
          startedAt: true,
          arrivedAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      avgReceive: averageDurationMs(
        rows.map((r) => ({ start: r.createdAt, end: r.receivedAt })),
      ),
      avgStart: averageDurationMs(
        rows.map((r) => ({ start: r.receivedAt, end: r.startedAt })),
      ),
      avgArrive: averageDurationMs(
        rows.map((r) => ({ start: r.startedAt, end: r.arrivedAt })),
      ),
      avgResolve: averageDurationMs(
        rows.map((r) => ({ start: r.createdAt, end: r.resolvedAt })),
      ),
    };
  }

  async permits(range: KpiRange) {
    const where = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(range.zoneId ? { zoneId: range.zoneId } : {}),
    };
    const [total, byStatus] = await Promise.all([
      prisma.securityPermit.count({ where }),
      prisma.securityPermit.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    };
  }

  async violations(range: KpiRange) {
    const where = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
    };
    const [total, byStatus] = await Promise.all([
      prisma.vehicleViolation.count({ where }),
      prisma.vehicleViolation.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    };
  }

  async visitors(range: KpiRange) {
    const where = {
      deletedAt: null,
      status: { not: VisitStatus.CANCELLED },
      OR: [
        { arrivalTime: { gte: range.from, lte: range.to } },
        { visitDate: { gte: range.from, lte: range.to } },
      ],
    };
    const [total, byStatus] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    };
  }

  async personnelGroupsShifts(range: KpiRange) {
    const [personnelOnDuty, groups, shiftSessions] = await Promise.all([
      prisma.user.count({
        where: {
          deletedAt: null,
          operationalStatus: { not: 'OFF_DUTY' },
          ...(range.userId ? { id: range.userId } : {}),
        },
      }),
      prisma.shiftGroup.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, nameAr: true, nameEn: true },
      }),
      prisma.shiftSession.findMany({
        where: {
          startsAt: { gte: range.from, lte: range.to },
          ...(range.groupId ? { groupId: range.groupId } : {}),
        },
        select: {
          id: true,
          status: true,
          kind: true,
          groupId: true,
          startsAt: true,
          endsAt: true,
        },
      }),
    ]);

    return {
      personnel: { onDutyCount: personnelOnDuty },
      groups: {
        total: groups.length,
        items: groups,
      },
      shifts: {
        total: shiftSessions.length,
        open: shiftSessions.filter((s) => s.status === 'OPEN').length,
        closed: shiftSessions.filter((s) => s.status === 'CLOSED').length,
        byKind: {
          MORNING: shiftSessions.filter((s) => s.kind === 'MORNING').length,
          EVENING: shiftSessions.filter((s) => s.kind === 'EVENING').length,
        },
      },
    };
  }
}

export const kpiService = new KpiService();
