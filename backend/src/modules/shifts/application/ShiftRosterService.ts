import {
  AuditAction,
  HandoverStepStatus,
  IncidentStatus,
  NotificationPriority,
  OperationalStatus,
  Prisma,
  ShiftGroupCode,
  ShiftKind,
  ShiftSessionStatus,
  UserStatus,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { prisma } from '../../../shared/database/prisma.js';
import { auditService } from '../../identity/application/AuditService.js';
import { notificationService } from '../../notifications/application/NotificationService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  ON_DUTY_OPERATIONAL_STATUSES,
  SHIFT_ENDING_ALERT_KEY,
  SHIFT_ENDING_ALERT_MS,
  SHIFT_GROUP_LABELS,
  SHIFT_GROUP_SEED,
  SHIFT_KIND_LABELS,
} from '../domain/constants.js';
import {
  ShiftCycleConfigFields,
  computeShiftWindow,
  getActiveKind,
  getCycleDay,
  getCycleEndDate,
  getGroupsForCycleDay,
  getZonedParts,
  msUntilShiftEnd,
} from '../domain/cycleEngine.js';

export interface UpdateCycleConfigInput {
  cycleStartDate?: Date;
  morningStartTime?: string;
  morningEndTime?: string;
  eveningStartTime?: string;
  eveningEndTime?: string;
  timezone?: string;
}

export interface HandoverInput {
  sessionId: string;
  outgoingSupervisorId: string;
  incomingSupervisorId: string;
  notes?: string | null;
  equipmentNotes?: string | null;
}

export interface ShiftStatisticsQuery {
  from?: Date;
  to?: Date;
}

type ShiftCycleConfigRow = Prisma.ShiftCycleConfigGetPayload<object>;

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function defaultStatsRange(query: ShiftStatisticsQuery): { from: Date; to: Date } {
  const to = query.to ? endOfDayUtc(query.to) : endOfDayUtc(new Date());
  const from = query.from
    ? startOfDayUtc(query.from)
    : startOfDayUtc(new Date(to.getTime() - 30 * 86_400_000));
  return { from, to };
}

class ShiftRosterService {
  async ensureConfig(): Promise<ShiftCycleConfigRow> {
    const existing = await prisma.shiftCycleConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const timezone = 'Asia/Riyadh';
    const now = new Date();
    const parts = getZonedParts(now, timezone);
    const cycleStartDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

    return prisma.shiftCycleConfig.create({
      data: {
        cycleStartDate,
        timezone,
      },
    });
  }

  async ensureGroups() {
    const groups = [];
    for (const seed of SHIFT_GROUP_SEED) {
      const group = await prisma.shiftGroup.upsert({
        where: { code: seed.code },
        create: {
          code: seed.code,
          nameAr: seed.nameAr,
          nameEn: seed.nameEn,
        },
        update: {
          nameAr: seed.nameAr,
          nameEn: seed.nameEn,
          deletedAt: null,
        },
      });
      groups.push(group);
    }
    return groups;
  }

  private async getConfigFields(): Promise<ShiftCycleConfigRow> {
    return this.ensureConfig();
  }

  private configAsFields(config: ShiftCycleConfigRow): ShiftCycleConfigFields {
    return {
      cycleStartDate: config.cycleStartDate,
      morningStartTime: config.morningStartTime,
      morningEndTime: config.morningEndTime,
      eveningStartTime: config.eveningStartTime,
      eveningEndTime: config.eveningEndTime,
      timezone: config.timezone,
    };
  }

  private async findGroupByCode(code: ShiftGroupCode) {
    await this.ensureGroups();
    const group = await prisma.shiftGroup.findFirst({
      where: { code, deletedAt: null },
    });
    if (!group) throw new NotFoundError(`Shift group ${code} not found`);
    return group;
  }

  async getActiveGroupId(now: Date = new Date()): Promise<string | null> {
    const config = await this.getConfigFields();
    const fields = this.configAsFields(config);
    const kind = getActiveKind(now, fields);
    const window = computeShiftWindow(kind, now, fields);
    const group = await this.findGroupByCode(window.groupCode);
    return group.id;
  }

