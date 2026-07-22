import {
  CameraRequestStatus,
  IncidentSeverity,
  IncidentStatus,
  VehicleViolationStatus,
  VisitStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { cameraRequestRepository } from '../infrastructure/CameraRequestRepository.js';

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

const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.NEW,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.ON_HOLD,
];

const OPEN_VIOLATION_STATUSES: VehicleViolationStatus[] = [
  VehicleViolationStatus.NEW,
  VehicleViolationStatus.ASSIGNED,
  VehicleViolationStatus.IN_PROGRESS,
];

const CURRENT_VISITOR_STATUSES: VisitStatus[] = [
  VisitStatus.ARRIVED,
  VisitStatus.HOST_NOTIFIED,
  VisitStatus.IN_MEETING,
];

type TimelineItem = {
  id: string;
  type: 'incident' | 'violation' | 'camera_request' | 'visitor';
  title: string;
  createdAt: Date;
  priority?: string;
};

class CctvDashboardService {
  async getDashboard() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      newIncidents,
      openViolations,
      currentVisitors,
      pendingCameraRequests,
      criticalIncidents,
      violationsToday,
      incidentsToday,
      visitorsToday,
      averageResponseMs,
      latestIncidents,
      latestViolations,
      latestCameraRequests,
      latestVisitors,
    ] = await Promise.all([
      prisma.incident.count({
        where: { deletedAt: null, status: IncidentStatus.NEW },
      }),
      prisma.vehicleViolation.count({
        where: { deletedAt: null, status: { in: OPEN_VIOLATION_STATUSES } },
      }),
      prisma.visitor.count({
        where: { deletedAt: null, status: { in: CURRENT_VISITOR_STATUSES } },
      }),
      cameraRequestRepository.countPending(),
      prisma.incident.count({
        where: {
          deletedAt: null,
          severity: IncidentSeverity.CRITICAL,
          status: { in: OPEN_INCIDENT_STATUSES },
        },
      }),
      prisma.vehicleViolation.count({
        where: {
          deletedAt: null,
          detectedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.incident.count({
        where: {
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.visitor.count({
        where: {
          deletedAt: null,
          status: { not: VisitStatus.CANCELLED },
          OR: [
            { arrivalTime: { gte: todayStart, lte: todayEnd } },
            { visitDate: { gte: todayStart, lte: todayEnd } },
          ],
        },
      }),
      cameraRequestRepository.getAverageResponseMs(todayStart, todayEnd),
      prisma.incident.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          severity: true,
          createdAt: true,
        },
      }),
      prisma.vehicleViolation.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          plateNumber: true,
          violationType: true,
          createdAt: true,
        },
      }),
      prisma.cameraRequest.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          plateNumber: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.visitor.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          visitorName: true,
          importance: true,
          createdAt: true,
        },
      }),
    ]);

    const timeline: TimelineItem[] = [
      ...latestIncidents.map((i) => ({
        id: i.id,
        type: 'incident' as const,
        title: i.title,
        createdAt: i.createdAt,
        priority: i.severity,
      })),
      ...latestViolations.map((v) => ({
        id: v.id,
        type: 'violation' as const,
        title: `${v.plateNumber} — ${v.violationType}`,
        createdAt: v.createdAt,
      })),
      ...latestCameraRequests.map((r) => ({
        id: r.id,
        type: 'camera_request' as const,
        title: `Camera lookup: ${r.plateNumber}`,
        createdAt: r.createdAt,
        priority: r.status === CameraRequestStatus.PENDING ? 'HIGH' : undefined,
      })),
      ...latestVisitors.map((v) => ({
        id: v.id,
        type: 'visitor' as const,
        title: v.visitorName,
        createdAt: v.createdAt,
        priority: v.importance !== 'NORMAL' ? v.importance : undefined,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 12);

    return {
      newIncidents,
      openViolations,
      currentVisitors,
      pendingCameraRequests,
      criticalIncidents,
      stats: {
        averageResponseMs,
        violationsToday,
        incidentsToday,
        visitorsToday,
      },
      timeline,
    };
  }
}

export const cctvDashboardService = new CctvDashboardService();
