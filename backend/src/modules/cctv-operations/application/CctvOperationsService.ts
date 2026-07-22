import {
  AuditAction,
  NotificationPriority,
  OperationalStatus,
  PermitImportance,
  PermitShareStatus,
  Prisma,
  ReferralAttachmentType,
  ReferralResponseType,
  ReferralUpdateType,
  SecurityPermitStatus,
  SecurityPermitType,
  SecurityReferralSeverity,
  SecurityReferralStatus,
  SecurityReferralType,
  UserStatus,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast, emitToUser } from '../../../shared/realtime/socketServer.js';
import { prisma } from '../../../shared/database/prisma.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { notificationService } from '../../notifications/application/NotificationService.js';
import { shiftRosterService } from '../../shifts/application/ShiftRosterService.js';
import { InMemoryRateLimiter } from '../../field-operations/application/fieldOpsHelpers.js';
import { saveCctvOperationFile, readCctvOperationFile } from './CctvOperationsStorage.js';
import { nextPermitNumber, nextReferralNumber } from './numbering.js';
import {
  assertCctvCannotClose,
  assertCctvCannotOverwriteResolution,
  assertPermitDateRange,
  assertReferralTransition,
  canCancelBeforeReceive,
  maskNationalId,
} from './referralHelpers.js';
import { loadEscalationSettings, shouldEscalateUnreceived } from './escalationPolicy.js';

const uploadLimiter = new InMemoryRateLimiter(5_000);
const sendLimiter = new InMemoryRateLimiter(3_000);

const userBrief = {
  id: true,
  fullName: true,
  employeeNumber: true,
  operationalStatus: true,
  role: { select: { code: true, nameAr: true } },
  group: { select: { id: true, code: true, nameAr: true } },
} as const;

