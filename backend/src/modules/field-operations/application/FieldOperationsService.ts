import {
  AuditAction,
  CheckpointType,
  FieldAlertSeverity,
  FieldAlertStatus,
  FieldAlertType,
  IncidentStatus,
  OperationalStatus,
  PatrolSessionStatus,
  PatrolVerificationMethod,
  PatrolVisitStatus,
  PersonnelLocationSource,
  Prisma,
  SecurityZoneType,
  UserStatus,
  VehicleViolationStatus,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { prisma } from '../../../shared/database/prisma.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { shiftRosterService } from '../../shifts/application/ShiftRosterService.js';
import { ACTIVE_PATROL_STATUSES } from '../domain/constants.js';
import {
  assertCanActOnOwnOrManagePatrol,
  assertCanUpdatePersonnelLocation,
  assertPatrolTransition,
  assertRestingGroupAssign,
  buildSosAlertPayload,
  InMemoryRateLimiter,
  isPatrolLate,
  missedRequiredCheckpoints,
} from './fieldOpsHelpers.js';
import {
  isLocationFresh,
  rankNearestPersonnel,
  type NearestPersonnelCandidate,
} from './nearestPersonnel.js';
import { loadFieldOpsSettings, locationExpiresAt } from './fieldOpsSettings.js';

const SOS_RATE_LIMIT_MS = 60_000;
const locationRateLimiter = new InMemoryRateLimiter(30_000);
const sosRateLimiter = new InMemoryRateLimiter(SOS_RATE_LIMIT_MS);

const userBriefSelect = {
  id: true,
  fullName: true,
  employeeNumber: true,
  operationalStatus: true,
  groupId: true,
  role: { select: { code: true, nameAr: true, nameEn: true } },
  group: { select: { id: true, code: true, nameAr: true, nameEn: true } },
} as const;

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

export interface CreateZoneInput {
  name: string;
  code: string;
  description?: string | null;
  zoneType: SecurityZoneType;
  parentId?: string | null;
  floorNumber?: number | null;
  mapX?: number;
  mapY?: number;
  width?: number;
  height?: number;
  color?: string;
  isActive?: boolean;
}

export interface CreateCheckpointInput {
  name: string;
  code: string;
  description?: string | null;
  zoneId: string;
  latitude?: number | null;
  longitude?: number | null;
  mapX?: number;
  mapY?: number;
  checkpointType?: CheckpointType;
  qrCodeValue: string;
  nfcTagValue?: string | null;
  requiredForPatrol?: boolean;
  isActive?: boolean;
}

export interface RouteCheckpointInput {
  checkpointId: string;
  orderIndex: number;
  expectedMinutesFromStart?: number;
  isRequired?: boolean;
  instructions?: string | null;
}

export interface CreateRouteInput {
  name: string;
  description?: string | null;
  shiftType?: string | null;
  groupId?: string | null;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
  checkpoints: RouteCheckpointInput[];
}

export interface CreatePatrolSessionInput {
  routeId: string;
  assignedUserId?: string | null;
  scheduledStartAt: Date;
  notes?: string | null;
  priority?: number;
  overrideReason?: string | null;
}

export interface AssignPatrolInput {
  assignedUserId: string;
  overrideReason?: string | null;
}

export interface VisitCheckpointInput {
  verificationMethod?: PatrolVerificationMethod;
  mapX?: number | null;
  mapY?: number | null;
  notes?: string | null;
  attachmentUrl?: string | null;
  status?: PatrolVisitStatus;
  clientSyncId?: string | null;
  qrCodeValue?: string | null;
}

export interface LocationUpdateInput {
  mapX: number;
  mapY: number;
  zoneId?: string | null;
  accuracy?: number | null;
  source?: PersonnelLocationSource;
}

export interface CreateAlertInput {
  title: string;
  description: string;
  alertType: FieldAlertType;
  severity?: FieldAlertSeverity;
  zoneId?: string | null;
  assignedUserId?: string | null;
  assignedGroupId?: string | null;
  incidentId?: string | null;
  patrolSessionId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

export interface SosInput {
  description?: string | null;
  zoneId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

function paginate(query: PaginationQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

class FieldOperationsService {
  async getMap() {
    const [
      zones,
      checkpoints,
      activePatrols,
      currentLocations,
      openAlerts,
      openIncidents,
      openViolations,
      activeGroupId,
    ] = await Promise.all([
      prisma.securityZone.findMany({
        where: { isActive: true },
        orderBy: [{ zoneType: 'asc' }, { name: 'asc' }],
      }),
      prisma.securityCheckpoint.findMany({
        where: { isActive: true },
        include: { zone: { select: { id: true, code: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.patrolSession.findMany({
        where: { status: { in: ACTIVE_PATROL_STATUSES } },
        include: {
          route: { select: { id: true, name: true, estimatedDurationMinutes: true } },
          assignedUser: { select: userBriefSelect },
          visits: { select: { checkpointId: true, visitedAt: true } },
        },
        orderBy: { scheduledStartAt: 'asc' },
      }),
      prisma.personnelLocation.findMany({
        where: { isCurrent: true },
        include: {
          user: { select: userBriefSelect },
          zone: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.fieldAlert.findMany({
        where: {
          status: {
            in: [
              FieldAlertStatus.NEW,
              FieldAlertStatus.ACKNOWLEDGED,
              FieldAlertStatus.IN_PROGRESS,
            ],
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      prisma.incident.findMany({
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
          OR: [{ mapX: { not: null } }, { zoneId: { not: null } }],
        },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          zoneId: true,
          checkpointId: true,
          mapX: true,
          mapY: true,
          assigneeId: true,
          createdAt: true,
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicleViolation.findMany({
        where: {
          deletedAt: null,
          status: {
            in: [
              VehicleViolationStatus.NEW,
              VehicleViolationStatus.ASSIGNED,
              VehicleViolationStatus.IN_PROGRESS,
            ],
          },
          OR: [{ mapX: { not: null } }, { zoneId: { not: null } }],
        },
        select: {
          id: true,
          plateNumber: true,
          status: true,
          zoneId: true,
          checkpointId: true,
          mapX: true,
          mapY: true,
          createdAt: true,
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      shiftRosterService.getActiveGroupId(),
    ]);

    return {
      activeGroupId,
      zones,
      checkpoints,
      activePatrols,
      personnelLocations: currentLocations,
      openAlerts,
      openIncidents,
      openViolations,
    };
  }

  async getOverview() {
    const activeGroupId = await shiftRosterService.getActiveGroupId();
    const opsBoard = await shiftRosterService.getOpsBoard();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [
      activePatrols,
      lateOrMissedPatrols,
      openAlerts,
      criticalAlerts,
      completedToday,
      zonesCount,
      checkpointsCount,
      personnelOnline,
      openIncidentsOnMap,
      availableCount,
      busyCount,
      recentAlerts,
      recentPatrols,
    ] = await Promise.all([
      prisma.patrolSession.count({
        where: { status: { in: [PatrolSessionStatus.IN_PROGRESS, PatrolSessionStatus.LATE] } },
      }),
      prisma.patrolSession.count({
        where: {
          status: { in: [PatrolSessionStatus.LATE, PatrolSessionStatus.MISSED] },
        },
      }),
      prisma.fieldAlert.count({
        where: {
          status: {
            in: [
              FieldAlertStatus.NEW,
              FieldAlertStatus.ACKNOWLEDGED,
              FieldAlertStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      prisma.fieldAlert.count({
        where: {
          severity: FieldAlertSeverity.CRITICAL,
          status: {
            in: [
              FieldAlertStatus.NEW,
              FieldAlertStatus.ACKNOWLEDGED,
              FieldAlertStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      prisma.patrolSession.count({
        where: {
          status: PatrolSessionStatus.COMPLETED,
          completedAt: { gte: dayStart },
        },
      }),
      prisma.securityZone.count({ where: { isActive: true } }),
      prisma.securityCheckpoint.count({ where: { isActive: true } }),
      prisma.personnelLocation.count({ where: { isCurrent: true } }),
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
      activeGroupId
        ? prisma.user.count({
            where: {
              deletedAt: null,
              groupId: activeGroupId,
              status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
              operationalStatus: OperationalStatus.ON_DUTY,
            },
          })
        : Promise.resolve(0),
      activeGroupId
        ? prisma.user.count({
            where: {
              deletedAt: null,
              groupId: activeGroupId,
              status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
              operationalStatus: {
                in: [
                  OperationalStatus.ON_PATROL,
                  OperationalStatus.HANDLING_INCIDENT,
                  OperationalStatus.FIELD_TASK,
                  OperationalStatus.WITH_CCTV,
                ],
              },
            },
          })
        : Promise.resolve(0),
      prisma.fieldAlert.findMany({
        where: {
          status: {
            in: [
              FieldAlertStatus.NEW,
              FieldAlertStatus.ACKNOWLEDGED,
              FieldAlertStatus.IN_PROGRESS,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          zone: { select: { id: true, code: true, name: true } },
          assignedUser: { select: userBriefSelect },
        },
      }),
      prisma.patrolSession.findMany({
        where: { status: { in: ACTIVE_PATROL_STATUSES } },
        orderBy: { scheduledStartAt: 'desc' },
        take: 8,
        include: {
          route: { select: { id: true, name: true, estimatedDurationMinutes: true } },
          assignedUser: { select: userBriefSelect },
          visits: { select: { id: true, checkpointId: true, visitedAt: true } },
        },
      }),
    ]);

    const activeShiftCard =
      opsBoard.activeKind === 'MORNING' ? opsBoard.morning : opsBoard.evening;

    return {
      activeGroupId,
      currentShift: {
        kind: opsBoard.activeKind,
        kindLabel: opsBoard.activeKindLabel,
        group: opsBoard.activeGroup,
        status: activeShiftCard.status,
        guardCount: activeShiftCard.guardCount,
        supervisorCount: activeShiftCard.supervisorCount,
      },
      workingGroup: opsBoard.activeGroup ?? null,
      openAlerts,
      criticalAlerts,
      activePatrols,
      completedPatrolsToday: completedToday,
      lateOrMissedPatrols,
      activeCheckpoints: checkpointsCount,
      activeZones: zonesCount,
      personnelOnline,
      openIncidentsOnMap,
      availablePersonnel: availableCount,
      busyPersonnel: busyCount,
      onDutyPersonnel: availableCount + busyCount,
      recentAlerts,
      recentPatrols,
    };
  }

  async getStatistics(from?: Date, to?: Date) {
    const rangeTo = to ?? new Date();
    const rangeFrom = from ?? new Date(rangeTo.getTime() - 30 * 86_400_000);

    const completedSessions = await prisma.patrolSession.findMany({
      where: {
        status: PatrolSessionStatus.COMPLETED,
        completedAt: { not: null },
        createdAt: { gte: rangeFrom, lte: rangeTo },
      },
      select: { startedAt: true, completedAt: true, scheduledStartAt: true },
    });

    const durations = completedSessions
      .map((s) => {
        if (!s.completedAt) return null;
        const start = s.startedAt ?? s.scheduledStartAt;
        return (s.completedAt.getTime() - start.getTime()) / 60_000;
      })
      .filter((n): n is number => n !== null && n >= 0);

    const averagePatrolDurationMinutes =
      durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : null;

    const [sessionsByStatus, alertsByType, alertsBySeverity, totalSessions, completedCount, sosCount, checkpointVisits] =
      await Promise.all([
        prisma.patrolSession.groupBy({
          by: ['status'],
          where: { createdAt: { gte: rangeFrom, lte: rangeTo } },
          _count: { _all: true },
        }),
        prisma.fieldAlert.groupBy({
          by: ['alertType'],
          where: { createdAt: { gte: rangeFrom, lte: rangeTo } },
          _count: { _all: true },
        }),
        prisma.fieldAlert.groupBy({
          by: ['severity'],
          where: { createdAt: { gte: rangeFrom, lte: rangeTo } },
          _count: { _all: true },
        }),
        prisma.patrolSession.count({
          where: { createdAt: { gte: rangeFrom, lte: rangeTo } },
        }),
        prisma.patrolSession.count({
          where: {
            status: PatrolSessionStatus.COMPLETED,
            createdAt: { gte: rangeFrom, lte: rangeTo },
          },
        }),
        prisma.fieldAlert.count({
          where: {
            alertType: FieldAlertType.SOS,
            createdAt: { gte: rangeFrom, lte: rangeTo },
          },
        }),
        prisma.patrolCheckpointVisit.groupBy({
          by: ['checkpointId'],
          where: { visitedAt: { gte: rangeFrom, lte: rangeTo } },
          _count: { _all: true },
          orderBy: { _count: { checkpointId: 'desc' } },
          take: 10,
        }),
      ]);

    const checkpointIds = checkpointVisits.map((v) => v.checkpointId);
    const checkpoints = checkpointIds.length
      ? await prisma.securityCheckpoint.findMany({
          where: { id: { in: checkpointIds } },
          select: { id: true, name: true },
        })
      : [];
    const cpName = new Map(checkpoints.map((c) => [c.id, c.name]));

    const visitsByDayRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "visitedAt") AS day, COUNT(*)::bigint AS count
      FROM patrol_checkpoint_visits
      WHERE "visitedAt" >= ${rangeFrom} AND "visitedAt" <= ${rangeTo}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return {
      from: rangeFrom,
      to: rangeTo,
      patrolsByStatus: sessionsByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      alertsBySeverity: alertsBySeverity.map((r) => ({
        severity: r.severity,
        count: r._count._all,
      })),
      alertsByType: alertsByType.map((r) => ({
        alertType: r.alertType,
        count: r._count._all,
      })),
      visitsByDay: visitsByDayRaw.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
      checkpointCoverage: checkpointVisits.map((v) => ({
        checkpointId: v.checkpointId,
        name: cpName.get(v.checkpointId) ?? v.checkpointId,
        visits: v._count._all,
      })),
      averagePatrolDurationMinutes,
      completionRate: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 1000) / 10 : null,
      sosCount,
      // backward-compatible aliases
      sessionsByStatus,
      alertsByTypeRaw: alertsByType,
      alertsBySeverityRaw: alertsBySeverity,
    };
  }

  // ─── Zones ─────────────────────────────────────────────────────

  async listZones(query: PaginationQuery & { zoneType?: SecurityZoneType; parentId?: string }) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.SecurityZoneWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.zoneType ? { zoneType: query.zoneType } : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.securityZone.count({ where }),
      prisma.securityZone.findMany({
        where,
        include: {
          parent: { select: { id: true, code: true, name: true } },
          _count: { select: { checkpoints: true, children: true } },
        },
        orderBy: { [query.sortBy === 'code' ? 'code' : 'name']: query.sortDir ?? 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getZone(id: string) {
    const zone = await prisma.securityZone.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        checkpoints: { where: { isActive: true } },
      },
    });
    if (!zone) throw new NotFoundError('المنطقة الأمنية غير موجودة');
    return zone;
  }

  async createZone(actor: AuthenticatedUser, input: CreateZoneInput, meta: RequestMeta = {}) {
    const existing = await prisma.securityZone.findUnique({ where: { code: input.code } });
    if (existing) throw new ValidationError(`رمز المنطقة مستخدم مسبقاً: ${input.code}`);

    if (input.parentId) {
      const parent = await prisma.securityZone.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundError('المنطقة الأب غير موجودة');
    }

    const zone = await prisma.securityZone.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        description: input.description ?? null,
        zoneType: input.zoneType,
        parentId: input.parentId ?? null,
        floorNumber: input.floorNumber ?? null,
        mapX: input.mapX ?? 0,
        mapY: input.mapY ?? 0,
        width: input.width ?? 100,
        height: input.height ?? 80,
        color: input.color ?? '#0f766e',
        isActive: input.isActive ?? true,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SecurityZone',
      entityId: zone.id,
      metadata: { code: zone.code },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'zone:created', zoneId: zone.id });
    return zone;
  }

  async updateZone(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<CreateZoneInput>,
    meta: RequestMeta = {},
  ) {
    await this.getZone(id);
    const zone = await prisma.securityZone.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.zoneType !== undefined ? { zoneType: input.zoneType } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.floorNumber !== undefined ? { floorNumber: input.floorNumber } : {}),
        ...(input.mapX !== undefined ? { mapX: input.mapX } : {}),
        ...(input.mapY !== undefined ? { mapY: input.mapY } : {}),
        ...(input.width !== undefined ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityZone',
      entityId: id,
      metadata: { fields: Object.keys(input) },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'zone:updated', zoneId: id });
    return zone;
  }

  async deleteZone(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const zone = await this.getZone(id);
    const [incidentCount, checkpointCount, alertCount, locationCount] = await Promise.all([
      prisma.incident.count({ where: { zoneId: id, deletedAt: null } }),
      prisma.securityCheckpoint.count({ where: { zoneId: id } }),
      prisma.fieldAlert.count({ where: { zoneId: id } }),
      prisma.personnelLocation.count({ where: { zoneId: id } }),
    ]);

    const linked = incidentCount + checkpointCount + alertCount + locationCount > 0;
    if (linked) {
      const updated = await prisma.securityZone.update({
        where: { id },
        data: { isActive: false },
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'SecurityZone',
        entityId: id,
        metadata: { softDisabled: true, code: zone.code },
        meta,
      });
      broadcast('field-map:refresh', { reason: 'zone:disabled', zoneId: id });
      return { ...updated, softDisabled: true as const };
    }

    await prisma.securityZone.delete({ where: { id } });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'SecurityZone',
      entityId: id,
      metadata: { code: zone.code },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'zone:deleted', zoneId: id });
    return { id, deleted: true as const };
  }

  // ─── Checkpoints ───────────────────────────────────────────────

  async listCheckpoints(query: PaginationQuery & { zoneId?: string; checkpointType?: CheckpointType }) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.SecurityCheckpointWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.checkpointType ? { checkpointType: query.checkpointType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.securityCheckpoint.count({ where }),
      prisma.securityCheckpoint.findMany({
        where,
        include: { zone: { select: { id: true, code: true, name: true } } },
        orderBy: { name: query.sortDir ?? 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getCheckpoint(id: string) {
    const cp = await prisma.securityCheckpoint.findUnique({
      where: { id },
      include: { zone: true },
    });
    if (!cp) throw new NotFoundError('نقطة التفتيش غير موجودة');
    return cp;
  }

  async createCheckpoint(
    actor: AuthenticatedUser,
    input: CreateCheckpointInput,
    meta: RequestMeta = {},
  ) {
    await this.getZone(input.zoneId);
    const dup = await prisma.securityCheckpoint.findFirst({
      where: { OR: [{ code: input.code }, { qrCodeValue: input.qrCodeValue }] },
    });
    if (dup) throw new ValidationError('رمز نقطة التفتيش أو قيمة QR مستخدمة مسبقاً');

    const checkpoint = await prisma.securityCheckpoint.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        description: input.description ?? null,
        zoneId: input.zoneId,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        mapX: input.mapX ?? 0,
        mapY: input.mapY ?? 0,
        checkpointType: input.checkpointType ?? CheckpointType.GENERAL,
        qrCodeValue: input.qrCodeValue.trim(),
        nfcTagValue: input.nfcTagValue ?? null,
        requiredForPatrol: input.requiredForPatrol ?? true,
        isActive: input.isActive ?? true,
      },
      include: { zone: { select: { id: true, code: true, name: true } } },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SecurityCheckpoint',
      entityId: checkpoint.id,
      metadata: { code: checkpoint.code },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'checkpoint:created', checkpointId: checkpoint.id });
    return checkpoint;
  }

  async updateCheckpoint(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<CreateCheckpointInput>,
    meta: RequestMeta = {},
  ) {
    await this.getCheckpoint(id);
    const checkpoint = await prisma.securityCheckpoint.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.mapX !== undefined ? { mapX: input.mapX } : {}),
        ...(input.mapY !== undefined ? { mapY: input.mapY } : {}),
        ...(input.checkpointType !== undefined ? { checkpointType: input.checkpointType } : {}),
        ...(input.qrCodeValue !== undefined ? { qrCodeValue: input.qrCodeValue.trim() } : {}),
        ...(input.nfcTagValue !== undefined ? { nfcTagValue: input.nfcTagValue } : {}),
        ...(input.requiredForPatrol !== undefined
          ? { requiredForPatrol: input.requiredForPatrol }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { zone: { select: { id: true, code: true, name: true } } },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityCheckpoint',
      entityId: id,
      meta,
    });
    broadcast('field-map:refresh', { reason: 'checkpoint:updated', checkpointId: id });
    return checkpoint;
  }

  async deleteCheckpoint(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const cp = await this.getCheckpoint(id);
    const [visitCount, routeCount, incidentCount] = await Promise.all([
      prisma.patrolCheckpointVisit.count({ where: { checkpointId: id } }),
      prisma.patrolRouteCheckpoint.count({ where: { checkpointId: id } }),
      prisma.incident.count({ where: { checkpointId: id, deletedAt: null } }),
    ]);

    if (visitCount + routeCount + incidentCount > 0) {
      const updated = await prisma.securityCheckpoint.update({
        where: { id },
        data: { isActive: false },
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'SecurityCheckpoint',
        entityId: id,
        metadata: { softDisabled: true, code: cp.code },
        meta,
      });
      broadcast('field-map:refresh', { reason: 'checkpoint:disabled', checkpointId: id });
      return { ...updated, softDisabled: true as const };
    }

    await prisma.securityCheckpoint.delete({ where: { id } });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'SecurityCheckpoint',
      entityId: id,
      metadata: { code: cp.code },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'checkpoint:deleted', checkpointId: id });
    return { id, deleted: true as const };
  }

  // ─── Patrol routes ─────────────────────────────────────────────

  async listRoutes(query: PaginationQuery) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.PatrolRouteWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.patrolRoute.count({ where }),
      prisma.patrolRoute.findMany({
        where,
        include: {
          group: { select: { id: true, code: true, nameAr: true } },
          checkpoints: {
            orderBy: { orderIndex: 'asc' },
            include: { checkpoint: { select: { id: true, code: true, name: true } } },
          },
          _count: { select: { sessions: true } },
        },
        orderBy: { name: query.sortDir ?? 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getRoute(id: string) {
    const route = await prisma.patrolRoute.findUnique({
      where: { id },
      include: {
        group: true,
        checkpoints: {
          orderBy: { orderIndex: 'asc' },
          include: { checkpoint: true },
        },
      },
    });
    if (!route) throw new NotFoundError('مسار الجولة غير موجود');
    return route;
  }

  async createRoute(actor: AuthenticatedUser, input: CreateRouteInput, meta: RequestMeta = {}) {
    if (!input.checkpoints?.length) {
      throw new ValidationError('يجب إضافة نقطة تفتيش واحدةحدة على الأقل للمسار');
    }

    const route = await prisma.patrolRoute.create({
      data: {
        name: input.name.trim(),
        description: input.description ?? null,
        shiftType: input.shiftType ?? null,
        groupId: input.groupId ?? null,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? 60,
        isActive: input.isActive ?? true,
        checkpoints: {
          create: input.checkpoints.map((c) => ({
            checkpointId: c.checkpointId,
            orderIndex: c.orderIndex,
            expectedMinutesFromStart: c.expectedMinutesFromStart ?? 0,
            isRequired: c.isRequired ?? true,
            instructions: c.instructions ?? null,
          })),
        },
      },
      include: {
        checkpoints: {
          orderBy: { orderIndex: 'asc' },
          include: { checkpoint: true },
        },
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'PatrolRoute',
      entityId: route.id,
      metadata: { name: route.name },
      meta,
    });
    broadcast('field-map:refresh', { reason: 'route:created', routeId: route.id });
    return route;
  }

  async updateRoute(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<CreateRouteInput>,
    meta: RequestMeta = {},
  ) {
    await this.getRoute(id);

    const route = await prisma.$transaction(async (tx) => {
      if (input.checkpoints) {
        await tx.patrolRouteCheckpoint.deleteMany({ where: { routeId: id } });
        await tx.patrolRouteCheckpoint.createMany({
          data: input.checkpoints.map((c) => ({
            routeId: id,
            checkpointId: c.checkpointId,
            orderIndex: c.orderIndex,
            expectedMinutesFromStart: c.expectedMinutesFromStart ?? 0,
            isRequired: c.isRequired ?? true,
            instructions: c.instructions ?? null,
          })),
        });
      }

      return tx.patrolRoute.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.shiftType !== undefined ? { shiftType: input.shiftType } : {}),
          ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
          ...(input.estimatedDurationMinutes !== undefined
            ? { estimatedDurationMinutes: input.estimatedDurationMinutes }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: {
          checkpoints: {
            orderBy: { orderIndex: 'asc' },
            include: { checkpoint: true },
          },
        },
      });
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolRoute',
      entityId: id,
      meta,
    });
    broadcast('field-map:refresh', { reason: 'route:updated', routeId: id });
    return route;
  }

  async deleteRoute(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const route = await this.getRoute(id);
    const sessionCount = await prisma.patrolSession.count({ where: { routeId: id } });
    if (sessionCount > 0) {
      const updated = await prisma.patrolRoute.update({
        where: { id },
        data: { isActive: false },
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'PatrolRoute',
        entityId: id,
        metadata: { softDisabled: true },
        meta,
      });
      return { ...updated, softDisabled: true as const };
    }

    await prisma.patrolRoute.delete({ where: { id } });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'PatrolRoute',
      entityId: id,
      metadata: { name: route.name },
      meta,
    });
    return { id, deleted: true as const };
  }

  // ─── Patrol sessions ───────────────────────────────────────────

  private async loadSession(id: string) {
    const session = await prisma.patrolSession.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            checkpoints: {
              orderBy: { orderIndex: 'asc' },
              include: { checkpoint: true },
            },
          },
        },
        assignedUser: { select: userBriefSelect },
        assignedBy: { select: { id: true, fullName: true, employeeNumber: true } },
        visits: {
          include: {
            checkpoint: { select: { id: true, code: true, name: true } },
            visitedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { visitedAt: 'asc' },
        },
        group: { select: { id: true, code: true, nameAr: true } },
      },
    });
    if (!session) throw new NotFoundError('جلسة الجولة غير موجودة');
    return session;
  }

  async listSessions(
    actor: AuthenticatedUser,
    query: PaginationQuery & {
      status?: PatrolSessionStatus;
      assignedUserId?: string;
      routeId?: string;
      groupId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const { page, pageSize, skip } = paginate(query);
    const guardOnlyOwn =
      actor.roleCode === RoleCodes.SECURITY_GUARD &&
      !actor.permissions.includes(PermissionCodes.PATROL_SESSIONS_ASSIGN);

    const where: Prisma.PatrolSessionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.routeId ? { routeId: query.routeId } : {}),
      ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(guardOnlyOwn ? { assignedUserId: actor.id } : {}),
      ...(query.from || query.to
        ? {
            scheduledStartAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.patrolSession.count({ where }),
      prisma.patrolSession.findMany({
        where,
        include: {
          route: { select: { id: true, name: true, estimatedDurationMinutes: true } },
          assignedUser: { select: userBriefSelect },
          visits: { select: { id: true, checkpointId: true, visitedAt: true } },
        },
        orderBy: { scheduledStartAt: query.sortDir ?? 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getSession(actor: AuthenticatedUser, id: string) {
    const session = await this.loadSession(id);
    if (
      actor.roleCode === RoleCodes.SECURITY_GUARD &&
      !actor.permissions.includes(PermissionCodes.PATROL_SESSIONS_ASSIGN) &&
      session.assignedUserId !== actor.id
    ) {
      throw new ForbiddenError('لا يمكنك عرض جولات غير مسندة إليك');
    }
    return session;
  }

  async createSession(
    actor: AuthenticatedUser,
    input: CreatePatrolSessionInput,
    meta: RequestMeta = {},
  ) {
    const route = await this.getRoute(input.routeId);
    if (!route.isActive) throw new ValidationError('مسار الجولة غير نشط');

    let overrideRestingGroup = false;
    let overrideReason: string | null = null;
    let groupId: string | null = route.groupId;
    const activeGroupId = await shiftRosterService.getActiveGroupId();

    if (input.assignedUserId) {
      const assignee = await prisma.user.findFirst({
        where: { id: input.assignedUserId, deletedAt: null },
        select: { id: true, groupId: true },
      });
      if (!assignee) throw new NotFoundError('المستخدم المسند غير موجود');
      groupId = assignee.groupId;
      const resting = await shiftRosterService.isGroupResting(assignee.groupId);
      const gate = assertRestingGroupAssign({
        assigneeGroupId: assignee.groupId,
        isGroupResting: resting,
        actorRoleCode: actor.roleCode,
        overrideReason: input.overrideReason,
      });
      overrideRestingGroup = gate.overrideRestingGroup;
      overrideReason = gate.overrideReason;
    }

    const status = input.assignedUserId
      ? PatrolSessionStatus.ASSIGNED
      : PatrolSessionStatus.SCHEDULED;

    const session = await prisma.patrolSession.create({
      data: {
        routeId: input.routeId,
        assignedUserId: input.assignedUserId ?? null,
        assignedById: input.assignedUserId ? actor.id : null,
        groupId: groupId ?? activeGroupId,
        status,
        scheduledStartAt: input.scheduledStartAt,
        notes: input.notes ?? null,
        priority: input.priority ?? 100,
        overrideRestingGroup,
        overrideReason,
      },
      include: {
        route: { select: { id: true, name: true, estimatedDurationMinutes: true } },
        assignedUser: { select: userBriefSelect },
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'PatrolSession',
      entityId: session.id,
      metadata: {
        routeId: input.routeId,
        assignedUserId: input.assignedUserId ?? null,
        overrideRestingGroup,
      },
      meta,
    });

    broadcast('patrol:created', { sessionId: session.id });
    if (input.assignedUserId) {
      broadcast('patrol:assigned', { sessionId: session.id, assignedUserId: input.assignedUserId });
    }
    broadcast('field-map:refresh', { reason: 'patrol:created', sessionId: session.id });
    return session;
  }

  async updateSession(
    actor: AuthenticatedUser,
    id: string,
    input: { notes?: string | null; priority?: number; scheduledStartAt?: Date },
    meta: RequestMeta = {},
  ) {
    const existing = await this.loadSession(id);
    if (
      existing.status === PatrolSessionStatus.COMPLETED ||
      existing.status === PatrolSessionStatus.CANCELLED
    ) {
      throw new ValidationError('لا يمكن تعديل جلسة جولة مكتملة أو ملغاة');
    }

    const session = await prisma.patrolSession.update({
      where: { id },
      data: {
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.scheduledStartAt !== undefined
          ? { scheduledStartAt: input.scheduledStartAt }
          : {}),
      },
      include: {
        route: { select: { id: true, name: true } },
        assignedUser: { select: userBriefSelect },
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolSession',
      entityId: id,
      meta,
    });
    broadcast('field-map:refresh', { reason: 'patrol:updated', sessionId: id });
    return session;
  }

  async assignSession(
    actor: AuthenticatedUser,
    id: string,
    input: AssignPatrolInput,
    meta: RequestMeta = {},
  ) {
    const session = await this.loadSession(id);
    if (
      session.status === PatrolSessionStatus.COMPLETED ||
      session.status === PatrolSessionStatus.CANCELLED ||
      session.status === PatrolSessionStatus.IN_PROGRESS ||
      session.status === PatrolSessionStatus.LATE
    ) {
      throw new ValidationError('لا يمكن إسناد جلسة جولة في حالتها الحالية');
    }

    const assignee = await prisma.user.findFirst({
      where: { id: input.assignedUserId, deletedAt: null },
      select: { id: true, groupId: true, fullName: true },
    });
    if (!assignee) throw new NotFoundError('المستخدم المسند غير موجود');

    const resting = await shiftRosterService.isGroupResting(assignee.groupId);
    const gate = assertRestingGroupAssign({
      assigneeGroupId: assignee.groupId,
      isGroupResting: resting,
      actorRoleCode: actor.roleCode,
      overrideReason: input.overrideReason,
    });

    if (session.status === PatrolSessionStatus.SCHEDULED) {
      assertPatrolTransition(session.status, PatrolSessionStatus.ASSIGNED);
    }

    const updated = await prisma.patrolSession.update({
      where: { id },
      data: {
        assignedUserId: assignee.id,
        assignedById: actor.id,
        groupId: assignee.groupId,
        status: PatrolSessionStatus.ASSIGNED,
        overrideRestingGroup: gate.overrideRestingGroup,
        overrideReason: gate.overrideReason,
      },
      include: {
        route: { select: { id: true, name: true } },
        assignedUser: { select: userBriefSelect },
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.ASSIGN,
      entityType: 'PatrolSession',
      entityId: id,
      metadata: {
        assignedUserId: assignee.id,
        overrideRestingGroup: gate.overrideRestingGroup,
        overrideReason: gate.overrideReason,
      },
      meta,
    });

    broadcast('patrol:assigned', { sessionId: id, assignedUserId: assignee.id });
    broadcast('field-map:refresh', { reason: 'patrol:assigned', sessionId: id });
    return updated;
  }

  async startSession(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const session = await this.loadSession(id);
    assertCanActOnOwnOrManagePatrol({
      actor,
      assignedUserId: session.assignedUserId,
      managePermission: PermissionCodes.PATROL_SESSIONS_ASSIGN,
    });

    if (!session.assignedUserId) {
      throw new ValidationError('يجب إسناد الجولة قبل البدء');
    }

    assertPatrolTransition(session.status, PatrolSessionStatus.IN_PROGRESS);

    const updated = await prisma.patrolSession.update({
      where: { id },
      data: {
        status: PatrolSessionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        route: { select: { id: true, name: true, estimatedDurationMinutes: true } },
        assignedUser: { select: userBriefSelect },
      },
    });

    if (session.assignedUserId === actor.id) {
      await prisma.user.update({
        where: { id: actor.id },
        data: { operationalStatus: OperationalStatus.ON_PATROL },
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolSession',
      entityId: id,
      metadata: { action: 'start' },
      meta,
    });

    broadcast('patrol:started', { sessionId: id });
    broadcast('field-map:refresh', { reason: 'patrol:started', sessionId: id });
    return updated;
  }

  async visitCheckpoint(
    actor: AuthenticatedUser,
    sessionId: string,
    checkpointId: string,
    input: VisitCheckpointInput,
    meta: RequestMeta = {},
  ) {
    const session = await this.loadSession(sessionId);
    assertCanActOnOwnOrManagePatrol({
      actor,
      assignedUserId: session.assignedUserId,
      managePermission: PermissionCodes.PATROL_SESSIONS_ASSIGN,
    });

    if (
      session.status !== PatrolSessionStatus.IN_PROGRESS &&
      session.status !== PatrolSessionStatus.LATE
    ) {
      throw new ValidationError('يمكن تسجيل زيارة نقاط التفتيش فقط أثناء الجولة الجارية');
    }

    const onRoute = session.route.checkpoints.find((c) => c.checkpointId === checkpointId);
    if (!onRoute) {
      throw new ValidationError('نقطة التفتيش ليست ضمن مسار هذه الجولة');
    }

    if (input.qrCodeValue) {
      const expected = onRoute.checkpoint.qrCodeValue;
      if (input.qrCodeValue.trim() !== expected) {
        throw new ValidationError('قيمة رمز QR غير مطابقة لنقطة التفتيش');
      }
    }

    if (input.clientSyncId) {
      const existing = await prisma.patrolCheckpointVisit.findUnique({
        where: { clientSyncId: input.clientSyncId },
      });
      if (existing) return existing;
    }

    const existingVisit = await prisma.patrolCheckpointVisit.findUnique({
      where: {
        patrolSessionId_checkpointId: { patrolSessionId: sessionId, checkpointId },
      },
    });
    if (existingVisit) {
      throw new ValidationError('تم تسجيل زيارة نقطة التفتيش مسبقاً');
    }

    const visit = await prisma.patrolCheckpointVisit.create({
      data: {
        patrolSessionId: sessionId,
        checkpointId,
        visitedById: actor.id,
        verificationMethod: input.verificationMethod ?? PatrolVerificationMethod.MANUAL,
        mapX: input.mapX ?? null,
        mapY: input.mapY ?? null,
        notes: input.notes ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        status: input.status ?? PatrolVisitStatus.VERIFIED,
        clientSyncId: input.clientSyncId ?? null,
      },
      include: {
        checkpoint: { select: { id: true, code: true, name: true } },
      },
    });

    await this.detectAndMarkLate(sessionId);

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolCheckpointVisit',
      entityId: visit.id,
      metadata: { sessionId, checkpointId },
      meta,
    });

    broadcast('patrol:checkpoint-visited', {
      sessionId,
      checkpointId,
      visitId: visit.id,
    });
    broadcast('field-map:refresh', { reason: 'patrol:checkpoint-visited', sessionId });
    return visit;
  }

  async completeSession(
    actor: AuthenticatedUser,
    id: string,
    input: { notes?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const session = await this.loadSession(id);
    assertCanActOnOwnOrManagePatrol({
      actor,
      assignedUserId: session.assignedUserId,
      managePermission: PermissionCodes.PATROL_SESSIONS_ASSIGN,
    });

    if (
      session.status !== PatrolSessionStatus.IN_PROGRESS &&
      session.status !== PatrolSessionStatus.LATE
    ) {
      throw new ValidationError('يمكن إكمال الجولات الجارية أو المتأخرة فقط');
    }

    const requiredIds = session.route.checkpoints
      .filter((c) => c.isRequired)
      .map((c) => c.checkpointId);
    const visitedIds = session.visits.map((v) => v.checkpointId);
    const missed = missedRequiredCheckpoints({
      requiredCheckpointIds: requiredIds,
      visitedCheckpointIds: visitedIds,
    });

    const updated = await prisma.patrolSession.update({
      where: { id },
      data: {
        status: PatrolSessionStatus.COMPLETED,
        completedAt: new Date(),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: {
        route: { select: { id: true, name: true } },
        assignedUser: { select: userBriefSelect },
        visits: true,
      },
    });

    if (session.assignedUserId) {
      await prisma.user.update({
        where: { id: session.assignedUserId },
        data: { operationalStatus: OperationalStatus.ON_DUTY },
      });
    }

    for (const checkpointId of missed) {
      const cp = session.route.checkpoints.find((c) => c.checkpointId === checkpointId);
      const alert = await prisma.fieldAlert.create({
        data: {
          title: `نقطة تفتيش فائتة — ${cp?.checkpoint.name ?? checkpointId}`,
          description: `لم يتم زيارة نقطة التفتيش المطلوبة أثناء الجولة ${session.route.name}`,
          alertType: FieldAlertType.CHECKPOINT_MISSED,
          severity: FieldAlertSeverity.HIGH,
          patrolSessionId: id,
          assignedUserId: session.assignedUserId,
          assignedGroupId: session.groupId,
          createdById: actor.id,
        },
      });
      broadcast('field-alert:created', { alertId: alert.id, alertType: alert.alertType });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolSession',
      entityId: id,
      metadata: { action: 'complete', missedCheckpoints: missed },
      meta,
    });

    broadcast('patrol:completed', { sessionId: id, missedCheckpoints: missed });
    broadcast('field-map:refresh', { reason: 'patrol:completed', sessionId: id });
    return { ...updated, missedCheckpoints: missed };
  }

  async cancelSession(
    actor: AuthenticatedUser,
    id: string,
    input: { cancellationReason: string },
    meta: RequestMeta = {},
  ) {
    const session = await this.loadSession(id);
    if (
      session.status === PatrolSessionStatus.COMPLETED ||
      session.status === PatrolSessionStatus.CANCELLED
    ) {
      throw new ValidationError('الجلسة مكتملة أو ملغاة مسبقاً');
    }

    assertPatrolTransition(session.status, PatrolSessionStatus.CANCELLED);

    const updated = await prisma.patrolSession.update({
      where: { id },
      data: {
        status: PatrolSessionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.cancellationReason.trim(),
      },
    });

    if (
      session.assignedUserId &&
      (session.status === PatrolSessionStatus.IN_PROGRESS ||
        session.status === PatrolSessionStatus.LATE)
    ) {
      await prisma.user.update({
        where: { id: session.assignedUserId },
        data: { operationalStatus: OperationalStatus.ON_DUTY },
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatrolSession',
      entityId: id,
      metadata: { action: 'cancel', reason: input.cancellationReason },
      meta,
    });

    broadcast('field-map:refresh', { reason: 'patrol:cancelled', sessionId: id });
    return updated;
  }

  async detectAndMarkLate(sessionId: string) {
    const session = await prisma.patrolSession.findUnique({
      where: { id: sessionId },
      include: { route: true },
    });
    if (!session) return null;
    if (
      session.status !== PatrolSessionStatus.IN_PROGRESS &&
      session.status !== PatrolSessionStatus.ASSIGNED
    ) {
      return session;
    }

    const late = isPatrolLate({
      startedAt: session.startedAt,
      scheduledStartAt: session.scheduledStartAt,
      estimatedDurationMinutes: session.route.estimatedDurationMinutes,
      status: session.status,
    });

    if (!late) return session;

    const updated = await prisma.patrolSession.update({
      where: { id: sessionId },
      data: { status: PatrolSessionStatus.LATE },
    });

    const existingDelay = await prisma.fieldAlert.findFirst({
      where: {
        patrolSessionId: sessionId,
        alertType: FieldAlertType.PATROL_DELAY,
        status: {
          in: [
            FieldAlertStatus.NEW,
            FieldAlertStatus.ACKNOWLEDGED,
            FieldAlertStatus.IN_PROGRESS,
          ],
        },
      },
    });

    if (!existingDelay) {
      const creatorId = session.assignedById ?? session.assignedUserId;
      if (creatorId) {
        const alert = await prisma.fieldAlert.create({
          data: {
            title: `تأخير جولة — ${session.route.name}`,
            description: `تجاوزت الجولة المدة المقدّرة (${session.route.estimatedDurationMinutes} دقيقة)`,
            alertType: FieldAlertType.PATROL_DELAY,
            severity: FieldAlertSeverity.MEDIUM,
            patrolSessionId: sessionId,
            assignedUserId: session.assignedUserId,
            assignedGroupId: session.groupId,
            createdById: creatorId,
          },
        });
        broadcast('field-alert:created', { alertId: alert.id, alertType: alert.alertType });
      }
    }

    broadcast('patrol:delayed', { sessionId });
    broadcast('field-map:refresh', { reason: 'patrol:delayed', sessionId });
    return updated;
  }

  // ─── Personnel locations ───────────────────────────────────────

  async listPersonnel(query: PaginationQuery & { groupId?: string }) {
    const settings = await loadFieldOpsSettings();
    const activeGroupId = await shiftRosterService.getActiveGroupId();
    const groupId = query.groupId ?? activeGroupId;
    const now = new Date();

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        ...(groupId ? { groupId } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { employeeNumber: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        ...userBriefSelect,
        personnelLocations: {
          where: { isCurrent: true },
          take: 1,
          include: { zone: { select: { id: true, code: true, name: true, mapX: true, mapY: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => {
      const loc = u.personnelLocations[0] ?? null;
      return {
        ...u,
        personnelLocations: undefined,
        currentLocation: loc
          ? {
              ...loc,
              isFresh: isLocationFresh(loc.recordedAt, now, settings.locationFreshnessMinutes),
            }
          : null,
      };
    });
  }

  async getPersonnelLocation(userId: string) {
    const settings = await loadFieldOpsSettings();
    const loc = await prisma.personnelLocation.findFirst({
      where: { userId, isCurrent: true },
      include: {
        user: { select: userBriefSelect },
        zone: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
    if (!loc) throw new NotFoundError('لا يوجد موقع حالي لهذا المستخدم');
    return {
      ...loc,
      isFresh: isLocationFresh(loc.recordedAt, new Date(), settings.locationFreshnessMinutes),
    };
  }

  async updateSelfLocation(
    actor: AuthenticatedUser,
    input: LocationUpdateInput,
    meta: RequestMeta = {},
  ) {
    assertCanUpdatePersonnelLocation(actor, actor.id);
    return this.writeLocation(actor, actor.id, input, PersonnelLocationSource.MOBILE, meta);
  }

  async updateManualLocation(
    actor: AuthenticatedUser,
    userId: string,
    input: LocationUpdateInput,
    meta: RequestMeta = {},
  ) {
    assertCanUpdatePersonnelLocation(actor, userId);
    return this.writeLocation(
      actor,
      userId,
      input,
      input.source ?? PersonnelLocationSource.MANUAL,
      meta,
    );
  }

  private async writeLocation(
    actor: AuthenticatedUser,
    userId: string,
    input: LocationUpdateInput,
    source: PersonnelLocationSource,
    meta: RequestMeta,
  ) {
    const settings = await loadFieldOpsSettings();
    const throttleKey = `loc:${userId}`;
    const throttleMs = settings.locationUpdateThrottleSeconds * 1000;

    if (!locationRateLimiter.tryAcquire(throttleKey, new Date(), throttleMs)) {
      throw new ValidationError(
        `يُرجى الانتظار ${settings.locationUpdateThrottleSeconds} ثانية بين تحديثات الموقع`,
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundError('المستخدم غير موجود');

    if (input.zoneId) {
      const zone = await prisma.securityZone.findUnique({ where: { id: input.zoneId } });
      if (!zone) throw new NotFoundError('المنطقة غير موجودة');
    }

    const now = new Date();
    const expiresAt = locationExpiresAt(now, settings.locationRetentionDays);

    const location = await prisma.$transaction(async (tx) => {
      await tx.personnelLocation.updateMany({
        where: { userId, isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.personnelLocation.create({
        data: {
          userId,
          zoneId: input.zoneId ?? null,
          mapX: input.mapX,
          mapY: input.mapY,
          accuracy: input.accuracy ?? null,
          source,
          recordedAt: now,
          expiresAt,
          isCurrent: true,
        },
        include: {
          zone: { select: { id: true, code: true, name: true } },
          user: { select: userBriefSelect },
        },
      });
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PersonnelLocation',
      entityId: location.id,
      metadata: { userId, source, mapX: input.mapX, mapY: input.mapY },
      meta,
    });

    broadcast('personnel:location-updated', {
      userId,
      locationId: location.id,
      mapX: location.mapX,
      mapY: location.mapY,
      zoneId: location.zoneId,
    });
    broadcast('field-map:refresh', { reason: 'personnel:location-updated', userId });
    return location;
  }

  async getNearestPersonnel(incidentId: string) {
    const settings = await loadFieldOpsSettings();
    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, deletedAt: null },
      include: {
        zone: { select: { id: true, mapX: true, mapY: true } },
        checkpoint: { select: { id: true, mapX: true, mapY: true } },
      },
    });
    if (!incident) throw new NotFoundError('البلاغ غير موجود');

    let targetX = incident.mapX;
    let targetY = incident.mapY;
    if (targetX == null || targetY == null) {
      if (incident.checkpoint) {
        targetX = incident.checkpoint.mapX;
        targetY = incident.checkpoint.mapY;
      } else if (incident.zone) {
        targetX = incident.zone.mapX;
        targetY = incident.zone.mapY;
      }
    }
    if (targetX == null || targetY == null) {
      throw new ValidationError('البلاغ لا يحتوي على إحداثيات خريطة لتحديد أقرب الأفراد');
    }

    const activeGroupId = await shiftRosterService.getActiveGroupId();
    const now = new Date();

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        ...(activeGroupId ? { groupId: activeGroupId } : {}),
        operationalStatus: {
          in: [
            OperationalStatus.ON_DUTY,
            OperationalStatus.ON_PATROL,
            OperationalStatus.FIELD_TASK,
            OperationalStatus.WITH_CCTV,
          ],
        },
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        operationalStatus: true,
        personnelLocations: {
          where: { isCurrent: true },
          take: 1,
          include: { zone: { select: { mapX: true, mapY: true } } },
        },
      },
    });

    const candidates: NearestPersonnelCandidate[] = [];
    for (const u of users) {
      const loc = u.personnelLocations[0];
      if (!loc) continue;

      const fresh = isLocationFresh(loc.recordedAt, now, settings.locationFreshnessMinutes);
      if (fresh || !loc.zone) {
        candidates.push({
          userId: u.id,
          fullName: u.fullName,
          employeeNumber: u.employeeNumber,
          operationalStatus: u.operationalStatus,
          mapX: loc.mapX,
          mapY: loc.mapY,
          zoneId: loc.zoneId,
          recordedAt: loc.recordedAt,
          locationSource: 'personnel',
          isFresh: fresh,
        });
      } else {
        candidates.push({
          userId: u.id,
          fullName: u.fullName,
          employeeNumber: u.employeeNumber,
          operationalStatus: u.operationalStatus,
          mapX: loc.zone.mapX,
          mapY: loc.zone.mapY,
          zoneId: loc.zoneId,
          recordedAt: loc.recordedAt,
          locationSource: 'zone_fallback',
          isFresh: false,
        });
      }
    }

    const ranked = rankNearestPersonnel({ mapX: targetX, mapY: targetY }, candidates, 3);
    return {
      incidentId,
      target: { mapX: targetX, mapY: targetY },
      freshnessMinutes: settings.locationFreshnessMinutes,
      personnel: ranked,
    };
  }

  // ─── Field alerts ──────────────────────────────────────────────

  async listAlerts(
    query: PaginationQuery & {
      status?: FieldAlertStatus;
      alertType?: FieldAlertType;
      severity?: FieldAlertSeverity;
      assignedUserId?: string;
    },
  ) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.FieldAlertWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.alertType ? { alertType: query.alertType } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.fieldAlert.count({ where }),
      prisma.fieldAlert.findMany({
        where,
        include: {
          zone: { select: { id: true, code: true, name: true } },
          assignedUser: { select: { id: true, fullName: true, employeeNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: [{ createdAt: query.sortDir ?? 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async createAlert(actor: AuthenticatedUser, input: CreateAlertInput, meta: RequestMeta = {}) {
    const alert = await prisma.fieldAlert.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        alertType: input.alertType,
        severity: input.severity ?? FieldAlertSeverity.MEDIUM,
        zoneId: input.zoneId ?? null,
        assignedUserId: input.assignedUserId ?? null,
        assignedGroupId: input.assignedGroupId ?? null,
        incidentId: input.incidentId ?? null,
        patrolSessionId: input.patrolSessionId ?? null,
        mapX: input.mapX ?? null,
        mapY: input.mapY ?? null,
        createdById: actor.id,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'FieldAlert',
      entityId: alert.id,
      metadata: { alertType: alert.alertType, severity: alert.severity },
      meta,
    });

    broadcast('field-alert:created', { alertId: alert.id, alertType: alert.alertType });
    broadcast('field-map:refresh', { reason: 'field-alert:created', alertId: alert.id });
    return alert;
  }

  async createSos(actor: AuthenticatedUser, input: SosInput, meta: RequestMeta = {}) {
    if (!sosRateLimiter.tryAcquire(`sos:${actor.id}`)) {
      throw new ValidationError('تم إرسال نداء استغاثة مؤخراً — يُرجى الانتظار دقيقة');
    }

    const payload = buildSosAlertPayload({
      actorId: actor.id,
      actorName: actor.fullName,
      description: input.description,
      zoneId: input.zoneId,
      mapX: input.mapX,
      mapY: input.mapY,
    });

    const alert = await prisma.fieldAlert.create({
      data: {
        title: payload.title,
        description: payload.description,
        alertType: FieldAlertType.SOS,
        severity: FieldAlertSeverity.CRITICAL,
        zoneId: payload.zoneId,
        mapX: payload.mapX,
        mapY: payload.mapY,
        createdById: actor.id,
        assignedUserId: actor.id,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'FieldAlert',
      entityId: alert.id,
      metadata: { alertType: 'SOS', severity: 'CRITICAL' },
      meta,
    });

    broadcast('field-alert:created', { alertId: alert.id, alertType: 'SOS', severity: 'CRITICAL' });
    broadcast('field-map:refresh', { reason: 'sos', alertId: alert.id });
    return alert;
  }

  async acknowledgeAlert(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const alert = await prisma.fieldAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('التنبيه غير موجود');
    if (alert.status === FieldAlertStatus.RESOLVED || alert.status === FieldAlertStatus.CANCELLED) {
      throw new ValidationError('لا يمكن إقرار تنبيه محلول أو ملغى');
    }

    const updated = await prisma.fieldAlert.update({
      where: { id },
      data: {
        status: FieldAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'FieldAlert',
      entityId: id,
      metadata: { action: 'acknowledge' },
      meta,
    });
    broadcast('field-alert:updated', { alertId: id, status: updated.status });
    return updated;
  }

  async resolveAlert(
    actor: AuthenticatedUser,
    id: string,
    input: { resolutionNote: string },
    meta: RequestMeta = {},
  ) {
    const alert = await prisma.fieldAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('التنبيه غير موجود');
    if (alert.status === FieldAlertStatus.RESOLVED) {
      throw new ValidationError('التنبيه محلول مسبقاً');
    }

    const note = input.resolutionNote?.trim();
    if (!note) throw new ValidationError('ملاحظة الحل مطلوبة');
    if (alert.alertType === FieldAlertType.SOS && note.length < 3) {
      throw new ValidationError('يجب إدخال ملاحظة عند حل نداء الاستغاثة');
    }

    const updated = await prisma.fieldAlert.update({
      where: { id },
      data: {
        status: FieldAlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNote: note,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'FieldAlert',
      entityId: id,
      metadata: { action: 'resolve' },
      meta,
    });
    broadcast('field-alert:updated', { alertId: id, status: updated.status });
    return updated;
  }

  async cancelAlert(
    actor: AuthenticatedUser,
    id: string,
    input: { resolutionNote?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const alert = await prisma.fieldAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('التنبيه غير موجود');
    if (alert.alertType === FieldAlertType.SOS) {
      throw new ForbiddenError('لا يمكن إلغاء نداء الاستغاثة — يجب حله بملاحظة');
    }
    if (alert.status === FieldAlertStatus.RESOLVED || alert.status === FieldAlertStatus.CANCELLED) {
      throw new ValidationError('التنبيه محلول أو ملغى مسبقاً');
    }

    const updated = await prisma.fieldAlert.update({
      where: { id },
      data: {
        status: FieldAlertStatus.CANCELLED,
        resolutionNote: input.resolutionNote?.trim() ?? null,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'FieldAlert',
      entityId: id,
      metadata: { action: 'cancel' },
      meta,
    });
    broadcast('field-alert:updated', { alertId: id, status: updated.status });
    return updated;
  }
}

export const fieldOperationsService = new FieldOperationsService();

/** Exposed for unit tests (rate limiters). */
export const __fieldOpsRateLimiters = { locationRateLimiter, sosRateLimiter };