  async isUserOnActiveDuty(userId: string, now: Date = new Date()): Promise<boolean> {
    const [user, activeGroupId] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { groupId: true, operationalStatus: true },
      }),
      this.getActiveGroupId(now),
    ]);

    if (!user || !activeGroupId || user.groupId !== activeGroupId) {
      return false;
    }

    return ON_DUTY_OPERATIONAL_STATUSES.includes(user.operationalStatus);
  }

  async isGroupResting(groupId: string | null | undefined, now: Date = new Date()): Promise<boolean> {
    if (!groupId) return true;
    const config = await this.getConfigFields();
    const cycleDay = getCycleDay(config.cycleStartDate, now, config.timezone);
    const groups = getGroupsForCycleDay(cycleDay);
    const group = await prisma.shiftGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { code: true },
    });
    if (!group) return true;
    return groups.resting.includes(group.code);
  }

  private async countPersonnel(groupId: string) {
    const [guardCount, supervisorCount] = await Promise.all([
      prisma.user.count({
        where: {
          groupId,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
          role: { code: RoleCodes.SECURITY_GUARD, deletedAt: null },
        },
      }),
      prisma.user.count({
        where: {
          groupId,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
          role: { code: RoleCodes.SECURITY_SUPERVISOR, deletedAt: null },
        },
      }),
    ]);
    return { guardCount, supervisorCount };
  }

  private async getSessionForWindow(kind: ShiftKind, now: Date, config: ShiftCycleConfigRow) {
    const fields = this.configAsFields(config);
    const window = computeShiftWindow(kind, now, fields);
    const group = await this.findGroupByCode(window.groupCode);

    const session = await prisma.shiftSession.findFirst({
      where: {
        kind,
        startsAt: window.startsAt,
      },
      include: {
        group: true,
        handover: true,
      },
    });

    return { window, group, session };
  }

  private buildShiftCard(
    kind: ShiftKind,
    window: ReturnType<typeof computeShiftWindow>,
    group: { id: string; code: ShiftGroupCode; nameAr: string; nameEn: string },
    session: { status: ShiftSessionStatus } | null,
    counts: { guardCount: number; supervisorCount: number },
    activeKind: ShiftKind,
    now: Date,
  ) {
    const isActive = kind === activeKind && now >= window.startsAt && now < window.endsAt;
    return {
      kind,
      kindLabel: SHIFT_KIND_LABELS[kind],
      group: {
        id: group.id,
        code: group.code,
        nameAr: group.nameAr,
        nameEn: group.nameEn,
        label: SHIFT_GROUP_LABELS[group.code],
      },
      guardCount: counts.guardCount,
      supervisorCount: counts.supervisorCount,
      status: session?.status ?? ShiftSessionStatus.OPEN,
      isActive,
      window: {
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        serviceDate: window.serviceDate,
        cycleDay: window.cycleDay,
      },
    };
  }

  async ensureCurrentSessions(now: Date = new Date()) {
    const config = await this.getConfigFields();
    await this.ensureGroups();

    const sessions = [];
    for (const kind of [ShiftKind.MORNING, ShiftKind.EVENING] as const) {
      const { window, group, session } = await this.getSessionForWindow(kind, now, config);

      if (session) {
        sessions.push(session);
        continue;
      }

      const created = await prisma.shiftSession.create({
        data: {
          kind,
          groupId: group.id,
          cycleDay: window.cycleDay,
          serviceDate: window.serviceDate,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          status: ShiftSessionStatus.OPEN,
        },
        include: { group: true, handover: true },
      });
      sessions.push(created);
    }

    return sessions;
  }

  async getOverview(now: Date = new Date()) {
    const config = await this.getConfigFields();
    const fields = this.configAsFields(config);
    await this.ensureCurrentSessions(now);

    const activeKind = getActiveKind(now, fields);
    const activeWindow = computeShiftWindow(activeKind, now, fields);
    const cycleDay = getCycleDay(config.cycleStartDate, now, config.timezone);
    const cycleGroups = getGroupsForCycleDay(cycleDay);

    const [morningData, eveningData, groups] = await Promise.all([
      this.getSessionForWindow(ShiftKind.MORNING, now, config),
      this.getSessionForWindow(ShiftKind.EVENING, now, config),
      prisma.shiftGroup.findMany({
        where: { deletedAt: null },
        orderBy: { code: 'asc' },
      }),
    ]);

    const [morningCounts, eveningCounts] = await Promise.all([
      this.countPersonnel(morningData.group.id),
      this.countPersonnel(eveningData.group.id),
    ]);

    const nextGroup = await this.findGroupByCode(activeWindow.nextGroupCode);

    return {
      morning: this.buildShiftCard(
        ShiftKind.MORNING,
        morningData.window,
        morningData.group,
        morningData.session,
        morningCounts,
        activeKind,
        now,
      ),
      evening: this.buildShiftCard(
        ShiftKind.EVENING,
        eveningData.window,
        eveningData.group,
        eveningData.session,
        eveningCounts,
        activeKind,
        now,
      ),
      groups: groups.map((g) => ({
        id: g.id,
        code: g.code,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        label: SHIFT_GROUP_LABELS[g.code],
      })),
      cycleStart: config.cycleStartDate,
      cycleEnd: getCycleEndDate(config.cycleStartDate, config.timezone),
      currentCycleDay: cycleDay,
      activeKind,
      activeKindLabel: SHIFT_KIND_LABELS[activeKind],
      msRemainingToSwitch: msUntilShiftEnd(activeWindow.endsAt, now),
      restingGroups: cycleGroups.resting.map((code) => ({
        code,
        label: SHIFT_GROUP_LABELS[code],
      })),
      nextGroup: {
        id: nextGroup.id,
        code: nextGroup.code,
        nameAr: nextGroup.nameAr,
        nameEn: nextGroup.nameEn,
        label: SHIFT_GROUP_LABELS[nextGroup.code],
      },
      config: {
        morningStartTime: config.morningStartTime,
        morningEndTime: config.morningEndTime,
        eveningStartTime: config.eveningStartTime,
        eveningEndTime: config.eveningEndTime,
        timezone: config.timezone,
      },
    };
  }

  async getOpsBoard(now: Date = new Date()) {
    const overview = await this.getOverview(now);
    const activeShift = overview.activeKind === ShiftKind.MORNING ? overview.morning : overview.evening;
    const groupId = activeShift.group.id;

    const [
      onDutyCount,
      onTaskCount,
      availableCount,
      activeIncidents,
      criticalIncidents,
      responseAgg,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          groupId,
          deletedAt: null,
          operationalStatus: { in: ON_DUTY_OPERATIONAL_STATUSES },
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
      }),
      prisma.user.count({
        where: {
          groupId,
          deletedAt: null,
          operationalStatus: {
            in: [
              OperationalStatus.ON_PATROL,
              OperationalStatus.HANDLING_INCIDENT,
              OperationalStatus.FIELD_TASK,
              OperationalStatus.WITH_CCTV,
            ],
          },
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
      }),
      prisma.user.count({
        where: {
          groupId,
          deletedAt: null,
          operationalStatus: OperationalStatus.ON_DUTY,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
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
      prisma.incident.count({
        where: {
          deletedAt: null,
          severity: 'CRITICAL',
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
      prisma.responseTime.aggregate({
        where: {
          endedAt: { not: null },
          durationMs: { not: null },
          startedAt: {
            gte: activeShift.window.startsAt,
            lte: activeShift.window.endsAt,
          },
        },
        _avg: { durationMs: true },
      }),
    ]);

    return {
      morning: {
        group: overview.morning.group,
        isActive: overview.morning.isActive,
        status: overview.morning.status,
        guardCount: overview.morning.guardCount,
        supervisorCount: overview.morning.supervisorCount,
      },
      evening: {
        group: overview.evening.group,
        isActive: overview.evening.isActive,
        status: overview.evening.status,
        guardCount: overview.evening.guardCount,
        supervisorCount: overview.evening.supervisorCount,
      },
      activeKind: overview.activeKind,
      activeKindLabel: overview.activeKindLabel,
      activeGroup: activeShift.group,
      nextGroup: overview.nextGroup,
      restingGroups: overview.restingGroups,
      onDutyCount,
      onTaskCount,
      availableCount,
      activeIncidents,
      criticalIncidents,
      averageResponseMs: responseAgg._avg.durationMs,
      msRemainingToSwitch: overview.msRemainingToSwitch,
      currentCycleDay: overview.currentCycleDay,
      cycleStart: overview.cycleStart,
      cycleEnd: overview.cycleEnd,
      sessionStatus: activeShift.status,
      guardCount: activeShift.guardCount,
      supervisorCount: activeShift.supervisorCount,
    };
  }

  async listOnDutyPersonnel(roleCodes?: string[], now: Date = new Date()) {
    const activeGroupId = await this.getActiveGroupId(now);
    if (!activeGroupId) return [];

    const where: Prisma.UserWhereInput = {
      groupId: activeGroupId,
      deletedAt: null,
      status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
      operationalStatus: { in: ON_DUTY_OPERATIONAL_STATUSES },
      ...(roleCodes?.length
        ? { role: { code: { in: roleCodes }, deletedAt: null } }
        : {}),
    };

    return prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        operationalStatus: true,
        jobTitle: true,
        role: { select: { code: true, nameAr: true, nameEn: true } },
        group: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      },
    });
  }

  async listAssignableGuards(actor: AuthenticatedUser, now: Date = new Date()) {
    const config = await this.getConfigFields();
    const fields = this.configAsFields(config);
    const cycleDay = getCycleDay(config.cycleStartDate, now, config.timezone);
    const cycleGroups = getGroupsForCycleDay(cycleDay);
    const activeKind = getActiveKind(now, fields);
    const activeWindow = computeShiftWindow(activeKind, now, fields);

    const allowedCodes =
      actor.roleCode === RoleCodes.SECURITY_DIRECTOR
        ? [activeWindow.groupCode, ...cycleGroups.resting]
        : [activeWindow.groupCode];

    const groups = await prisma.shiftGroup.findMany({
      where: { code: { in: allowedCodes }, deletedAt: null },
      select: { id: true },
    });
    const groupIds = groups.map((g) => g.id);
    if (!groupIds.length) return [];

    return prisma.user.findMany({
      where: {
        groupId: { in: groupIds },
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        role: {
          code: {
            in: [RoleCodes.SECURITY_GUARD, RoleCodes.SECURITY_SUPERVISOR],
          },
          deletedAt: null,
        },
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        operationalStatus: true,
        role: { select: { code: true, nameAr: true } },
        group: { select: { id: true, code: true, nameAr: true } },
      },
    });
  }

  async setOperationalStatus(
    actor: AuthenticatedUser,
    userId: string,
    status: OperationalStatus,
    meta: RequestMeta = {},
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { operationalStatus: status },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        operationalStatus: true,
        groupId: true,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      metadata: { operationalStatus: status },
      meta,
    });

    broadcast('shifts:refresh', { reason: 'operational_status', userId });
    broadcast('dashboard:refresh', { reason: 'shifts:operational_status' });

    return updated;
  }

  async updateCycleConfig(
    actor: AuthenticatedUser,
    input: UpdateCycleConfigInput,
    meta: RequestMeta = {},
  ) {
    const config = await this.ensureConfig();

    const updated = await prisma.shiftCycleConfig.update({
      where: { id: config.id },
      data: {
        ...(input.cycleStartDate !== undefined ? { cycleStartDate: input.cycleStartDate } : {}),
        ...(input.morningStartTime !== undefined ? { morningStartTime: input.morningStartTime } : {}),
        ...(input.morningEndTime !== undefined ? { morningEndTime: input.morningEndTime } : {}),
        ...(input.eveningStartTime !== undefined ? { eveningStartTime: input.eveningStartTime } : {}),
        ...(input.eveningEndTime !== undefined ? { eveningEndTime: input.eveningEndTime } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ShiftCycleConfig',
      entityId: updated.id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    broadcast('shifts:refresh', { reason: 'cycle_config' });
    broadcast('dashboard:refresh', { reason: 'shifts:cycle_config' });

    return updated;
  }

  async getOrCreateHandover(sessionId: string, outgoingId: string, incomingId: string) {
    const session = await prisma.shiftSession.findUnique({
      where: { id: sessionId },
      include: { handover: true },
    });
    if (!session) throw new NotFoundError('Shift session not found');

    if (session.handover) {
      return prisma.shiftHandover.update({
        where: { id: session.handover.id },
        data: {
          outgoingSupervisorId: outgoingId,
          incomingSupervisorId: incomingId,
        },
        include: {
          outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          session: { include: { group: true } },
        },
      });
    }

    const stats = await this.computeSessionStats(session.startsAt, session.endsAt);

    return prisma.shiftHandover.create({
      data: {
        sessionId,
        outgoingSupervisorId: outgoingId,
        incomingSupervisorId: incomingId,
        openIncidentsCount: stats.openIncidents,
        closedIncidentsCount: stats.closedIncidents,
        patrolsCount: stats.patrols,
        violationsCount: stats.violations,
      },
      include: {
        outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        session: { include: { group: true } },
      },
    });
  }

  async upsertHandover(
    actor: AuthenticatedUser,
    input: HandoverInput,
    meta: RequestMeta = {},
  ) {
    const handover = await this.getOrCreateHandover(
      input.sessionId,
      input.outgoingSupervisorId,
      input.incomingSupervisorId,
    );

    const stats = await this.computeSessionStats(
      handover.session.startsAt,
      handover.session.endsAt,
    );

    const updated = await prisma.shiftHandover.update({
      where: { id: handover.id },
      data: {
        notes: input.notes ?? handover.notes,
        equipmentNotes:
          input.equipmentNotes !== undefined ? input.equipmentNotes : handover.equipmentNotes,
        openIncidentsCount: stats.openIncidents,
        closedIncidentsCount: stats.closedIncidents,
        patrolsCount: stats.patrols,
        violationsCount: stats.violations,
      },
      include: {
        outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        session: { include: { group: true } },
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ShiftHandover',
      entityId: updated.id,
      meta,
    });

    broadcast('shifts:refresh', { reason: 'handover' });

    return updated;
  }

  async approveHandover(actor: AuthenticatedUser, handoverId: string, meta: RequestMeta = {}) {
    const handover = await prisma.shiftHandover.findUnique({
      where: { id: handoverId },
      include: { session: true },
    });
    if (!handover) throw new NotFoundError('Handover not found');

    if (handover.handoverStatus === HandoverStepStatus.APPROVED) {
      throw new ValidationError('Handover already approved');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.shiftHandover.update({
        where: { id: handoverId },
        data: {
          handoverStatus: HandoverStepStatus.APPROVED,
          handoverApprovedAt: new Date(),
          handoverApprovedById: actor.id,
        },
        include: {
          outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          session: { include: { group: true } },
        },
      });

      await tx.shiftSession.update({
        where: { id: handover.sessionId },
        data: { status: ShiftSessionStatus.HANDOVER_PENDING },
      });

      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ShiftHandover',
      entityId: handoverId,
      metadata: { step: 'handover' },
      meta,
    });

    broadcast('shifts:refresh', { reason: 'handover_approved' });

    return updated;
  }

  async approveTakeover(actor: AuthenticatedUser, handoverId: string, meta: RequestMeta = {}) {
    const handover = await prisma.shiftHandover.findUnique({
      where: { id: handoverId },
      include: { session: true },
    });
    if (!handover) throw new NotFoundError('Handover not found');

    if (handover.handoverStatus !== HandoverStepStatus.APPROVED) {
      throw new ValidationError('Outgoing handover must be approved first');
    }

    if (handover.takeoverStatus === HandoverStepStatus.APPROVED) {
      throw new ValidationError('Takeover already approved');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.shiftHandover.update({
        where: { id: handoverId },
        data: {
          takeoverStatus: HandoverStepStatus.APPROVED,
          takeoverApprovedAt: new Date(),
          takeoverApprovedById: actor.id,
        },
        include: {
          outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
          session: { include: { group: true } },
        },
      });

      await tx.shiftSession.update({
        where: { id: handover.sessionId },
        data: {
          status: ShiftSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ShiftHandover',
      entityId: handoverId,
      metadata: { step: 'takeover' },
      meta,
    });

    broadcast('shifts:refresh', { reason: 'takeover_approved' });
    broadcast('dashboard:refresh', { reason: 'shifts:takeover' });

    return updated;
  }

  private async computeSessionStats(from: Date, to: Date) {
    const now = new Date();
    const windowEnd = to > now ? now : to;

    const [openIncidents, closedIncidents, patrols, violations, complaints, responseAgg] =
      await Promise.all([
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
            createdAt: { gte: from, lte: windowEnd },
          },
        }),
        prisma.incident.count({
          where: {
            deletedAt: null,
            status: IncidentStatus.CLOSED,
            closedAt: { gte: from, lte: windowEnd },
          },
        }),
        prisma.patrol.count({
          where: {
            deletedAt: null,
            scheduledAt: { gte: from, lte: windowEnd },
          },
        }),
        prisma.vehicleViolation.count({
          where: {
            deletedAt: null,
            detectedAt: { gte: from, lte: windowEnd },
          },
        }),
        prisma.complaint.count({
          where: {
            deletedAt: null,
            createdAt: { gte: from, lte: windowEnd },
          },
        }),
        prisma.responseTime.aggregate({
          where: {
            incidentId: { not: null },
            durationMs: { not: null },
            endedAt: { gte: from, lte: windowEnd },
          },
          _avg: { durationMs: true },
          _min: { durationMs: true },
          _max: { durationMs: true },
        }),
      ]);

    return {
      openIncidents,
      closedIncidents,
      patrols,
      violations,
      complaints,
      averageResponseMs: responseAgg._avg.durationMs,
      fastestResponseMs: responseAgg._min.durationMs,
      slowestResponseMs: responseAgg._max.durationMs,
    };
  }

  async getHandoverBoard(now: Date = new Date()) {
    const config = await this.getConfigFields();
    const fields = this.configAsFields(config);
    const activeKind = getActiveKind(now, fields);
    const activeWindow = computeShiftWindow(activeKind, now, fields);
    const nextGroup = await this.findGroupByCode(activeWindow.nextGroupCode);

    await this.ensureCurrentSessions(now);

    const session = await prisma.shiftSession.findFirst({
      where: {
        kind: activeKind,
        startsAt: activeWindow.startsAt,
      },
      include: {
        group: true,
        handover: {
          include: {
            outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
            incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
            handoverApprovedBy: { select: { id: true, fullName: true } },
            takeoverApprovedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const history = await prisma.shiftHandover.findMany({
      where: {
        OR: [
          { takeoverStatus: HandoverStepStatus.APPROVED },
          { handoverStatus: HandoverStepStatus.APPROVED },
        ],
      },
      include: {
        session: { include: { group: true } },
        outgoingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        incomingSupervisor: { select: { id: true, fullName: true, employeeNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    if (!session) {
      return {
        session: null,
        handover: null,
        stats: null,
        outgoingGroup: null,
        incomingGroup: {
          id: nextGroup.id,
          code: nextGroup.code,
          nameAr: nextGroup.nameAr,
          nameEn: nextGroup.nameEn,
          label: SHIFT_GROUP_LABELS[nextGroup.code],
        },
        history: history.map((row) => this.mapHandoverHistoryItem(row)),
      };
    }

    const stats = await this.computeSessionStats(session.startsAt, session.endsAt);
    const groupRef = {
      id: session.group.id,
      code: session.group.code,
      nameAr: session.group.nameAr,
      nameEn: session.group.nameEn,
      label: SHIFT_GROUP_LABELS[session.group.code],
    };

    return {
      session: {
        id: session.id,
        kind: session.kind,
        kindLabel: SHIFT_KIND_LABELS[session.kind],
        status: session.status,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        msRemaining: msUntilShiftEnd(session.endsAt, now),
        group: groupRef,
      },
      outgoingGroup: groupRef,
      incomingGroup: {
        id: nextGroup.id,
        code: nextGroup.code,
        nameAr: nextGroup.nameAr,
        nameEn: nextGroup.nameEn,
        label: SHIFT_GROUP_LABELS[nextGroup.code],
      },
      handover: session.handover,
      stats,
      history: history.map((row) => this.mapHandoverHistoryItem(row)),
    };
  }

  private mapHandoverHistoryItem(row: {
    id: string;
    notes: string | null;
    equipmentNotes?: string | null;
    openIncidentsCount: number;
    closedIncidentsCount: number;
    patrolsCount: number;
    violationsCount: number;
    handoverStatus: HandoverStepStatus;
    takeoverStatus: HandoverStepStatus;
    handoverApprovedAt: Date | null;
    takeoverApprovedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    outgoingSupervisor: { id: string; fullName: string; employeeNumber: string };
    incomingSupervisor: { id: string; fullName: string; employeeNumber: string };
    session: {
      kind: ShiftKind;
      startsAt: Date;
      endsAt: Date;
      status: ShiftSessionStatus;
      group: { id: string; code: ShiftGroupCode; nameAr: string; nameEn: string };
    };
  }) {
    return {
      id: row.id,
      notes: row.notes,
      equipmentNotes: row.equipmentNotes ?? null,
      openIncidentsCount: row.openIncidentsCount,
      closedIncidentsCount: row.closedIncidentsCount,
      patrolsCount: row.patrolsCount,
      violationsCount: row.violationsCount,
      handoverStatus: row.handoverStatus,
      takeoverStatus: row.takeoverStatus,
      handoverApprovedAt: row.handoverApprovedAt,
      takeoverApprovedAt: row.takeoverApprovedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      outgoingSupervisor: row.outgoingSupervisor,
      incomingSupervisor: row.incomingSupervisor,
      session: {
        kind: row.session.kind,
        kindLabel: SHIFT_KIND_LABELS[row.session.kind],
        startsAt: row.session.startsAt,
        endsAt: row.session.endsAt,
        status: row.session.status,
        group: {
          id: row.session.group.id,
          code: row.session.group.code,
          nameAr: row.session.group.nameAr,
          nameEn: row.session.group.nameEn,
          label: SHIFT_GROUP_LABELS[row.session.group.code],
        },
      },
    };
  }

  async getShiftStatistics(query: ShiftStatisticsQuery = {}) {
    const { from, to } = defaultStatsRange(query);

    const sessions = await prisma.shiftSession.findMany({
      where: {
        startsAt: { gte: from, lte: to },
      },
      include: { group: true },
      orderBy: { startsAt: 'desc' },
    });

    const rows = [];
    for (const session of sessions) {
      const stats = await this.computeSessionStats(session.startsAt, session.endsAt);
      const personnel = await this.countPersonnel(session.groupId);
      const totalIncidents = stats.openIncidents + stats.closedIncidents;
      const closureRate = totalIncidents > 0 ? stats.closedIncidents / totalIncidents : 1;
      const responseScore =
        stats.averageResponseMs != null
          ? Math.max(0, 100 - Math.round(stats.averageResponseMs / 60_000))
          : 100;
      const performanceScore = Math.round(closureRate * 60 + responseScore * 0.4);

      rows.push({
        sessionId: session.id,
        kind: session.kind,
        kindLabel: SHIFT_KIND_LABELS[session.kind],
        group: {
          id: session.group.id,
          code: session.group.code,
          nameAr: session.group.nameAr,
          nameEn: session.group.nameEn,
          label: SHIFT_GROUP_LABELS[session.group.code],
        },
        cycleDay: session.cycleDay,
        serviceDate: session.serviceDate,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        openIncidents: stats.openIncidents,
        closedIncidents: stats.closedIncidents,
        patrols: stats.patrols,
        violations: stats.violations,
        complaints: stats.complaints,
        averageResponseMs: stats.averageResponseMs,
        fastestResponseMs: stats.fastestResponseMs,
        slowestResponseMs: stats.slowestResponseMs,
        guardCount: personnel.guardCount,
        supervisorCount: personnel.supervisorCount,
        performanceScore,
      });
    }

    const totals = rows.reduce(
      (acc, row) => {
        acc.sessions += 1;
        acc.openIncidents += row.openIncidents;
        acc.closedIncidents += row.closedIncidents;
        acc.patrols += row.patrols;
        acc.violations += row.violations;
        acc.complaints += row.complaints;
        if (row.averageResponseMs != null) {
          acc.responseSum += row.averageResponseMs;
          acc.responseCount += 1;
        }
        acc.performanceSum += row.performanceScore;
        return acc;
      },
      {
        sessions: 0,
        openIncidents: 0,
        closedIncidents: 0,
        patrols: 0,
        violations: 0,
        complaints: 0,
        responseSum: 0,
        responseCount: 0,
        performanceSum: 0,
      },
    );

    return {
      range: { from, to },
      totals: {
        sessions: totals.sessions,
        openIncidents: totals.openIncidents,
        closedIncidents: totals.closedIncidents,
        patrols: totals.patrols,
        violations: totals.violations,
        complaints: totals.complaints,
        averageResponseMs:
          totals.responseCount > 0 ? Math.round(totals.responseSum / totals.responseCount) : null,
        averagePerformanceScore:
          totals.sessions > 0 ? Math.round(totals.performanceSum / totals.sessions) : null,
      },
      sessions: rows,
    };
  }

  async checkAndSendEndingAlerts(now: Date = new Date()) {
    await this.ensureCurrentSessions(now);
    const config = await this.getConfigFields();
    const fields = this.configAsFields(config);

    const openSessions = await prisma.shiftSession.findMany({
      where: {
        status: { in: [ShiftSessionStatus.OPEN, ShiftSessionStatus.HANDOVER_PENDING] },
        endsAt: { gt: now },
      },
      include: { group: true, alerts: true },
    });

    let alertsSent = 0;

    for (const session of openSessions) {
      const remaining = msUntilShiftEnd(session.endsAt, now);
      if (remaining > SHIFT_ENDING_ALERT_MS || remaining <= 0) continue;

      const alreadySent = session.alerts.some((a) => a.alertKey === SHIFT_ENDING_ALERT_KEY);
      if (alreadySent) continue;

      const window = computeShiftWindow(session.kind, now, fields);
      const nextGroup = await this.findGroupByCode(window.nextGroupCode);

      const recipientIds = new Set<string>();

      const currentMembers = await prisma.user.findMany({
        where: {
          groupId: session.groupId,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
        select: { id: true },
      });
      currentMembers.forEach((u) => recipientIds.add(u.id));

      const nextMembers = await prisma.user.findMany({
        where: {
          groupId: nextGroup.id,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
        select: { id: true },
      });
      nextMembers.forEach((u) => recipientIds.add(u.id));

      const supervisors = await prisma.user.findMany({
        where: {
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
          role: { code: RoleCodes.SECURITY_SUPERVISOR, deletedAt: null },
        },
        select: { id: true },
      });
      supervisors.forEach((u) => recipientIds.add(u.id));

      const kindLabel = SHIFT_KIND_LABELS[session.kind].nameAr;
      const minutesLeft = Math.ceil(remaining / 60_000);

      for (const userId of recipientIds) {
        await notificationService.create({
          userId,
          title: 'اقتراب انتهاء الوردية',
          body: `تبقى ${minutesLeft} دقيقة على انتهاء ${kindLabel} (${session.group.nameAr}).`,
          priority: NotificationPriority.HIGH,
          entityType: 'ShiftSession',
          entityId: session.id,
        });
      }

      await prisma.shiftAlertLog.create({
        data: {
          sessionId: session.id,
          alertKey: SHIFT_ENDING_ALERT_KEY,
        },
      });

      alertsSent += 1;
    }

    if (alertsSent > 0) {
      broadcast('dashboard:refresh', { reason: 'shifts:ending_alert' });
      broadcast('shifts:refresh', { reason: 'ending_alert' });
    }

    return { alertsSent };
  }

  async assertAssigneeAllowed(actor: AuthenticatedUser, assigneeId: string) {
    const user = await prisma.user.findFirst({
      where: { id: assigneeId, deletedAt: null },
      select: { groupId: true },
    });
    if (!user) throw new NotFoundError('Assignee not found');

    if (actor.roleCode === RoleCodes.SECURITY_DIRECTOR) return;

    const resting = await this.isGroupResting(user.groupId);
    if (resting) {
      throw new ForbiddenError('Cannot assign personnel from a resting shift group');
    }
  }
}

export const shiftRosterService = new ShiftRosterService();
