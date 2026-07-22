import { ComplaintStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { dashboardService } from '../../dashboard/application/DashboardService.js';

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

class DirectorDashboardService {
  async getDashboard(user: AuthenticatedUser) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const onlineSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      dashboardSummary,
      openComplaints,
      totalComplaints,
      totalUsers,
      activeUsers,
      onlineUsersEstimate,
      recentComplaints,
      recentUsers,
    ] = await Promise.all([
      dashboardService.getSummary(user),
      prisma.complaint.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              ComplaintStatus.SUBMITTED,
              ComplaintStatus.UNDER_REVIEW,
              ComplaintStatus.APPROVED,
            ],
          },
        },
      }),
      prisma.complaint.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, status: UserStatus.ACTIVE },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          lastLoginAt: { gte: onlineSince },
        },
      }),
      prisma.complaint.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          submitter: { select: { id: true, fullName: true, employeeNumber: true } },
        },
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { code: true, nameEn: true } },
        },
      }),
    ]);

    const complaintsToday = await prisma.complaint.count({
      where: {
        deletedAt: null,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    return {
      todaysViolations: dashboardSummary.todaysViolations,
      openIncidents: dashboardSummary.openIncidents,
      todaysVisitors: dashboardSummary.todaysVisitors,
      openComplaints,
      totalComplaints,
      complaintsCount: complaintsToday,
      averageResponseMs: dashboardSummary.averageResponseMs,
      averageResponseMinutes: dashboardSummary.averageResponseMinutes,
      onlineUsersEstimate,
      totalUsers,
      activeUsers,
      charts: dashboardSummary.charts,
      recentComplaints,
      recentUsers,
      lastSyncHint: now.toISOString(),
    };
  }
}

export const directorDashboardService = new DirectorDashboardService();