function paginate(query: { page?: number; pageSize?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function hasPerm(actor: AuthenticatedUser, code: string) {
  return actor.permissions.includes(code);
}

class CctvOperationsService {
  private async addTimeline(
    referralId: string,
    userId: string,
    updateType: ReferralUpdateType,
    opts: {
      message?: string | null;
      oldStatus?: SecurityReferralStatus | null;
      newStatus?: SecurityReferralStatus | null;
      attachmentId?: string | null;
    } = {},
  ) {
    return prisma.securityReferralUpdate.create({
      data: {
        referralId,
        userId,
        updateType,
        message: opts.message ?? null,
        oldStatus: opts.oldStatus ?? null,
        newStatus: opts.newStatus ?? null,
        attachmentId: opts.attachmentId ?? null,
      },
    });
  }

  private serializePermit(permit: Record<string, unknown>, actor: AuthenticatedUser) {
    const canSensitive = hasPerm(actor, PermissionCodes.PERMITS_VIEW_SENSITIVE);
    return {
      ...permit,
      nationalId: maskNationalId(permit.nationalId as string | null, canSensitive),
    };
  }

  async getDashboard(actor: AuthenticatedUser) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const activeGroupId = await shiftRosterService.getActiveGroupId();
    const opsBoard = await shiftRosterService.getOpsBoard();

    const [
      activePermitsToday,
      newPermits,
      unackedShares,
      newReferrals,
      sentReferrals,
      receivedReferrals,
      inProgressReferrals,
      criticalReferrals,
      resolvedToday,
      openReferrals,
      delayedReferrals,
      recentPermits,
      recentReferrals,
    ] = await Promise.all([
      prisma.securityPermit.count({
        where: { deletedAt: null, status: SecurityPermitStatus.ACTIVE, createdAt: { gte: dayStart } },
      }),
      prisma.securityPermit.count({
        where: { deletedAt: null, status: SecurityPermitStatus.DRAFT },
      }),
      prisma.permitShare.count({
        where: { status: { in: [PermitShareStatus.SENT, PermitShareStatus.DELIVERED, PermitShareStatus.VIEWED] } },
      }),
      prisma.securityReferral.count({ where: { deletedAt: null, status: SecurityReferralStatus.NEW } }),
      prisma.securityReferral.count({ where: { deletedAt: null, status: SecurityReferralStatus.SENT } }),
      prisma.securityReferral.count({ where: { deletedAt: null, status: SecurityReferralStatus.RECEIVED } }),
      prisma.securityReferral.count({
        where: { deletedAt: null, status: SecurityReferralStatus.IN_PROGRESS },
      }),
      prisma.securityReferral.count({
        where: {
          deletedAt: null,
          severity: SecurityReferralSeverity.CRITICAL,
          status: { notIn: [SecurityReferralStatus.CLOSED, SecurityReferralStatus.CANCELLED, SecurityReferralStatus.REJECTED] },
        },
      }),
      prisma.securityReferral.count({
        where: {
          deletedAt: null,
          status: { in: [SecurityReferralStatus.RESOLVED, SecurityReferralStatus.CLOSED] },
          resolvedAt: { gte: dayStart },
        },
      }),
      prisma.securityReferral.findMany({
        where: {
          deletedAt: null,
          status: {
            in: [
              SecurityReferralStatus.NEW,
              SecurityReferralStatus.SENT,
              SecurityReferralStatus.RECEIVED,
              SecurityReferralStatus.IN_PROGRESS,
              SecurityReferralStatus.ESCALATED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          createdBy: { select: userBrief },
          assignedUser: { select: userBrief },
          zone: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.securityReferral.findMany({
        where: {
          deletedAt: null,
          OR: [
            {
              status: SecurityReferralStatus.SENT,
              assignedAt: { lt: new Date(Date.now() - 5 * 60_000) },
            },
            { status: SecurityReferralStatus.ESCALATED },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          createdBy: { select: userBrief },
          assignedUser: { select: userBrief },
        },
      }),
      prisma.securityPermit.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { createdBy: { select: userBrief } },
      }),
      prisma.securityReferral.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          createdBy: { select: userBrief },
          assignedUser: { select: userBrief },
        },
      }),
    ]);

    const availablePersonnel = activeGroupId
      ? await prisma.user.findMany({
          where: {
            deletedAt: null,
            groupId: activeGroupId,
            status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
            operationalStatus: {
              in: [
                OperationalStatus.ON_DUTY,
                OperationalStatus.ON_PATROL,
                OperationalStatus.FIELD_TASK,
                OperationalStatus.WITH_CCTV,
              ],
            },
          },
          select: userBrief,
          take: 20,
        })
      : [];

    return {
      actorRole: actor.roleCode,
      workingGroup: opsBoard.activeGroup,
      currentShift: {
        kind: opsBoard.activeKind,
        kindLabel: opsBoard.activeKindLabel,
        group: opsBoard.activeGroup,
      },
      cards: {
        activePermitsToday,
        newPermits,
        unackedShares,
        newReferrals,
        sentReferrals,
        receivedReferrals,
        inProgressReferrals,
        delayedReferrals: delayedReferrals.length,
        criticalReferrals,
        resolvedToday,
      },
      openReferrals,
      delayedReferrals,
      recentPermits: recentPermits.map((p) => this.serializePermit(p as never, actor)),
      recentReferrals,
      availablePersonnel,
    };
  }

  async getActivePersonnel() {
    const activeGroupId = await shiftRosterService.getActiveGroupId();
    if (!activeGroupId) return [];
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        groupId: activeGroupId,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
      },
      select: userBrief,
      orderBy: { fullName: 'asc' },
    });
  }

  async getCurrentShift() {
    return shiftRosterService.getOpsBoard();
  }

  // ─── Permits ───────────────────────────────────────────────────

  async listPermits(
    actor: AuthenticatedUser,
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: SecurityPermitStatus;
      permitType?: SecurityPermitType;
      importance?: PermitImportance;
      createdById?: string;
    },
  ) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.SecurityPermitWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.permitType ? { permitType: query.permitType } : {}),
      ...(query.importance ? { importance: query.importance } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(query.search
        ? {
            OR: [
              { permitNumber: { contains: query.search, mode: 'insensitive' } },
              { holderName: { contains: query.search, mode: 'insensitive' } },
              { vehiclePlate: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (actor.roleCode === RoleCodes.SECURITY_GUARD && !hasPerm(actor, PermissionCodes.PERMITS_CREATE)) {
      where.shares = { some: { sharedWithUserId: actor.id } };
    }

    const [total, rows] = await Promise.all([
      prisma.securityPermit.count({ where }),
      prisma.securityPermit.findMany({
        where,
        include: {
          createdBy: { select: userBrief },
          allowedZone: { select: { id: true, code: true, name: true } },
          shares: { take: 5, orderBy: { sentAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      rows: rows.map((r) => this.serializePermit(r as never, actor)),
      total,
      page,
      pageSize,
    };
  }

  async getPermit(actor: AuthenticatedUser, id: string) {
    const permit = await prisma.securityPermit.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: userBrief },
        allowedZone: true,
        shares: {
          orderBy: { sentAt: 'desc' },
          include: {
            sharedBy: { select: userBrief },
            sharedWithUser: { select: userBrief },
            sharedWithGroup: { select: { id: true, code: true, nameAr: true } },
          },
        },
      },
    });
    if (!permit) throw new NotFoundError('التصريح غير موجود');

    if (actor.roleCode === RoleCodes.SECURITY_GUARD && !hasPerm(actor, PermissionCodes.PERMITS_CREATE)) {
      const shared = permit.shares.some((s) => s.sharedWithUserId === actor.id);
      if (!shared) throw new ForbiddenError('لا تملك صلاحية عرض هذا التصريح');
    }

    return this.serializePermit(permit as never, actor);
  }

  async createPermit(
    actor: AuthenticatedUser,
    input: {
      permitType: SecurityPermitType;
      title: string;
      holderName: string;
      nationalId?: string | null;
      employeeNumber?: string | null;
      companyName?: string | null;
      vehiclePlate?: string | null;
      vehicleType?: string | null;
      hostName?: string | null;
      hostDepartment?: string | null;
      allowedZoneId?: string | null;
      allowedFloor?: string | null;
      validFrom: Date;
      validTo: Date;
      importance?: PermitImportance;
      notes?: string | null;
      attachment?: {
        originalFileName: string;
        mimeType: string;
        contentBase64: string;
      } | null;
    },
    meta: RequestMeta = {},
  ) {
    assertPermitDateRange(input.validFrom, input.validTo, hasPerm(actor, PermissionCodes.PERMITS_VIEW_SENSITIVE));

    if (input.permitType === SecurityPermitType.VEHICLE && !input.vehiclePlate?.trim()) {
      throw new ValidationError('رقم اللوحة مطلوب لتصريح المركبة');
    }
    if (input.permitType === SecurityPermitType.VISITOR && !input.holderName?.trim()) {
      throw new ValidationError('اسم صاحب التصريح مطلوب');
    }

    const permitNumber = await nextPermitNumber();
    let attachmentFields: Prisma.SecurityPermitCreateInput = {
      permitNumber,
      permitType: input.permitType,
      title: input.title,
      holderName: input.holderName,
      nationalId: input.nationalId ?? null,
      employeeNumber: input.employeeNumber ?? null,
      companyName: input.companyName ?? null,
      vehiclePlate: input.vehiclePlate ?? null,
      vehicleType: input.vehicleType ?? null,
      hostName: input.hostName ?? null,
      hostDepartment: input.hostDepartment ?? null,
      allowedFloor: input.allowedFloor ?? null,
      validFrom: input.validFrom,
      validTo: input.validTo,
      importance: input.importance ?? PermitImportance.NORMAL,
      notes: input.notes ?? null,
      status: SecurityPermitStatus.DRAFT,
      createdBy: { connect: { id: actor.id } },
      ...(input.allowedZoneId ? { allowedZone: { connect: { id: input.allowedZoneId } } } : {}),
    };

    const created = await prisma.securityPermit.create({ data: attachmentFields });

    if (input.attachment) {
      if (!uploadLimiter.tryAcquire(`permit-up:${actor.id}`)) {
        throw new ValidationError('محاولات رفع متكررة — انتظر قليلًا');
      }
      const saved = await saveCctvOperationFile({
        kind: 'permits',
        entityId: created.id,
        originalFileName: input.attachment.originalFileName,
        mimeType: input.attachment.mimeType,
        contentBase64: input.attachment.contentBase64,
      });
      await prisma.securityPermit.update({
        where: { id: created.id },
        data: {
          attachmentStoragePath: saved.storagePath,
          attachmentFileName: saved.originalFileName,
          attachmentMimeType: saved.mimeType,
          attachmentFileSize: saved.fileSize,
          attachmentUrl: `/api/v1/cctv-operations/permits/${created.id}/attachment`,
        },
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SecurityPermit',
      entityId: created.id,
      metadata: { permitNumber },
      meta,
    });
    broadcast('permit:created', { permitId: created.id, permitNumber });
    broadcast('cctv-operations:dashboard-refresh', { reason: 'permit:created' });

    return this.getPermit(actor, created.id);
  }

  async updatePermit(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<{
      title: string;
      holderName: string;
      notes: string | null;
      importance: PermitImportance;
      allowedZoneId: string | null;
      allowedFloor: string | null;
      validFrom: Date;
      validTo: Date;
      vehiclePlate: string | null;
      vehicleType: string | null;
      hostName: string | null;
      hostDepartment: string | null;
      nationalId: string | null;
      employeeNumber: string | null;
      companyName: string | null;
    }>,
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('التصريح غير موجود');
    if (existing.status !== SecurityPermitStatus.DRAFT && actor.roleCode === RoleCodes.CCTV_OPERATOR) {
      throw new ValidationError('يمكن تعديل التصريح قبل التفعيل فقط');
    }
    if (input.validFrom && input.validTo) {
      assertPermitDateRange(input.validFrom, input.validTo, hasPerm(actor, PermissionCodes.PERMITS_VIEW_SENSITIVE));
    }

    await prisma.securityPermit.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.holderName !== undefined ? { holderName: input.holderName } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.importance !== undefined ? { importance: input.importance } : {}),
        ...(input.allowedZoneId !== undefined ? { allowedZoneId: input.allowedZoneId } : {}),
        ...(input.allowedFloor !== undefined ? { allowedFloor: input.allowedFloor } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
        ...(input.validTo !== undefined ? { validTo: input.validTo } : {}),
        ...(input.vehiclePlate !== undefined ? { vehiclePlate: input.vehiclePlate } : {}),
        ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
        ...(input.hostName !== undefined ? { hostName: input.hostName } : {}),
        ...(input.hostDepartment !== undefined ? { hostDepartment: input.hostDepartment } : {}),
        ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
        ...(input.employeeNumber !== undefined ? { employeeNumber: input.employeeNumber } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      meta,
    });
    broadcast('permit:updated', { permitId: id });
    return this.getPermit(actor, id);
  }

  async activatePermit(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit) throw new NotFoundError('التصريح غير موجود');
    if (permit.status !== SecurityPermitStatus.DRAFT) {
      throw new ValidationError('يمكن تفعيل التصاريح المسودة فقط');
    }
    await prisma.securityPermit.update({
      where: { id },
      data: { status: SecurityPermitStatus.ACTIVE },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'activate' },
      meta,
    });
    broadcast('permit:updated', { permitId: id, status: 'ACTIVE' });
    return this.getPermit(actor, id);
  }

  async cancelPermit(actor: AuthenticatedUser, id: string, reason: string, meta: RequestMeta = {}) {
    if (!reason?.trim()) throw new ValidationError('سبب الإلغاء مطلوب');
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit) throw new NotFoundError('التصريح غير موجود');
    await prisma.securityPermit.update({
      where: { id },
      data: { status: SecurityPermitStatus.CANCELLED, cancelReason: reason.trim() },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'cancel' },
      meta,
    });
    broadcast('permit:updated', { permitId: id, status: 'CANCELLED' });
    return this.getPermit(actor, id);
  }

  async rejectPermit(actor: AuthenticatedUser, id: string, reason: string, meta: RequestMeta = {}) {
    if (!reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit) throw new NotFoundError('التصريح غير موجود');
    await prisma.securityPermit.update({
      where: { id },
      data: { status: SecurityPermitStatus.REJECTED, rejectReason: reason.trim() },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'reject' },
      meta,
    });
    broadcast('permit:updated', { permitId: id, status: 'REJECTED' });
    return this.getPermit(actor, id);
  }

  async markPermitUsed(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit) throw new NotFoundError('التصريح غير موجود');
    await prisma.securityPermit.update({
      where: { id },
      data: { status: SecurityPermitStatus.USED },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'mark-used' },
      meta,
    });
    broadcast('permit:updated', { permitId: id, status: 'USED' });
    return this.getPermit(actor, id);
  }

  async sharePermit(
    actor: AuthenticatedUser,
    id: string,
    input: {
      sharedWithUserId?: string | null;
      sharedWithGroupId?: string | null;
      sharedWithRole?: string | null;
      message?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    if (!sendLimiter.tryAcquire(`permit-share:${actor.id}`)) {
      throw new ValidationError('محاولات مشاركة متكررة — انتظر قليلًا');
    }
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit) throw new NotFoundError('التصريح غير موجود');
    if (!input.sharedWithUserId && !input.sharedWithGroupId && !input.sharedWithRole) {
      throw new ValidationError('حدد مستلمًا للمشاركة');
    }

    if (input.sharedWithUserId) {
      const user = await prisma.user.findFirst({
        where: { id: input.sharedWithUserId, deletedAt: null },
      });
      if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        throw new ValidationError('لا يمكن مشاركة التصريح مع مستخدم معطل');
      }
    }

    if (input.sharedWithGroupId) {
      const activeGroupId = await shiftRosterService.getActiveGroupId();
      if (activeGroupId && input.sharedWithGroupId !== activeGroupId) {
        const resting = await prisma.shiftGroup.findUnique({ where: { id: input.sharedWithGroupId } });
        if (resting) {
          // allow only if director — otherwise block resting groups
          if (actor.roleCode !== RoleCodes.SECURITY_DIRECTOR) {
            throw new ValidationError('لا تُرسل للمجموعة في الراحة — استخدم المجموعة العاملة');
          }
        }
      }
    }

    const share = await prisma.permitShare.create({
      data: {
        permitId: id,
        sharedById: actor.id,
        sharedWithUserId: input.sharedWithUserId ?? null,
        sharedWithGroupId: input.sharedWithGroupId ?? null,
        sharedWithRole: input.sharedWithRole ?? null,
        message: input.message ?? null,
        status: PermitShareStatus.SENT,
        deliveredAt: new Date(),
      },
    });

    if (permit.status === SecurityPermitStatus.DRAFT) {
      await prisma.securityPermit.update({
        where: { id },
        data: { status: SecurityPermitStatus.ACTIVE },
      });
    }

    const recipients: string[] = [];
    if (input.sharedWithUserId) recipients.push(input.sharedWithUserId);
    if (input.sharedWithGroupId) {
      const members = await prisma.user.findMany({
        where: {
          groupId: input.sharedWithGroupId,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
        select: { id: true },
      });
      recipients.push(...members.map((m) => m.id));
    }

    for (const userId of [...new Set(recipients)]) {
      await notificationService.create({
        userId,
        title: `مشاركة تصريح ${permit.permitNumber}`,
        body: `تم إرسال التصريح بواسطة مشغلة CCTV — ${permit.title}`,
        priority:
          permit.importance === PermitImportance.URGENT
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
        entityType: 'SecurityPermit',
        entityId: id,
        senderId: actor.id,
      });
      emitToUser(userId, 'permit:shared', { permitId: id, shareId: share.id });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'share', shareId: share.id },
      meta,
    });
    broadcast('permit:shared', { permitId: id, shareId: share.id });
    broadcast('cctv-operations:dashboard-refresh', { reason: 'permit:shared' });
    return share;
  }

  async listPermitShares(actor: AuthenticatedUser, permitId: string) {
    await this.getPermit(actor, permitId);
    return prisma.permitShare.findMany({
      where: { permitId },
      orderBy: { sentAt: 'desc' },
      include: {
        sharedBy: { select: userBrief },
        sharedWithUser: { select: userBrief },
        sharedWithGroup: { select: { id: true, code: true, nameAr: true } },
      },
    });
  }

  async acknowledgePermitShare(
    actor: AuthenticatedUser,
    permitId: string,
    mode: 'view' | 'acknowledge',
    meta: RequestMeta = {},
  ) {
    const actorUser = await prisma.user.findFirst({
      where: { id: actor.id, deletedAt: null },
      select: { id: true, groupId: true },
    });
    const share = await prisma.permitShare.findFirst({
      where: {
        permitId,
        OR: [
          { sharedWithUserId: actor.id },
          ...(actorUser?.groupId ? [{ sharedWithGroupId: actorUser.groupId }] : []),
        ],
      },
      orderBy: { sentAt: 'desc' },
    });
    if (!share) throw new NotFoundError('لا توجد مشاركة لهذا التصريح');

    const data: Prisma.PermitShareUpdateInput =
      mode === 'view'
        ? {
            viewedAt: share.viewedAt ?? new Date(),
            status:
              share.status === PermitShareStatus.ACKNOWLEDGED
                ? PermitShareStatus.ACKNOWLEDGED
                : PermitShareStatus.VIEWED,
          }
        : {
            viewedAt: share.viewedAt ?? new Date(),
            receivedAt: new Date(),
            status: PermitShareStatus.ACKNOWLEDGED,
          };

    const updated = await prisma.permitShare.update({ where: { id: share.id }, data });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PermitShare',
      entityId: share.id,
      metadata: { action: mode, permitId },
      meta,
    });
    broadcast(mode === 'view' ? 'permit:viewed' : 'permit:acknowledged', {
      permitId,
      shareId: share.id,
    });
    return updated;
  }

  async getPermitAttachment(actor: AuthenticatedUser, id: string) {
    if (!hasPerm(actor, PermissionCodes.PERMITS_DOWNLOAD_ATTACHMENT)) {
      throw new ForbiddenError('لا تملك صلاحية تنزيل المرفق');
    }
    const permit = await prisma.securityPermit.findFirst({ where: { id, deletedAt: null } });
    if (!permit?.attachmentStoragePath) throw new NotFoundError('لا يوجد مرفق');
    await this.getPermit(actor, id);
    const buffer = await readCctvOperationFile(permit.attachmentStoragePath);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.READ,
      entityType: 'SecurityPermit',
      entityId: id,
      metadata: { action: 'download-attachment' },
    });
    return {
      buffer,
      mimeType: permit.attachmentMimeType ?? 'application/octet-stream',
      fileName: permit.attachmentFileName ?? 'attachment',
    };
  }

  async permitStatistics(from?: Date, to?: Date) {
    const rangeTo = to ?? new Date();
    const rangeFrom = from ?? new Date(rangeTo.getTime() - 30 * 86_400_000);
    const where = { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } };
    const [byType, byStatus, total, shares] = await Promise.all([
      prisma.securityPermit.groupBy({ by: ['permitType'], where, _count: { _all: true } }),
      prisma.securityPermit.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.securityPermit.count({ where }),
      prisma.permitShare.findMany({
        where: { sentAt: { gte: rangeFrom, lte: rangeTo }, receivedAt: { not: null } },
        select: { sentAt: true, receivedAt: true },
      }),
    ]);
    const ackMinutes = shares
      .map((s) =>
        s.receivedAt ? (s.receivedAt.getTime() - s.sentAt.getTime()) / 60_000 : null,
      )
      .filter((n): n is number => n !== null);
    return {
      from: rangeFrom,
      to: rangeTo,
      total,
      byType: byType.map((r) => ({ permitType: r.permitType, count: r._count._all })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      averageAcknowledgeMinutes:
        ackMinutes.length > 0
          ? Math.round((ackMinutes.reduce((a, b) => a + b, 0) / ackMinutes.length) * 10) / 10
          : null,
    };
  }

  // ─── Referrals ─────────────────────────────────────────────────

  private referralVisibilityWhere(actor: AuthenticatedUser): Prisma.SecurityReferralWhereInput {
    if (
      actor.roleCode === RoleCodes.SECURITY_GUARD &&
      !hasPerm(actor, PermissionCodes.SECURITY_REFERRALS_ASSIGN)
    ) {
      return { assignedUserId: actor.id };
    }
    if (actor.roleCode === RoleCodes.CCTV_OPERATOR) {
      return {
        OR: [{ createdById: actor.id }, { status: { not: SecurityReferralStatus.NEW } }],
      };
    }
    return {};
  }

  async listReferrals(
    actor: AuthenticatedUser,
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: SecurityReferralStatus;
      severity?: SecurityReferralSeverity;
      referralType?: SecurityReferralType;
      assignedUserId?: string;
      createdById?: string;
      zoneId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const { page, pageSize, skip } = paginate(query);
    const where: Prisma.SecurityReferralWhereInput = {
      deletedAt: null,
      ...this.referralVisibilityWhere(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.referralType ? { referralType: query.referralType } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { referralNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.securityReferral.count({ where }),
      prisma.securityReferral.findMany({
        where,
        include: {
          createdBy: { select: userBrief },
          assignedUser: { select: userBrief },
          zone: { select: { id: true, code: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getReferral(actor: AuthenticatedUser, id: string) {
    const referral = await prisma.securityReferral.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: userBrief },
        assignedUser: { select: userBrief },
        assignedBy: { select: userBrief },
        assignedGroup: { select: { id: true, code: true, nameAr: true } },
        zone: true,
        checkpoint: { select: { id: true, code: true, name: true } },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        updates: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: userBrief } },
        },
        responses: {
          orderBy: { respondedAt: 'asc' },
          include: { responder: { select: userBrief } },
        },
      },
    });
    if (!referral) throw new NotFoundError('الإحالة غير موجودة');

    if (
      actor.roleCode === RoleCodes.SECURITY_GUARD &&
      !hasPerm(actor, PermissionCodes.SECURITY_REFERRALS_ASSIGN) &&
      referral.assignedUserId !== actor.id
    ) {
      throw new ForbiddenError('لا تملك صلاحية عرض هذه الإحالة');
    }

    return referral;
  }

  async updateReferral(
    actor: AuthenticatedUser,
    id: string,
    input: {
      title?: string;
      description?: string;
      referralType?: SecurityReferralType;
      severity?: SecurityReferralSeverity;
      zoneId?: string | null;
      checkpointId?: string | null;
      floorNumber?: number | null;
      cameraCode?: string | null;
      occurredAt?: Date;
      notes?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    if (!hasPerm(actor, PermissionCodes.SECURITY_REFERRALS_UPDATE)) {
      throw new ForbiddenError('لا تملك صلاحية تعديل الإحالة');
    }
    const referral = await this.getReferral(actor, id);
    if (referral.status !== SecurityReferralStatus.NEW) {
      throw new ValidationError('لا يمكن تعديل الإحالة بعد إرسالها');
    }
    if (
      actor.roleCode === RoleCodes.CCTV_OPERATOR &&
      referral.createdById !== actor.id
    ) {
      throw new ForbiddenError('يمكن لمشغلة CCTV تعديل إحالاتها فقط');
    }

    const updated = await prisma.securityReferral.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.referralType !== undefined ? { referralType: input.referralType } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
        ...(input.checkpointId !== undefined ? { checkpointId: input.checkpointId } : {}),
        ...(input.floorNumber !== undefined ? { floorNumber: input.floorNumber } : {}),
        ...(input.cameraCode !== undefined ? { cameraCode: input.cameraCode } : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await prisma.securityReferralUpdate.create({
      data: {
        referralId: id,
        userId: actor.id,
        updateType: ReferralUpdateType.NOTE_ADDED,
        message: 'تم تحديث بيانات الإحالة قبل الإرسال',
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'update' },
      meta,
    });
    broadcast('security-referral:updated', { referralId: id });
    return this.getReferral(actor, updated.id);
  }

  async createReferral(
    actor: AuthenticatedUser,
    input: {
      title: string;
      description: string;
      referralType: SecurityReferralType;
      severity?: SecurityReferralSeverity;
      zoneId?: string | null;
      checkpointId?: string | null;
      floorNumber?: number | null;
      cameraCode?: string | null;
      occurredAt?: Date;
      assignedUserId?: string | null;
      assignedGroupId?: string | null;
      notes?: string | null;
      sendImmediately?: boolean;
      sendToSupervisor?: boolean;
      attachments?: Array<{
        originalFileName: string;
        mimeType: string;
        contentBase64: string;
        attachmentType?: ReferralAttachmentType;
        description?: string | null;
      }>;
    },
    meta: RequestMeta = {},
  ) {
    const referralNumber = await nextReferralNumber();
    const severity = input.severity ?? SecurityReferralSeverity.MEDIUM;

    let assignedUserId = input.assignedUserId ?? null;
    let assignedGroupId = input.assignedGroupId ?? null;

    if (input.sendToSupervisor) {
      const activeGroupId = await shiftRosterService.getActiveGroupId();
      assignedGroupId = activeGroupId;
      const supervisor = activeGroupId
        ? await prisma.user.findFirst({
            where: {
              deletedAt: null,
              groupId: activeGroupId,
              role: { code: RoleCodes.SECURITY_SUPERVISOR },
              status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
            },
          })
        : null;
      if (supervisor) assignedUserId = supervisor.id;
    }

    if (assignedUserId) {
      const user = await prisma.user.findFirst({ where: { id: assignedUserId, deletedAt: null } });
      if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        throw new ValidationError('لا يمكن إسناد الإحالة لمستخدم معطل');
      }
    }

    const created = await prisma.securityReferral.create({
      data: {
        referralNumber,
        title: input.title,
        description: input.description,
        referralType: input.referralType,
        severity,
        status: SecurityReferralStatus.NEW,
        zoneId: input.zoneId ?? null,
        checkpointId: input.checkpointId ?? null,
        floorNumber: input.floorNumber ?? null,
        cameraCode: input.cameraCode ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        createdById: actor.id,
        assignedUserId,
        assignedGroupId,
        assignedById: assignedUserId ? actor.id : null,
        assignedAt: assignedUserId ? new Date() : null,
        notes: input.notes ?? null,
      },
    });

    await this.addTimeline(created.id, actor.id, ReferralUpdateType.CREATED, {
      message: 'تم إنشاء الإحالة بواسطة مشغلة CCTV',
      newStatus: SecurityReferralStatus.NEW,
    });

    for (const att of input.attachments ?? []) {
      if (!uploadLimiter.tryAcquire(`ref-up:${actor.id}`)) {
        throw new ValidationError('محاولات رفع متكررة — انتظر قليلًا');
      }
      const saved = await saveCctvOperationFile({
        kind: 'referrals',
        entityId: created.id,
        originalFileName: att.originalFileName,
        mimeType: att.mimeType,
        contentBase64: att.contentBase64,
      });
      const row = await prisma.securityReferralAttachment.create({
        data: {
          referralId: created.id,
          attachmentType: att.attachmentType ?? ReferralAttachmentType.IMAGE,
          fileName: saved.fileName,
          originalFileName: saved.originalFileName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          storagePath: saved.storagePath,
          uploadedById: actor.id,
          description: att.description ?? null,
        },
      });
      await this.addTimeline(created.id, actor.id, ReferralUpdateType.ATTACHMENT_ADDED, {
        message: 'تم رفع إثبات للحالة',
        attachmentId: row.id,
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SecurityReferral',
      entityId: created.id,
      metadata: { referralNumber },
      meta,
    });
    broadcast('security-referral:created', { referralId: created.id, referralNumber });

    if (input.sendImmediately || input.sendToSupervisor) {
      return this.sendReferral(actor, created.id, meta);
    }

    broadcast('cctv-operations:dashboard-refresh', { reason: 'security-referral:created' });
    return this.getReferral(actor, created.id);
  }

  async sendReferral(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    if (!sendLimiter.tryAcquire(`ref-send:${actor.id}`)) {
      throw new ValidationError('محاولات إرسال متكررة — انتظر قليلًا');
    }
    const referral = await prisma.securityReferral.findFirst({ where: { id, deletedAt: null } });
    if (!referral) throw new NotFoundError('الإحالة غير موجودة');
    assertReferralTransition(referral.status, SecurityReferralStatus.SENT);

    if (!referral.assignedUserId && !referral.assignedGroupId) {
      const activeGroupId = await shiftRosterService.getActiveGroupId();
      if (!activeGroupId) throw new ValidationError('لا توجد مجموعة عاملة حاليًا لإرسال الإحالة');
      await prisma.securityReferral.update({
        where: { id },
        data: { assignedGroupId: activeGroupId, assignedById: actor.id, assignedAt: new Date() },
      });
    }

    const updated = await prisma.securityReferral.update({
      where: { id },
      data: { status: SecurityReferralStatus.SENT },
    });

    await this.addTimeline(id, actor.id, ReferralUpdateType.SENT, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.SENT,
      message: 'تم إرسال الإحالة بواسطة مشغلة CCTV',
    });

    const recipients: string[] = [];
    const current = await prisma.securityReferral.findUnique({ where: { id } });
    if (current?.assignedUserId) recipients.push(current.assignedUserId);
    if (current?.assignedGroupId) {
      const members = await prisma.user.findMany({
        where: {
          groupId: current.assignedGroupId,
          deletedAt: null,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        },
        select: { id: true },
      });
      recipients.push(...members.map((m) => m.id));
    }

    for (const userId of [...new Set(recipients)]) {
      await notificationService.create({
        userId,
        title: `إحالة أمنية ${updated.referralNumber}`,
        body: `تم الإرسال بواسطة مشغلة CCTV — ${updated.title}`,
        priority:
          updated.severity === SecurityReferralSeverity.CRITICAL
            ? NotificationPriority.CRITICAL
            : updated.severity === SecurityReferralSeverity.HIGH
              ? NotificationPriority.HIGH
              : NotificationPriority.NORMAL,
        entityType: 'SecurityReferral',
        entityId: id,
        senderId: actor.id,
      });
      emitToUser(userId, 'security-referral:sent', { referralId: id });
    }

    if (updated.severity === SecurityReferralSeverity.CRITICAL) {
      await this.escalateReferral(
        actor,
        id,
        { reason: 'تصعيد فوري لإحالة حرجة', level: 1 },
        meta,
        true,
      );
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'send' },
      meta,
    });
    broadcast('security-referral:sent', { referralId: id });
    broadcast('cctv-operations:dashboard-refresh', { reason: 'security-referral:sent' });
    return this.getReferral(actor, id);
  }

  async assignReferral(
    actor: AuthenticatedUser,
    id: string,
    input: { assignedUserId: string; message?: string | null },
    meta: RequestMeta = {},
  ) {
    const referral = await prisma.securityReferral.findFirst({ where: { id, deletedAt: null } });
    if (!referral) throw new NotFoundError('الإحالة غير موجودة');

    const user = await prisma.user.findFirst({
      where: { id: input.assignedUserId, deletedAt: null },
      include: { group: true },
    });
    if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      throw new ValidationError('لا يمكن الإسناد لمستخدم معطل');
    }
    if (
      user.operationalStatus === OperationalStatus.OFF_DUTY ||
      user.operationalStatus === OperationalStatus.ON_BREAK
    ) {
      throw new ValidationError('لا يتم الإسناد التلقائي لشخص غير متاح');
    }

    const wasAssigned = Boolean(referral.assignedUserId);
    await prisma.securityReferral.update({
      where: { id },
      data: {
        assignedUserId: input.assignedUserId,
        assignedGroupId: user.groupId,
        assignedById: actor.id,
        assignedAt: new Date(),
        status:
          referral.status === SecurityReferralStatus.NEW
            ? SecurityReferralStatus.SENT
            : referral.status,
      },
    });

    await this.addTimeline(
      id,
      actor.id,
      wasAssigned ? ReferralUpdateType.REASSIGNED : ReferralUpdateType.ASSIGNED,
      {
        message: input.message ?? `تم الإسناد إلى ${user.fullName}`,
        oldStatus: referral.status,
        newStatus:
          referral.status === SecurityReferralStatus.NEW
            ? SecurityReferralStatus.SENT
            : referral.status,
      },
    );

    await notificationService.create({
      userId: input.assignedUserId,
      title: `إسناد إحالة ${referral.referralNumber}`,
      body: referral.title,
      priority: NotificationPriority.HIGH,
      entityType: 'SecurityReferral',
      entityId: id,
      senderId: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: wasAssigned ? 'reassign' : 'assign', assignedUserId: input.assignedUserId },
      meta,
    });
    broadcast('security-referral:assigned', { referralId: id, assignedUserId: input.assignedUserId });
    return this.getReferral(actor, id);
  }

  async receiveReferral(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const referral = await this.getReferral(actor, id);
    if (referral.assignedUserId && referral.assignedUserId !== actor.id) {
      throw new ForbiddenError('يمكن لرجل الأمن المسند إليه فقط استلام الحالة');
    }
    assertReferralTransition(referral.status, SecurityReferralStatus.RECEIVED);

    await prisma.securityReferral.update({
      where: { id },
      data: {
        status: SecurityReferralStatus.RECEIVED,
        receivedAt: new Date(),
        assignedUserId: referral.assignedUserId ?? actor.id,
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.RECEIVED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.RECEIVED,
    });
    await prisma.referralResponse.create({
      data: {
        referralId: id,
        responderId: actor.id,
        responseType: ReferralResponseType.ACKNOWLEDGEMENT,
        result: 'تم استلام الحالة',
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'receive' },
      meta,
    });
    broadcast('security-referral:received', { referralId: id });
    return this.getReferral(actor, id);
  }

  async startReferral(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const referral = await this.getReferral(actor, id);
    assertReferralTransition(referral.status, SecurityReferralStatus.IN_PROGRESS);
    await prisma.securityReferral.update({
      where: { id },
      data: { status: SecurityReferralStatus.IN_PROGRESS, startedAt: new Date() },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.STATUS_CHANGED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.IN_PROGRESS,
      message: 'بدء التحقق',
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'start' },
      meta,
    });
    broadcast('security-referral:started', { referralId: id });
    return this.getReferral(actor, id);
  }

  async arriveReferral(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const referral = await this.getReferral(actor, id);
    if (referral.status !== SecurityReferralStatus.IN_PROGRESS) {
      throw new ValidationError('يمكن تسجيل الوصول أثناء التحقق فقط');
    }
    await prisma.securityReferral.update({
      where: { id },
      data: { arrivedAt: new Date() },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.ARRIVED, {
      message: 'وصل رجل الأمن إلى الموقع',
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'arrive' },
      meta,
    });
    broadcast('security-referral:arrived', { referralId: id });
    return this.getReferral(actor, id);
  }

  async requestInfo(actor: AuthenticatedUser, id: string, message: string, meta: RequestMeta = {}) {
    if (!message?.trim()) throw new ValidationError('نص طلب المعلومات مطلوب');
    await this.getReferral(actor, id);
    await this.addTimeline(id, actor.id, ReferralUpdateType.NOTE_ADDED, {
      message: `طلب معلومات إضافية: ${message.trim()}`,
    });
    await prisma.referralResponse.create({
      data: {
        referralId: id,
        responderId: actor.id,
        responseType: ReferralResponseType.REQUEST_MORE_INFO,
        result: message.trim(),
      },
    });
    const referral = await prisma.securityReferral.findUnique({ where: { id } });
    if (referral?.createdById) {
      await notificationService.create({
        userId: referral.createdById,
        title: `طلب معلومات — ${referral.referralNumber}`,
        body: message.trim(),
        priority: NotificationPriority.NORMAL,
        entityType: 'SecurityReferral',
        entityId: id,
        senderId: actor.id,
      });
    }
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'request-info' },
      meta,
    });
    broadcast('security-referral:updated', { referralId: id });
    return this.getReferral(actor, id);
  }

  async resolveReferral(
    actor: AuthenticatedUser,
    id: string,
    input: {
      resolutionSummary: string;
      notes?: string | null;
      needsFollowUp?: boolean;
      attachment?: {
        originalFileName: string;
        mimeType: string;
        contentBase64: string;
      } | null;
    },
    meta: RequestMeta = {},
  ) {
    assertCctvCannotOverwriteResolution(String(actor.roleCode));
    const referral = await this.getReferral(actor, id);
    assertReferralTransition(referral.status, SecurityReferralStatus.RESOLVED);
    if (!input.resolutionSummary?.trim()) throw new ValidationError('ملخص النتيجة مطلوب');

    let attachmentUrl: string | null = null;
    if (input.attachment) {
      const saved = await saveCctvOperationFile({
        kind: 'referrals',
        entityId: id,
        originalFileName: input.attachment.originalFileName,
        mimeType: input.attachment.mimeType,
        contentBase64: input.attachment.contentBase64,
      });
      const row = await prisma.securityReferralAttachment.create({
        data: {
          referralId: id,
          attachmentType: ReferralAttachmentType.IMAGE,
          fileName: saved.fileName,
          originalFileName: saved.originalFileName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          storagePath: saved.storagePath,
          uploadedById: actor.id,
          description: 'صورة بعد المعالجة',
        },
      });
      attachmentUrl = `/api/v1/cctv-operations/referrals/${id}/attachments/${row.id}/preview`;
    }

    await prisma.securityReferral.update({
      where: { id },
      data: {
        status: SecurityReferralStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionSummary: input.resolutionSummary.trim(),
        notes: input.notes ?? referral.notes,
        needsFollowUp: input.needsFollowUp ?? false,
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.RESOLVED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.RESOLVED,
      message: input.resolutionSummary.trim(),
    });
    await prisma.referralResponse.create({
      data: {
        referralId: id,
        responderId: actor.id,
        responseType: ReferralResponseType.RESOLUTION,
        result: input.resolutionSummary.trim(),
        notes: input.notes ?? null,
        attachmentUrl,
      },
    });

    if (referral.createdById) {
      await notificationService.create({
        userId: referral.createdById,
        title: `تمت معالجة الإحالة ${referral.referralNumber}`,
        body: input.resolutionSummary.trim(),
        priority: NotificationPriority.NORMAL,
        entityType: 'SecurityReferral',
        entityId: id,
        senderId: actor.id,
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'resolve' },
      meta,
    });
    broadcast('security-referral:resolved', { referralId: id });
    return this.getReferral(actor, id);
  }

  async rejectReferral(actor: AuthenticatedUser, id: string, reason: string, meta: RequestMeta = {}) {
    if (!reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
    const referral = await this.getReferral(actor, id);
    assertReferralTransition(referral.status, SecurityReferralStatus.REJECTED);
    await prisma.securityReferral.update({
      where: { id },
      data: {
        status: SecurityReferralStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.REJECTED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.REJECTED,
      message: reason.trim(),
    });
    await prisma.referralResponse.create({
      data: {
        referralId: id,
        responderId: actor.id,
        responseType: ReferralResponseType.REJECTION,
        result: reason.trim(),
      },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'reject' },
      meta,
    });
    broadcast('security-referral:rejected', { referralId: id });
    return this.getReferral(actor, id);
  }

  async cancelReferral(actor: AuthenticatedUser, id: string, reason: string, meta: RequestMeta = {}) {
    if (!reason?.trim()) throw new ValidationError('سبب الإلغاء مطلوب');
    const referral = await this.getReferral(actor, id);
    if (
      actor.roleCode === RoleCodes.CCTV_OPERATOR &&
      !canCancelBeforeReceive(referral.status)
    ) {
      throw new ForbiddenError('يمكن لمشغلة المراقبة إلغاء الإحالة قبل استلامها فقط');
    }
    assertReferralTransition(referral.status, SecurityReferralStatus.CANCELLED);
    await prisma.securityReferral.update({
      where: { id },
      data: {
        status: SecurityReferralStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason.trim(),
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.CANCELLED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.CANCELLED,
      message: reason.trim(),
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'cancel' },
      meta,
    });
    broadcast('security-referral:updated', { referralId: id, status: 'CANCELLED' });
    return this.getReferral(actor, id);
  }

  async escalateReferral(
    actor: AuthenticatedUser,
    id: string,
    input: { reason: string; level?: number },
    meta: RequestMeta = {},
    skipTransitionCheck = false,
  ) {
    if (!input.reason?.trim()) throw new ValidationError('سبب التصعيد مطلوب');
    const referral = await prisma.securityReferral.findFirst({ where: { id, deletedAt: null } });
    if (!referral) throw new NotFoundError('الإحالة غير موجودة');
    if (!skipTransitionCheck) {
      assertReferralTransition(referral.status, SecurityReferralStatus.ESCALATED);
    }

    const level = input.level ?? referral.escalationLevel + 1;
    await prisma.securityReferral.update({
      where: { id },
      data: {
        status: SecurityReferralStatus.ESCALATED,
        escalationLevel: level,
        escalatedAt: new Date(),
        escalationReason: input.reason.trim(),
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.ESCALATED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.ESCALATED,
      message: input.reason.trim(),
    });

    const supervisors = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        role: {
          code: {
            in: [
              RoleCodes.SECURITY_SUPERVISOR,
              RoleCodes.OPERATIONS_MANAGER,
              RoleCodes.SECURITY_DIRECTOR,
            ],
          },
        },
      },
      select: { id: true, role: { select: { code: true } } },
    });

    for (const s of supervisors) {
      await notificationService.create({
        userId: s.id,
        title: `تصعيد إحالة ${referral.referralNumber}`,
        body: input.reason.trim(),
        priority: NotificationPriority.CRITICAL,
        entityType: 'SecurityReferral',
        entityId: id,
        senderId: actor.id,
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'escalate', level },
      meta,
    });
    broadcast('security-referral:escalated', { referralId: id, level });
    return this.getReferral(actor, id);
  }

  async closeReferral(actor: AuthenticatedUser, id: string, note: string | null, meta: RequestMeta = {}) {
    assertCctvCannotClose(String(actor.roleCode));
    const referral = await this.getReferral(actor, id);
    assertReferralTransition(referral.status, SecurityReferralStatus.CLOSED);
    await prisma.securityReferral.update({
      where: { id },
      data: { status: SecurityReferralStatus.CLOSED, closedAt: new Date() },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.CLOSED, {
      oldStatus: referral.status,
      newStatus: SecurityReferralStatus.CLOSED,
      message: note ?? 'تم إغلاق الحالة',
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'close' },
      meta,
    });
    broadcast('security-referral:closed', { referralId: id });
    return this.getReferral(actor, id);
  }

  async addNote(actor: AuthenticatedUser, id: string, message: string, meta: RequestMeta = {}) {
    if (!message?.trim()) throw new ValidationError('نص الملاحظة مطلوب');
    await this.getReferral(actor, id);
    await this.addTimeline(id, actor.id, ReferralUpdateType.NOTE_ADDED, {
      message: message.trim(),
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SecurityReferral',
      entityId: id,
      metadata: { action: 'note' },
      meta,
    });
    broadcast('security-referral:updated', { referralId: id });
    return this.getReferral(actor, id);
  }

  async addAttachment(
    actor: AuthenticatedUser,
    id: string,
    input: {
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
      attachmentType?: ReferralAttachmentType;
      description?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    await this.getReferral(actor, id);
    if (!uploadLimiter.tryAcquire(`ref-up:${actor.id}`)) {
      throw new ValidationError('محاولات رفع متكررة — انتظر قليلًا');
    }
    const saved = await saveCctvOperationFile({
      kind: 'referrals',
      entityId: id,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    });
    const row = await prisma.securityReferralAttachment.create({
      data: {
        referralId: id,
        attachmentType: input.attachmentType ?? ReferralAttachmentType.IMAGE,
        fileName: saved.fileName,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        storagePath: saved.storagePath,
        uploadedById: actor.id,
        description: input.description ?? null,
      },
    });
    await this.addTimeline(id, actor.id, ReferralUpdateType.ATTACHMENT_ADDED, {
      attachmentId: row.id,
      message: 'تم رفع مرفق',
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SecurityReferralAttachment',
      entityId: row.id,
      metadata: { referralId: id },
      meta,
    });
    broadcast('security-referral:updated', { referralId: id, attachmentId: row.id });
    return row;
  }

  async getTimeline(actor: AuthenticatedUser, id: string) {
    await this.getReferral(actor, id);
    return prisma.securityReferralUpdate.findMany({
      where: { referralId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: userBrief } },
    });
  }

  async getAttachments(actor: AuthenticatedUser, id: string) {
    await this.getReferral(actor, id);
    return prisma.securityReferralAttachment.findMany({
      where: { referralId: id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async readAttachment(
    actor: AuthenticatedUser,
    referralId: string,
    attachmentId: string,
    mode: 'preview' | 'download',
  ) {
    if (!hasPerm(actor, PermissionCodes.SECURITY_REFERRALS_DOWNLOAD_ATTACHMENT)) {
      throw new ForbiddenError('لا تملك صلاحية الوصول للمرفق');
    }
    await this.getReferral(actor, referralId);
    const att = await prisma.securityReferralAttachment.findFirst({
      where: { id: attachmentId, referralId, deletedAt: null },
    });
    if (!att) throw new NotFoundError('المرفق غير موجود');
    const buffer = await readCctvOperationFile(att.storagePath);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.READ,
      entityType: 'SecurityReferralAttachment',
      entityId: attachmentId,
      metadata: { mode, referralId },
    });
    return { buffer, mimeType: att.mimeType, fileName: att.originalFileName };
  }

  async referralStatistics(from?: Date, to?: Date) {
    const rangeTo = to ?? new Date();
    const rangeFrom = from ?? new Date(rangeTo.getTime() - 30 * 86_400_000);
    const where = { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } };
    const [byType, bySeverity, byStatus, total, closed, escalated, rows] = await Promise.all([
      prisma.securityReferral.groupBy({ by: ['referralType'], where, _count: { _all: true } }),
      prisma.securityReferral.groupBy({ by: ['severity'], where, _count: { _all: true } }),
      prisma.securityReferral.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.securityReferral.count({ where }),
      prisma.securityReferral.count({
        where: { ...where, status: SecurityReferralStatus.CLOSED },
      }),
      prisma.securityReferral.count({
        where: { ...where, escalationLevel: { gt: 0 } },
      }),
      prisma.securityReferral.findMany({
        where: {
          ...where,
          receivedAt: { not: null },
        },
        select: {
          assignedAt: true,
          receivedAt: true,
          startedAt: true,
          resolvedAt: true,
          zoneId: true,
          createdById: true,
          assignedUserId: true,
        },
      }),
    ]);

    const avg = (values: number[]) =>
      values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

    const receiveMins = rows
      .map((r) =>
        r.assignedAt && r.receivedAt
          ? (r.receivedAt.getTime() - r.assignedAt.getTime()) / 60_000
          : null,
      )
      .filter((n): n is number => n !== null);
    const startMins = rows
      .map((r) =>
        r.receivedAt && r.startedAt
          ? (r.startedAt.getTime() - r.receivedAt.getTime()) / 60_000
          : null,
      )
      .filter((n): n is number => n !== null);
    const resolveMins = rows
      .map((r) =>
        r.startedAt && r.resolvedAt
          ? (r.resolvedAt.getTime() - r.startedAt.getTime()) / 60_000
          : null,
      )
      .filter((n): n is number => n !== null);

    return {
      from: rangeFrom,
      to: rangeTo,
      total,
      byType: byType.map((r) => ({ referralType: r.referralType, count: r._count._all })),
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: r._count._all })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      closedRate: total > 0 ? Math.round((closed / total) * 1000) / 10 : null,
      escalatedRate: total > 0 ? Math.round((escalated / total) * 1000) / 10 : null,
      averageReceiveMinutes: avg(receiveMins),
      averageStartMinutes: avg(startMins),
      averageResolveMinutes: avg(resolveMins),
    };
  }

  /** Scan unreceived referrals and escalate per policy (callable from dashboard/job). */
  async processEscalations(actor: AuthenticatedUser) {
    const settings = await loadEscalationSettings();
    const candidates = await prisma.securityReferral.findMany({
      where: {
        deletedAt: null,
        status: SecurityReferralStatus.SENT,
      },
      take: 50,
    });
    const results = [];
    for (const r of candidates) {
      const sentAt = r.assignedAt ?? r.createdAt;
      const decision = shouldEscalateUnreceived({
        severity: r.severity,
        sentAt,
        settings,
      });
      if (decision.escalate) {
        results.push(
          await this.escalateReferral(
            actor,
            r.id,
            { reason: decision.reason },
            {},
            false,
          ),
        );
      }
    }
    return { processed: results.length };
  }
}

export const cctvOperationsService = new CctvOperationsService();
