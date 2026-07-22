import {
  IncidentSeverity,
  MobileDevicePlatform,
  MobileSyncStatus,
  ParkingLocationCode,
  PatrolSessionStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import {
  hashRequestPayload,
  idempotencyService,
} from '../../../shared/middleware/idempotency.js';
import type { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { taskService } from '../../tasks/application/TaskService.js';
import { incidentOpsService } from '../../incidents/application/IncidentOpsService.js';
import { cctvOperationsService } from '../../cctv-operations/application/CctvOperationsService.js';
import { fieldOperationsService } from '../../field-operations/application/FieldOperationsService.js';
import { violationService } from '../../violations/application/ViolationService.js';
import { internalMessageService } from '../../communications/application/InternalMessageService.js';
import { shiftRosterService } from '../../shifts/application/ShiftRosterService.js';
import {
  assertBatchPermission,
  buildIdempotencyReplay,
  canBootstrap,
  extractServerEntityId,
  mapErrorToSyncStatus,
  parseOfflineAllowlist,
  type MobileOperationType,
} from './mobileHelpers.js';
import {
  DEFAULT_OFFLINE_OPS_ALLOWLIST,
  DEFAULT_SOS_TYPES,
  MOBILE_SETTING_KEYS,
  MOBILE_SYSTEM_SETTINGS,
} from './mobileSettings.js';

export interface SyncBatchOperationInput {
  idempotencyKey: string;
  operationType: string;
  entityType: string;
  localEntityId?: string | null;
  payload: Record<string, unknown>;
  clientCreatedAt?: string | Date | null;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function hasPerm(user: AuthenticatedUser, code: string): boolean {
  return user.permissions.includes(code);
}

export class MobileService {
  async loadMobileConfig() {
    const keys = Object.values(MOBILE_SETTING_KEYS);
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: keys }, deletedAt: null },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));

    const get = (key: string, fallback: unknown) =>
      byKey.has(key) ? byKey.get(key) : fallback;

    return {
      minAppVersion: String(get(MOBILE_SETTING_KEYS.MIN_APP_VERSION, '1.0.0')),
      supportedAppVersion: String(get(MOBILE_SETTING_KEYS.SUPPORTED_APP_VERSION, '1.0.0')),
      maxImageMb: Number(get(MOBILE_SETTING_KEYS.MAX_IMAGE_MB, 15)),
      maxDocumentMb: Number(get(MOBILE_SETTING_KEYS.MAX_DOCUMENT_MB, 25)),
      offlineOpsAllowlist: parseOfflineAllowlist(
        get(MOBILE_SETTING_KEYS.OFFLINE_OPS_ALLOWLIST, [...DEFAULT_OFFLINE_OPS_ALLOWLIST]),
      ),
      syncIntervalSeconds: Number(get(MOBILE_SETTING_KEYS.SYNC_INTERVAL_SECONDS, 180)),
      qrRequireServerVerify: Boolean(get(MOBILE_SETTING_KEYS.QR_REQUIRE_SERVER_VERIFY, true)),
      locationRequiredForSos: Boolean(get(MOBILE_SETTING_KEYS.LOCATION_REQUIRED_FOR_SOS, false)),
      sosTypes: get(MOBILE_SETTING_KEYS.SOS_TYPES, [...DEFAULT_SOS_TYPES]),
      quietHours: {
        enabled: Boolean(get(MOBILE_SETTING_KEYS.QUIET_HOURS_ENABLED, false)),
        start: String(get(MOBILE_SETTING_KEYS.QUIET_HOURS_START, '22:00')),
        end: String(get(MOBILE_SETTING_KEYS.QUIET_HOURS_END, '06:00')),
      },
      timezone: String(get(MOBILE_SETTING_KEYS.TIMEZONE, 'Asia/Riyadh')),
      // Explicit: push is not claimed / not configured
      pushConfigured: false,
      webPushConfigured: false,
    };
  }

  async bootstrap(user: AuthenticatedUser) {
    if (!canBootstrap(user.permissions)) {
      throw new ForbiddenError('لا تملك صلاحية تهيئة تطبيق الجوال');
    }

    const [config, shiftOverview, lastSync, dbUser] = await Promise.all([
      this.loadMobileConfig(),
      shiftRosterService.getOverview().catch(() => null),
      prisma.mobileSyncOperation.findFirst({
        where: { userId: user.id, status: MobileSyncStatus.COMPLETED },
        orderBy: { processedAt: 'desc' },
        select: { processedAt: true },
      }),
      prisma.user.findFirst({
        where: { id: user.id, deletedAt: null },
        select: {
          groupId: true,
          shiftId: true,
          group: { select: { id: true, code: true, nameAr: true } },
          shift: { select: { id: true, nameAr: true, nameEn: true } },
        },
      }),
    ]);

    const activeShift =
      shiftOverview && 'morning' in shiftOverview
        ? {
            morning: shiftOverview.morning,
            evening: shiftOverview.evening,
            cycle: {
              activeKind: shiftOverview.activeKind ?? null,
              activeKindLabel: shiftOverview.activeKindLabel ?? null,
              currentCycleDay: shiftOverview.currentCycleDay ?? null,
            },
            timezone: 'Asia/Riyadh',
            labelAr: 'الوردية الحالية',
          }
        : null;

    const mobilePermissions = user.permissions.filter((p) => p.startsWith('mobile:'));

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        employeeNumber: user.employeeNumber,
        email: user.email,
        roleCode: user.roleCode,
        groupId: dbUser?.groupId ?? null,
        shiftId: dbUser?.shiftId ?? user.shiftId ?? null,
      },
      roleCode: user.roleCode,
      permissions: mobilePermissions,
      group: dbUser?.group ?? null,
      currentShift: activeShift,
      mobileConfig: {
        minAppVersion: config.minAppVersion,
        supportedAppVersion: config.supportedAppVersion,
        syncIntervalSeconds: config.syncIntervalSeconds,
        maxImageMb: config.maxImageMb,
        maxDocumentMb: config.maxDocumentMb,
        qrRequireServerVerify: config.qrRequireServerVerify,
        locationRequiredForSos: config.locationRequiredForSos,
        timezone: config.timezone,
        pushConfigured: false,
      },
      syncCursor: (lastSync?.processedAt ?? new Date()).toISOString(),
      parkingLocations: Object.values(ParkingLocationCode),
      incidentSeverities: Object.values(IncidentSeverity),
      dashboards: {
        guard: hasPerm(user, PermissionCodes.MOBILE_DASHBOARD_GUARD),
        supervisor: hasPerm(user, PermissionCodes.MOBILE_DASHBOARD_SUPERVISOR),
        cctv: hasPerm(user, PermissionCodes.MOBILE_DASHBOARD_CCTV),
        operations: hasPerm(user, PermissionCodes.MOBILE_DASHBOARD_OPERATIONS),
      },
    };
  }

  async getConfig(user: AuthenticatedUser) {
    if (!hasPerm(user, PermissionCodes.MOBILE_APP_ACCESS) && !hasPerm(user, PermissionCodes.MOBILE_BOOTSTRAP)) {
      throw new ForbiddenError('لا تملك صلاحية إعدادات الجوال');
    }
    return this.loadMobileConfig();
  }

  async syncPull(
    user: AuthenticatedUser,
    query: {
      updatedSince?: Date;
      cursor?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    if (!hasPerm(user, PermissionCodes.MOBILE_SYNC)) {
      throw new ForbiddenError('لا تملك صلاحية مزامنة الجوال');
    }

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const updatedSince = query.updatedSince ?? (query.cursor ? new Date(query.cursor) : undefined);
    const sinceFilter = updatedSince ? { gte: updatedSince } : undefined;

    const tasks =
      hasPerm(user, PermissionCodes.MOBILE_TASKS_VIEW) || hasPerm(user, PermissionCodes.TASKS_READ)
        ? await prisma.task.findMany({
            where: {
              assigneeId: user.id,
              deletedAt: null,
              ...(sinceFilter ? { updatedAt: sinceFilter } : {}),
            },
            orderBy: { updatedAt: 'asc' },
            take: pageSize,
            skip: (page - 1) * pageSize,
          })
        : [];

    const incidents =
      hasPerm(user, PermissionCodes.MOBILE_INCIDENTS_VIEW) ||
      hasPerm(user, PermissionCodes.INCIDENTS_VIEW_ASSIGNED) ||
      hasPerm(user, PermissionCodes.INCIDENTS_READ)
        ? await prisma.incident.findMany({
            where: {
              deletedAt: null,
              OR: [{ assigneeId: user.id }, { reporterId: user.id }],
              ...(sinceFilter ? { updatedAt: sinceFilter } : {}),
            },
            orderBy: { updatedAt: 'asc' },
            take: pageSize,
          })
        : [];

    const referrals =
      hasPerm(user, PermissionCodes.MOBILE_REFERRALS_VIEW) ||
      hasPerm(user, PermissionCodes.SECURITY_REFERRALS_VIEW)
        ? await prisma.securityReferral.findMany({
            where: {
              deletedAt: null,
              OR: [{ assignedUserId: user.id }, { createdById: user.id }],
              ...(sinceFilter ? { updatedAt: sinceFilter } : {}),
            },
            orderBy: { updatedAt: 'asc' },
            take: pageSize,
          })
        : [];

    const permits =
      hasPerm(user, PermissionCodes.MOBILE_PERMITS_VIEW) || hasPerm(user, PermissionCodes.PERMITS_VIEW)
        ? await prisma.permitShare.findMany({
            where: {
              sharedWithUserId: user.id,
              ...(sinceFilter ? { sentAt: sinceFilter } : {}),
            },
            include: {
              permit: {
                select: {
                  id: true,
                  permitNumber: true,
                  status: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: { sentAt: 'asc' },
            take: pageSize,
          })
        : [];

    const notifications =
      hasPerm(user, PermissionCodes.NOTIFICATIONS_READ)
        ? await prisma.notification.findMany({
            where: {
              userId: user.id,
              ...(sinceFilter ? { createdAt: sinceFilter } : {}),
            },
            orderBy: { createdAt: 'asc' },
            take: pageSize,
          })
        : [];

    const patrolSessions =
      hasPerm(user, PermissionCodes.MOBILE_PATROLS_VIEW) ||
      hasPerm(user, PermissionCodes.PATROL_SESSIONS_VIEW)
        ? await prisma.patrolSession.findMany({
            where: {
              assignedUserId: user.id,
              status: { in: [PatrolSessionStatus.IN_PROGRESS, PatrolSessionStatus.LATE, PatrolSessionStatus.ASSIGNED] },
              ...(sinceFilter ? { updatedAt: sinceFilter } : {}),
            },
            orderBy: { updatedAt: 'asc' },
            take: pageSize,
          })
        : [];

    const syncCursor = new Date().toISOString();

    return {
      syncCursor,
      page,
      pageSize,
      updatedSince: updatedSince?.toISOString() ?? null,
      data: {
        tasks,
        incidents,
        referrals,
        permits,
        notifications,
        patrolSessions,
      },
    };
  }

  async syncBatch(
    user: AuthenticatedUser,
    input: { deviceUuid?: string | null; operations: SyncBatchOperationInput[] },
    meta: RequestMeta = {},
  ) {
    if (!hasPerm(user, PermissionCodes.MOBILE_SYNC) && !hasPerm(user, PermissionCodes.MOBILE_OFFLINE_OPERATIONS)) {
      throw new ForbiddenError('لا تملك صلاحية دفع عمليات المزامنة');
    }

    const config = await this.loadMobileConfig();
    const allowlist = new Set(config.offlineOpsAllowlist);

    let deviceId: string | null = null;
    if (input.deviceUuid) {
      const device = await prisma.userMobileDevice.findUnique({
        where: {
          userId_deviceUuid: { userId: user.id, deviceUuid: input.deviceUuid },
        },
      });
      if (device?.isActive) {
        deviceId = device.id;
        await prisma.userMobileDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        });
      }
    }

    const results = [];
    for (const op of input.operations) {
      results.push(await this.processBatchOperation(user, op, { deviceId, allowlist, meta }));
    }
    return { results };
  }

  private async processBatchOperation(
    user: AuthenticatedUser,
    op: SyncBatchOperationInput,
    ctx: { deviceId: string | null; allowlist: Set<string>; meta: RequestMeta },
  ) {
    const base = {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      entityType: op.entityType,
      localEntityId: op.localEntityId ?? null,
    };

    // 1. Idempotency replay
    const existing = await idempotencyService.findByKey(user.id, op.idempotencyKey);
    if (existing) {
      const replay = buildIdempotencyReplay({
        ...existing,
        idempotencyKey: op.idempotencyKey,
        operationType: op.operationType,
      });
      if (replay) {
        return {
          ...base,
          status: MobileSyncStatus.COMPLETED,
          replayed: true,
          serverEntityId: replay.serverEntityId,
          summary: replay.summary,
        };
      }
      if (
        existing.status === MobileSyncStatus.PROCESSING ||
        existing.status === MobileSyncStatus.RECEIVED
      ) {
        return {
          ...base,
          status: MobileSyncStatus.CONFLICT,
          replayed: false,
          failureReason: 'عملية المزامنة قيد المعالجة — يُرجى الانتظار',
        };
      }
    }

    // 2. Allowlist
    if (!ctx.allowlist.has(op.operationType)) {
      const record = await this.ensureOpRecord(user.id, op, ctx.deviceId);
      await idempotencyService.fail(record.id, MobileSyncStatus.REJECTED, 'العملية غير مسموحة دون اتصال');
      return {
        ...base,
        status: MobileSyncStatus.REJECTED,
        failureReason: 'العملية غير مسموحة دون اتصال',
      };
    }

    // 3. RBAC — REJECTED (do not escalate via batch)
    const authz = assertBatchPermission(user.permissions, op.operationType);
    if (!authz.allowed) {
      const record = await this.ensureOpRecord(user.id, op, ctx.deviceId);
      await idempotencyService.fail(record.id, MobileSyncStatus.REJECTED, authz.reason);
      return {
        ...base,
        status: MobileSyncStatus.REJECTED,
        failureReason: authz.reason,
      };
    }

    const started = await idempotencyService.beginOrReplay({
      userId: user.id,
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      entityType: op.entityType,
      localEntityId: op.localEntityId,
      deviceId: ctx.deviceId,
      requestHash: hashRequestPayload({ type: op.operationType, local: op.localEntityId }),
      clientCreatedAt: op.clientCreatedAt ? new Date(op.clientCreatedAt) : null,
    });

    if (started.replay) {
      return {
        ...base,
        status: MobileSyncStatus.COMPLETED,
        replayed: true,
        summary: started.body,
        serverEntityId:
          typeof started.body === 'object' &&
          started.body &&
          'serverEntityId' in (started.body as object)
            ? String((started.body as { serverEntityId?: unknown }).serverEntityId ?? '')
            : null,
      };
    }

    try {
      const result = await this.dispatchOperation(user, op, ctx.meta);
      const serverEntityId = extractServerEntityId(result);
      const summary = {
        success: true,
        status: MobileSyncStatus.COMPLETED,
        operationType: op.operationType,
        serverEntityId,
        localEntityId: op.localEntityId ?? null,
      };
      await idempotencyService.complete(started.recordId, summary, { serverEntityId });
      return {
        ...base,
        status: MobileSyncStatus.COMPLETED,
        replayed: false,
        serverEntityId,
        summary,
      };
    } catch (err) {
      const mapped = mapErrorToSyncStatus(err);
      await idempotencyService.fail(started.recordId, mapped.status, mapped.reason);
      return {
        ...base,
        status: mapped.status,
        replayed: false,
        failureReason: mapped.reason,
      };
    }
  }

  private async ensureOpRecord(
    userId: string,
    op: SyncBatchOperationInput,
    deviceId: string | null,
  ) {
    const existing = await idempotencyService.findByKey(userId, op.idempotencyKey);
    if (existing) return existing;
    return prisma.mobileSyncOperation.create({
      data: {
        userId,
        deviceId,
        idempotencyKey: op.idempotencyKey,
        operationType: op.operationType,
        entityType: op.entityType,
        localEntityId: op.localEntityId ?? null,
        status: MobileSyncStatus.RECEIVED,
        requestHash: hashRequestPayload({ type: op.operationType }),
        clientCreatedAt: op.clientCreatedAt ? new Date(op.clientCreatedAt) : null,
      },
    });
  }

  private async dispatchOperation(
    user: AuthenticatedUser,
    op: SyncBatchOperationInput,
    meta: RequestMeta,
  ): Promise<unknown> {
    const payload = op.payload ?? {};
    const entityId =
      asString(payload.entityId) ??
      asString(payload.id) ??
      asString(op.localEntityId) ??
      asString(payload.serverEntityId);

    switch (op.operationType as MobileOperationType) {
      case 'TASK_ACCEPT': {
        if (!entityId) throw new ValidationError('معرّف المهمة مطلوب');
        return taskService.accept(user, entityId, meta);
      }
      case 'TASK_START': {
        if (!entityId) throw new ValidationError('معرّف المهمة مطلوب');
        return taskService.start(user, entityId, meta);
      }
      case 'TASK_WAIT': {
        if (!entityId) throw new ValidationError('معرّف المهمة مطلوب');
        return taskService.wait(user, entityId, asString(payload.note), meta);
      }
      case 'TASK_COMPLETE': {
        if (!entityId) throw new ValidationError('معرّف المهمة مطلوب');
        return taskService.complete(
          user,
          entityId,
          { completionNotes: asString(payload.completionNotes) ?? null },
          meta,
        );
      }
      case 'TASK_REJECT': {
        if (!entityId) throw new ValidationError('معرّف المهمة مطلوب');
        const reason = asString(payload.reason) ?? asString(payload.rejectionReason);
        if (!reason) throw new ValidationError('سبب الرفض مطلوب');
        return taskService.reject(user, entityId, reason, meta);
      }
      case 'INCIDENT_ACK': {
        if (!entityId) throw new ValidationError('معرّف البلاغ مطلوب');
        return incidentOpsService.acknowledge(user, entityId, meta);
      }
      case 'INCIDENT_ARRIVE': {
        if (!entityId) throw new ValidationError('معرّف البلاغ مطلوب');
        return incidentOpsService.arrive(user, entityId, meta);
      }
      case 'INCIDENT_NOTE': {
        if (!entityId) throw new ValidationError('معرّف البلاغ مطلوب');
        const content =
          asString(payload.content) ?? asString(payload.body) ?? asString(payload.note) ?? asString(payload.message);
        if (!content) throw new ValidationError('نص الملاحظة مطلوب');
        return incidentOpsService.addNote(
          user,
          entityId,
          { content },
          meta,
        );
      }
      case 'REFERRAL_RECEIVE': {
        if (!entityId) throw new ValidationError('معرّف الإحالة مطلوب');
        return cctvOperationsService.receiveReferral(user, entityId, meta);
      }
      case 'REFERRAL_START': {
        if (!entityId) throw new ValidationError('معرّف الإحالة مطلوب');
        return cctvOperationsService.startReferral(user, entityId, meta);
      }
      case 'REFERRAL_ARRIVE': {
        if (!entityId) throw new ValidationError('معرّف الإحالة مطلوب');
        return cctvOperationsService.arriveReferral(user, entityId, meta);
      }
      case 'PERMIT_ACKNOWLEDGE': {
        if (!entityId) throw new ValidationError('معرّف التصريح مطلوب');
        return cctvOperationsService.acknowledgePermitShare(user, entityId, 'acknowledge', meta);
      }
      case 'CHECKPOINT_VISIT': {
        const sessionId = asString(payload.sessionId) ?? asString(payload.patrolSessionId);
        const checkpointId = asString(payload.checkpointId);
        if (!sessionId || !checkpointId) {
          throw new ValidationError('معرّف الجولة ونقطة التفتيش مطلوبان');
        }
        return fieldOperationsService.visitCheckpoint(user, sessionId, checkpointId, {
          verificationMethod: payload.verificationMethod as never,
          qrCodeValue: asString(payload.qrCodeValue),
          mapX: typeof payload.mapX === 'number' ? payload.mapX : undefined,
          mapY: typeof payload.mapY === 'number' ? payload.mapY : undefined,
          notes: asString(payload.notes),
          attachmentUrl: asString(payload.attachmentUrl),
          status: payload.status as never,
          clientSyncId: asString(payload.clientSyncId) ?? op.idempotencyKey,
        }, meta);
      }
      case 'VIOLATION_CREATE': {
        return violationService.create(
          user,
          {
            plateNumber: asString(payload.plateNumber) ?? '',
            violationType: payload.violationType as never,
            parkingCode: payload.parkingCode as never,
            ocrResult: asString(payload.ocrResult),
            ocrConfidence:
              typeof payload.ocrConfidence === 'number' ? payload.ocrConfidence : undefined,
            arabicPlate: asString(payload.arabicPlate),
            englishPlate: asString(payload.englishPlate),
            vehicleColor: asString(payload.vehicleColor),
            gpsLatitude: typeof payload.gpsLatitude === 'number' ? payload.gpsLatitude : undefined,
            gpsLongitude:
              typeof payload.gpsLongitude === 'number' ? payload.gpsLongitude : undefined,
            imagePath: asString(payload.imagePath),
            notes: asString(payload.notes),
            clientSyncId: asString(payload.clientSyncId) ?? op.idempotencyKey,
            detectedAt: payload.detectedAt ? new Date(String(payload.detectedAt)) : undefined,
            attachments: payload.attachments as never,
          },
          meta,
        );
      }
      case 'MESSAGE_SEND': {
        const conversationId = asString(payload.conversationId);
        if (!conversationId) throw new ValidationError('معرّف المحادثة مطلوب');
        return internalMessageService.send(user, conversationId, {
          content: asString(payload.content),
          messageType: payload.messageType as never,
          replyToMessageId: asString(payload.replyToMessageId),
        });
      }
      case 'SOS_CREATE': {
        // Offline batch must still hit the server — never fake success
        return fieldOperationsService.createSos(
          user,
          {
            description: asString(payload.description),
            zoneId: asString(payload.zoneId),
            mapX: typeof payload.mapX === 'number' ? payload.mapX : undefined,
            mapY: typeof payload.mapY === 'number' ? payload.mapY : undefined,
          },
          meta,
        );
      }
      default:
        throw new ValidationError(`نوع العملية غير مدعوم: ${op.operationType}`);
    }
  }

  async registerDevice(
    user: AuthenticatedUser,
    input: {
      deviceUuid: string;
      platform: MobileDevicePlatform;
      appVersion: string;
      deviceNameMasked?: string | null;
      pushCapability?: boolean;
    },
  ) {
    if (!hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_SELF) && !hasPerm(user, PermissionCodes.MOBILE_APP_ACCESS)) {
      throw new ForbiddenError('لا تملك صلاحية تسجيل الجهاز');
    }

    const now = new Date();
    // pushCapability may be stored true only if explicitly requested — never claim push works
    const pushCapability = input.pushCapability === true;

    return prisma.userMobileDevice.upsert({
      where: {
        userId_deviceUuid: { userId: user.id, deviceUuid: input.deviceUuid },
      },
      create: {
        userId: user.id,
        deviceUuid: input.deviceUuid,
        platform: input.platform,
        appVersion: input.appVersion,
        deviceNameMasked: input.deviceNameMasked ?? null,
        lastLoginAt: now,
        lastSeenAt: now,
        isActive: true,
        pushCapability,
      },
      update: {
        platform: input.platform,
        appVersion: input.appVersion,
        deviceNameMasked: input.deviceNameMasked ?? undefined,
        lastLoginAt: now,
        lastSeenAt: now,
        isActive: true,
        pushCapability,
      },
    });
  }

  async unregisterDevice(user: AuthenticatedUser, deviceUuid: string) {
    if (!hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_SELF)) {
      throw new ForbiddenError('لا تملك صلاحية إلغاء تسجيل الجهاز');
    }
    const device = await prisma.userMobileDevice.findUnique({
      where: { userId_deviceUuid: { userId: user.id, deviceUuid } },
    });
    if (!device) throw new NotFoundError('الجهاز غير موجود');
    return prisma.userMobileDevice.update({
      where: { id: device.id },
      data: { isActive: false, lastSeenAt: new Date(), pushCapability: false },
    });
  }

  async listMyDevices(user: AuthenticatedUser) {
    if (!hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_SELF) && !hasPerm(user, PermissionCodes.MOBILE_APP_ACCESS)) {
      throw new ForbiddenError('لا تملك صلاحية عرض الأجهزة');
    }
    return prisma.userMobileDevice.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async listAllDevices(user: AuthenticatedUser, query: { page?: number; pageSize?: number }) {
    if (!hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_ALL)) {
      throw new ForbiddenError('لا تملك صلاحية إدارة جميع الأجهزة');
    }
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const [data, total] = await Promise.all([
      prisma.userMobileDevice.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              employeeNumber: true,
              email: true,
            },
          },
        },
      }),
      prisma.userMobileDevice.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
  }

  async disableDevice(user: AuthenticatedUser, deviceId: string) {
    const device = await prisma.userMobileDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundError('الجهاز غير موجود');

    const canAll = hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_ALL);
    const canSelf =
      hasPerm(user, PermissionCodes.MOBILE_DEVICES_MANAGE_SELF) && device.userId === user.id;

    if (!canAll && !canSelf) {
      throw new ForbiddenError('لا تملك صلاحية تعطيل هذا الجهاز');
    }

    return prisma.userMobileDevice.update({
      where: { id: deviceId },
      data: { isActive: false, pushCapability: false, lastSeenAt: new Date() },
    });
  }
}

export const mobileService = new MobileService();

/** Exported for seed consumers */
export { MOBILE_SYSTEM_SETTINGS };
