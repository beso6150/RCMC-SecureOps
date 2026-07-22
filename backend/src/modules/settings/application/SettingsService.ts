import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { AuditAction } from '@prisma/client';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';

export interface CreateDepartmentInput {
  code: string;
  nameEn: string;
  nameAr: string;
  description?: string | null;
}

export interface UpdateDepartmentInput {
  code?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string | null;
}

export interface CreateShiftInput {
  code: string;
  nameEn: string;
  nameAr: string;
  startTime: string;
  endTime: string;
  timezone?: string;
}

export interface UpdateShiftInput {
  code?: string;
  nameEn?: string;
  nameAr?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
}

class DepartmentService {
  async list() {
    return prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  async create(actor: AuthenticatedUser, input: CreateDepartmentInput, meta: RequestMeta = {}) {
    try {
      const dept = await prisma.department.create({
        data: {
          code: input.code.trim().toUpperCase(),
          nameEn: input.nameEn.trim(),
          nameAr: input.nameAr.trim(),
          description: input.description ?? null,
        },
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'Department',
        entityId: dept.id,
        meta,
      });
      return dept;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Department code already exists');
      }
      throw err;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateDepartmentInput,
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Department not found');

    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Department',
      entityId: dept.id,
      meta,
    });
    return dept;
  }

  async softDelete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Department not found');

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Department',
      entityId: id,
      meta,
    });
  }
}

class ShiftService {
  async list() {
    return prisma.shift.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  async create(actor: AuthenticatedUser, input: CreateShiftInput, meta: RequestMeta = {}) {
    try {
      const shift = await prisma.shift.create({
        data: {
          code: input.code.trim().toUpperCase(),
          nameEn: input.nameEn.trim(),
          nameAr: input.nameAr.trim(),
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: input.timezone ?? 'Asia/Riyadh',
        },
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'Shift',
        entityId: shift.id,
        meta,
      });
      return shift;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Shift code already exists');
      }
      throw err;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateShiftInput,
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.shift.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Shift not found');

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr.trim() } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Shift',
      entityId: shift.id,
      meta,
    });
    return shift;
  }

  async softDelete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await prisma.shift.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Shift not found');

    await prisma.shift.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Shift',
      entityId: id,
      meta,
    });
  }
}

export const DEFAULT_SYSTEM_SETTINGS = [
  {
    key: 'sla.defaultHours',
    value: 8,
    description: 'Default SLA hours for incidents',
    isPublic: false,
  },
  {
    key: 'notifications.emailEnabled',
    value: true,
    description: 'Enable email notifications',
    isPublic: false,
  },
  {
    key: 'notifications.soundEnabled',
    value: true,
    description: 'Enable sound notifications in UI',
    isPublic: true,
  },
  {
    key: 'notifications.reminder_interval_minutes',
    value: 5,
    description: 'Default minutes before reminder for unacknowledged notifications',
    isPublic: false,
  },
  {
    key: 'notifications.escalation_interval_minutes',
    value: 15,
    description: 'Default minutes before escalation for unacknowledged notifications',
    isPublic: false,
  },
  {
    key: 'notifications.dedupe_window_minutes',
    value: 5,
    description: 'Deduplication window in minutes for notification keys',
    isPublic: false,
  },
  {
    key: 'notifications.push_enabled',
    value: false,
    description: 'WEB_PUSH / MOBILE_PUSH delivery (not configured — deliveries marked SKIPPED)',
    isPublic: false,
  },
  {
    key: 'reports.autoDaily',
    value: false,
    description: 'Automatically generate daily reports',
    isPublic: false,
  },
  {
    key: 'reports.retention_days',
    value: 365,
    description: 'Days to retain generated reports before archival cleanup',
    isPublic: false,
  },
  {
    key: 'reports.max_csv_rows',
    value: 10000,
    description: 'Maximum rows allowed in a CSV export',
    isPublic: false,
  },
  {
    key: 'reports.self_approve_allowed',
    value: false,
    description: 'Allow report authors to approve their own reports',
    isPublic: false,
  },
  {
    key: 'reports.response_ack_target_minutes',
    value: 5,
    description: 'Target minutes for incident acknowledgement',
    isPublic: false,
  },
  {
    key: 'reports.response_arrive_target_minutes',
    value: 15,
    description: 'Target minutes for on-scene arrival',
    isPublic: false,
  },
  {
    key: 'reports.response_resolve_target_minutes',
    value: 60,
    description: 'Target minutes for incident resolution',
    isPublic: false,
  },
  {
    key: 'field_ops.location_freshness_minutes',
    value: 15,
    description: 'Minutes before a personnel location is considered stale',
    isPublic: false,
  },
  {
    key: 'field_ops.location_retention_days',
    value: 7,
    description: 'Days to retain personnel location history',
    isPublic: false,
  },
  {
    key: 'field_ops.location_update_throttle_seconds',
    value: 30,
    description: 'Minimum seconds between location updates per user',
    isPublic: false,
  },
  {
    key: 'cctv_ops.escalate_receive_minutes',
    value: 5,
    description: 'Minutes before escalating unreceived referrals',
    isPublic: false,
  },
  {
    key: 'cctv_ops.escalate_high_receive_minutes',
    value: 3,
    description: 'Minutes before escalating unreceived HIGH referrals',
    isPublic: false,
  },
  {
    key: 'cctv_ops.escalate_start_minutes',
    value: 10,
    description: 'Minutes after receive before escalating if verification not started',
    isPublic: false,
  },
  {
    key: 'cctv_ops.critical_notify_director',
    value: true,
    description: 'Notify security director immediately for CRITICAL referrals',
    isPublic: false,
  },
  {
    key: 'visitors.emailInbox',
    value: {
      emailAddress: '',
      imapHost: '',
      imapPort: 993,
      username: '',
      password: '',
      useSslTls: true,
      enabled: false,
      pollIntervalMinutes: 5,
    },
    description:
      'IMAP mailbox settings for smart visit-request intake (configure any mailbox later)',
    isPublic: false,
  },
] as const;

class SystemSettingService {
  async list() {
    return prisma.systemSetting.findMany({
      where: { deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }

  async getByKey(key: string) {
    const setting = await prisma.systemSetting.findFirst({
      where: { key, deletedAt: null },
    });
    if (!setting) throw new NotFoundError('System setting not found');
    return setting;
  }

  async upsertMany(
    actor: AuthenticatedUser,
    settings: Array<{ key: string; value: unknown; description?: string; isPublic?: boolean }>,
    meta: RequestMeta = {},
  ) {
    const results = [];
    for (const s of settings) {
      const setting = await prisma.systemSetting.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          value: s.value as Prisma.InputJsonValue,
          description: s.description ?? null,
          isPublic: s.isPublic ?? false,
        },
        update: {
          value: s.value as Prisma.InputJsonValue,
          ...(s.description !== undefined ? { description: s.description } : {}),
          ...(s.isPublic !== undefined ? { isPublic: s.isPublic } : {}),
          deletedAt: null,
        },
      });
      results.push(setting);
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SystemSetting',
      entityId: null,
      metadata: { keys: settings.map((s) => s.key) },
      meta,
    });

    return results;
  }

  async upsertOne(
    actor: AuthenticatedUser,
    key: string,
    value: unknown,
    meta: RequestMeta = {},
  ) {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue, deletedAt: null },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SystemSetting',
      entityId: setting.id,
      metadata: { key },
      meta,
    });

    return setting;
  }
}

export const departmentService = new DepartmentService();
export const shiftService = new ShiftService();
export const systemSettingService = new SystemSettingService();
