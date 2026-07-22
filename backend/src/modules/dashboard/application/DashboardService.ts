import {
  IncidentStatus,
  NotificationStatus,
  VisitStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { taskRepository } from '../../tasks/infrastructure/TaskRepository.js';
import { violationRepository } from '../../violations/infrastructure/ViolationRepository.js';
import { shiftRosterService } from '../../shifts/application/ShiftRosterService.js';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

const PARKING_AR: Record<string, string> = {
  GROUND_PARKING: 'المواقف الأرضية',
  BASEMENT_PARKING: 'البيسمنت',
  WEST_PARKING: 'المواقف الغربية',
};

class DashboardService {
  async getSummary(user: AuthenticatedUser) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = daysAgo(6);

    const [
      todaysViolations,
      todaysVisitors,
      openIncidents,
      unreadNotifications,
      pendingTasks,
      overdueTasks,
      averageResponseMs,
      violationsByLocationRaw,
      incidentsByType,
      visitorsByDay,
      closedWithSla,
      latestViolations,
      latestIncidents,
      latestVisitors,
      unreadList,
      shifts,
    ] = await Promise.all([
      prisma.vehicleViolation.count({
        where: {
          deletedAt: null,
          detectedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.visitor.count({
        where: {
          deletedAt: null,
          status: { not: VisitStatus.CANCELLED },
          OR: [
            { arrivalTime: { gte: todayStart, lte: todayEnd } },
            {
              visitDate: { gte: todayStart, lte: todayEnd },
              status: {
                in: [
                  VisitStatus.UPCOMING,
                  VisitStatus.ARRIVED,
                  VisitStatus.HOST_NOTIFIED,
                  VisitStatus.IN_MEETING,
                ],
              },
            },
          ],
        },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              IncidentStatus.NEW,
              IncidentStatus.ASSIGNED,
              IncidentStatus.IN_PROGRESS,
              IncidentStatus.ON_HOLD,
            ],
          },
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          deletedAt: null,
          status: NotificationStatus.UNREAD,
        },
      }),
      taskRepository.countPendingForUser(user.id),
      taskRepository.countOverdueForUser(user.id),
      violationRepository.getAverageResponseMs(weekStart, todayEnd),
      violationRepository.countByLocation(weekStart, todayEnd),
      this.countIncidentsByType(weekStart, todayEnd),
      this.countVisitorsByDay(weekStart, todayEnd),
      prisma.incident.findMany({
        where: {
          deletedAt: null,
          closedAt: { not: null },
          slaDueAt: { not: null },
        },
        select: { closedAt: true, slaDueAt: true },
        take: 1000,
      }),
      prisma.vehicleViolation.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          plateNumber: true,
          status: true,
          parkingCode: true,
          createdAt: true,
          violationType: true,
        },
      }),
      prisma.incident.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { type: { select: { nameAr: true, code: true } } },
      }),
      prisma.visitor.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          visitorName: true,
          status: true,
          visitDate: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: NotificationStatus.UNREAD,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          sender: { select: { id: true, fullName: true, employeeNumber: true } },
        },
      }),
      shiftRosterService.getOpsBoard(),
    ]);

    const slaOnTimeCount = closedWithSla.filter(
      (i) => i.closedAt! <= i.slaDueAt!,
    ).length;
    const slaBreachedCount = closedWithSla.length - slaOnTimeCount;

    return {
      todaysViolations,
      todaysVisitors,
      openIncidents,
      unreadNotifications,
      pendingTasks,
      overdueTasks,
      averageResponseMs,
      averageResponseMinutes:
        averageResponseMs != null
          ? Math.round((averageResponseMs / 60_000) * 100) / 100
          : null,
      charts: {
        violationsByLocation: violationsByLocationRaw.map((r) => ({
          name:
            r.location?.nameAr ??
            PARKING_AR[r.parkingCode] ??
            r.parkingCode ??
            'غير محدد',
          value: r.count,
        })),
        incidentsByType,
        visitorsByDay,
        averageResponseTime: {
          milliseconds: averageResponseMs,
          minutes:
            averageResponseMs != null
              ? Math.round((averageResponseMs / 60_000) * 100) / 100
              : null,
        },
        sla: {
          onTime: slaOnTimeCount,
          breached: slaBreachedCount,
          total: closedWithSla.length,
        },
      },
      tables: {
        latestViolations,
        latestIncidents: latestIncidents.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          severity: i.severity,
          typeNameAr: i.type?.nameAr ?? null,
          createdAt: i.createdAt,
        })),
        latestVisitors,
        unreadNotifications: unreadList,
      },
      shifts,
      lastSyncHint: now.toISOString(),
    };
  }

  private async countIncidentsByType(from: Date, to: Date) {
    const rows = await prisma.incident.groupBy({
      by: ['typeId'],
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
      _count: { _all: true },
    });
    const typeIds = rows.map((r) => r.typeId);
    const types = await prisma.incidentType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, nameAr: true, code: true },
    });
    const map = new Map(types.map((t) => [t.id, t]));
    return rows.map((r) => ({
      name: map.get(r.typeId)?.nameAr ?? map.get(r.typeId)?.code ?? 'أخرى',
      value: r._count._all,
    }));
  }

  private async countVisitorsByDay(from: Date, to: Date) {
    const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', COALESCE("arrivalTime", "visitDate", "createdAt")) AS day,
             COUNT(*)::bigint AS count
      FROM visitors
      WHERE "deletedAt" IS NULL
        AND COALESCE("arrivalTime", "visitDate", "createdAt") >= ${from}
        AND COALESCE("arrivalTime", "visitDate", "createdAt") <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      value: Number(r.count),
    }));
  }
}

export const dashboardService = new DashboardService();
